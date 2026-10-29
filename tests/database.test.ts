import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let db: PGlite
const migrationDir = new URL('../supabase/migrations/', import.meta.url)
const migrations = readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort().map((name) => readFileSync(new URL(name, migrationDir), 'utf8'))
const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const assignments = [
  { giver_id: a, recipient_id: b, token_hash: 'a'.repeat(64) },
  { giver_id: b, recipient_id: a, token_hash: 'b'.repeat(64) },
]

beforeAll(async () => {
  db = new PGlite()
  // Infraestrutura normalmente fornecida pelo Supabase.
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users (id uuid primary key);')
  for (const migration of migrations) await db.exec(migration)
})

beforeEach(async () => {
  await db.exec("reset role; truncate public.assignments, public.participants; update public.christmas_event set drawn_at = null, registration_open = true;")
})

afterAll(async () => { await db?.close() })

async function seed() {
  await db.query("insert into public.participants(id, name, email, wishlist) values ($1, 'Ana', 'ana@example.com', 'Livros'), ($2, 'Bia', 'bia@example.com', 'Chocolate')", [a, b])
}

describe('migração e transações PostgreSQL', () => {
  it('aceita o mesmo WhatsApp em cadastros independentes, inclusive nomes iguais', async () => {
    await db.query("select public.register_participant_whatsapp('Ana', '5511999991111', 'Livros')")
    await db.query("select public.register_participant_whatsapp('Bia', '5511999991111', 'Chocolate')")
    await db.query("select public.register_participant_whatsapp('Ana', '5511999991111', 'Outra pessoa')")
    const result = await db.query<{ id: string; name: string; whatsapp: string; email: string | null }>('select id, name, whatsapp, email from public.participants')
    expect(result.rows).toHaveLength(3)
    expect(new Set(result.rows.map((person) => person.id)).size).toBe(3)
    expect(result.rows.every((person) => person.whatsapp === '5511999991111' && person.email === null)).toBe(true)
  })

  it('fecha as inscrições junto com o sorteio e revela apenas nome e dica do destinatário', async () => {
    await seed()
    await db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
    const event = await db.query<{ registration_open: boolean; drawn: boolean }>('select registration_open, drawn_at is not null as drawn from public.christmas_event')
    expect(event.rows[0]).toEqual({ registration_open: false, drawn: true })
    const result = await db.query<{ reveal: unknown }>('select public.reveal_assignment($1) as reveal', ['a'.repeat(64)])
    expect(result.rows[0].reveal).toEqual({ giverName: 'Ana', recipientName: 'Bia', wishlist: 'Chocolate' })
    const missing = await db.query<{ reveal: unknown }>('select public.reveal_assignment($1) as reveal', ['c'.repeat(64)])
    expect(missing.rows[0].reveal).toBeNull()
    await expect(db.query("select public.register_participant_whatsapp('Clara', '5511999992222', '')")).rejects.toMatchObject({ code: '55000' })
    await expect(db.query('select public.set_registration(true)')).rejects.toMatchObject({ code: '55000' })
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])).rejects.toMatchObject({ code: '55000' })
  })

  it('desfaz o sorteio inteiro se houver auto-sorteio', async () => {
    await seed()
    const invalid = assignments.map((assignment) => ({ ...assignment, recipient_id: assignment.giver_id }))
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(invalid)])).rejects.toMatchObject({ code: '23514' })
    expect((await db.query('select * from public.assignments')).rows).toHaveLength(0)
    expect((await db.query('select registration_open, drawn_at from public.christmas_event')).rows[0]).toEqual({ registration_open: true, drawn_at: null })
  })

  it('rejeita destinatários repetidos e lista alterada durante o sorteio', async () => {
    await seed()
    await db.query("select public.register_participant_whatsapp('Clara', '5511999992222', '')")
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])).rejects.toMatchObject({ code: '40001' })
    const people = await db.query<{ id: string }>('select id from public.participants order by id')
    const c = people.rows.find((row) => row.id !== a && row.id !== b)!.id
    const invalid = [assignments[0], { giver_id: b, recipient_id: a, token_hash: 'b'.repeat(64) }, { giver_id: c, recipient_id: a, token_hash: 'c'.repeat(64) }]
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(invalid)])).rejects.toMatchObject({ code: '23505' })
    expect((await db.query('select * from public.assignments')).rows).toHaveLength(0)
  })

  it('edita um cadastro por ID sem alterar outro que usa o mesmo número', async () => {
    await seed()
    await db.query('update public.participants set whatsapp = $1', ['5511999991111'])
    await db.query('select public.admin_update_participant($1, $2, $3, $4)', [a, 'Ana corrigida', '5521999992222', 'Nova dica'])
    expect((await db.query('select name, whatsapp, wishlist from public.participants where id = $1', [a])).rows).toEqual([{ name: 'Ana corrigida', whatsapp: '5521999992222', wishlist: 'Nova dica' }])
    expect((await db.query('select name, whatsapp, wishlist from public.participants where id = $1', [b])).rows).toEqual([{ name: 'Bia', whatsapp: '5511999991111', wishlist: 'Chocolate' }])
  })

  it('remove somente a pessoa escolhida, mantendo as outras e as inscrições abertas', async () => {
    await seed()
    await db.query('update public.participants set whatsapp = $1', ['5511999991111'])
    await db.query('select public.admin_delete_participant($1)', [a])
    expect((await db.query('select id from public.participants')).rows).toEqual([{ id: b }])
    expect((await db.query('select registration_open, drawn_at from public.christmas_event')).rows[0]).toEqual({ registration_open: true, drawn_at: null })
  })

  it('permite corrigir dados depois do sorteio e preserva os pares e tokens', async () => {
    await seed()
    await db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
    const before = (await db.query('select giver_id, recipient_id, token_hash from public.assignments order by giver_id')).rows
    await db.query('select public.admin_update_participant($1, $2, $3, $4)', [a, 'Ana corrigida', '5511999991111', 'Nova dica'])
    expect((await db.query('select giver_id, recipient_id, token_hash from public.assignments order by giver_id')).rows).toEqual(before)
    expect((await db.query<{ reveal: { giverName: string } }>('select public.reveal_assignment($1) as reveal', ['a'.repeat(64)])).rows[0].reveal.giverName).toBe('Ana corrigida')
    await expect(db.query('select public.admin_delete_participant($1)', [a])).rejects.toMatchObject({ code: '55006' })
    expect((await db.query('select id from public.participants')).rows).toHaveLength(2)
    expect((await db.query('select giver_id, recipient_id, token_hash from public.assignments order by giver_id')).rows).toEqual(before)
  })

  it('restaura somente links já conhecidos pelo hash, usando os contatos atuais', async () => {
    await seed()
    await db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
    await db.query('select public.admin_update_participant($1, $2, $3, $4)', [a, 'Ana corrigida', '5511999991111', 'Livros'])
    const before = (await db.query('select * from public.assignments order by giver_id')).rows
    const result = await db.query('select * from public.admin_restore_links($1::text[])', [['a'.repeat(64), 'c'.repeat(64)]])
    expect(result.rows).toEqual([{ giver_id: a, token_hash: 'a'.repeat(64), name: 'Ana corrigida', whatsapp: '5511999991111' }])
    expect((await db.query('select * from public.assignments order by giver_id')).rows).toEqual(before)
  })

  it('rejeita cadastro inexistente e WhatsApp inválido sem alterações parciais', async () => {
    await seed()
    const missing = '00000000-0000-4000-8000-000000000099'
    await expect(db.query('select public.admin_update_participant($1, $2, $3, $4)', [missing, 'Ana', '5511999991111', ''])).rejects.toMatchObject({ code: 'P0002' })
    await expect(db.query('select public.admin_delete_participant($1)', [missing])).rejects.toMatchObject({ code: 'P0002' })
    await expect(db.query('select public.admin_update_participant($1, $2, $3, $4)', [a, 'Ana', 'invalid', ''])).rejects.toMatchObject({ code: '22023' })
    await expect(db.query("select public.register_participant_whatsapp('Ana', null, '')")).rejects.toMatchObject({ code: '22023' })
    await expect(db.query("select public.register_participant('Ana', 'ana@example.com', '')")).rejects.toMatchObject({ code: '22023' })
    expect((await db.query('select id from public.participants')).rows).toHaveLength(2)
  })

  it('reemite convite sem trocar a pessoa sorteada e invalida o token anterior', async () => {
    await seed()
    await db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
    await db.query('select public.reveal_assignment($1)', ['a'.repeat(64)])
    const before = (await db.query('select recipient_id from public.assignments where giver_id = $1', [a])).rows[0].recipient_id
    await db.query('select public.admin_reissue_link($1, $2)', [a, 'c'.repeat(64)])
    const after = (await db.query('select recipient_id, token_hash, revealed_at from public.assignments where giver_id = $1', [a])).rows[0]
    expect(after).toEqual({ recipient_id: before, token_hash: 'c'.repeat(64), revealed_at: null })
    expect((await db.query('select public.reveal_assignment($1) as reveal', ['a'.repeat(64)])).rows[0].reveal).toBeNull()
    expect((await db.query('select public.reveal_assignment($1) as reveal', ['c'.repeat(64)])).rows[0].reveal).toEqual({ giverName: 'Ana', recipientName: 'Bia', wishlist: 'Chocolate' })
    expect((await db.query('select token_hash from public.assignments where giver_id = $1', [b])).rows[0].token_hash).toBe('b'.repeat(64))
  })

  it('bloqueia reemissão antes do sorteio e para cadastro inexistente', async () => {
    await seed()
    await expect(db.query('select public.admin_reissue_link($1, $2)', [a, 'c'.repeat(64)])).rejects.toMatchObject({ code: '55000' })
    await db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
    const missing = '00000000-0000-4000-8000-000000000099'
    await expect(db.query('select public.admin_reissue_link($1, $2)', [missing, 'c'.repeat(64)])).rejects.toMatchObject({ code: 'P0002' })
    expect((await db.query('select token_hash from public.assignments where giver_id = $1', [a])).rows[0].token_hash).toBe('a'.repeat(64))
  })

  it('aplica a migração WhatsApp em uma edição com sorteio existente sem perder dados', async () => {
    const legacy = new PGlite()
    try {
      await legacy.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users (id uuid primary key);')
      await legacy.exec(migrations[0])
      await legacy.query("insert into public.participants(id, name, email) values ($1, 'Ana', 'ana@example.com'), ($2, 'Bia', 'bia@example.com')", [a, b])
      await legacy.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])
      const before = (await legacy.query('select * from public.assignments order by giver_id')).rows
      await legacy.exec(migrations[1])
      await legacy.exec(migrations[2])
      await legacy.exec(migrations[2]) // Reaplicação segura no workflow de implantação.
      expect((await legacy.query('select * from public.assignments order by giver_id')).rows).toEqual(before)
      expect((await legacy.query('select email, whatsapp from public.participants order by name')).rows).toEqual([{ email: 'ana@example.com', whatsapp: null }, { email: 'bia@example.com', whatsapp: null }])
      expect((await legacy.query('select registration_open, drawn_at is not null as drawn from public.christmas_event')).rows[0]).toEqual({ registration_open: false, drawn: true })
    } finally { await legacy.close() }
  })

  it.each(['anon', 'authenticated'])('nega leitura direta e execução de RPCs ao papel %s', async (role) => {
    await seed()
    await db.exec(`set role ${role}`)
    try {
      for (const table of ['participants', 'assignments', 'admins', 'christmas_event']) {
        await expect(db.query(`select * from public.${table}`)).rejects.toMatchObject({ code: '42501' })
      }
      for (const sql of ["select public.register_participant('Nome', 'a@example.com', '')", "select public.register_participant_whatsapp('Nome', '5511999992222', '')", `select public.admin_update_participant('${a}', 'Nome', '5511999992222', '')`, `select public.admin_delete_participant('${a}')`, "select public.admin_restore_links(array['hash'])", `select public.admin_reissue_link('00000000-0000-4000-8000-000000000001', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')`, 'select public.set_registration(true)', "select public.complete_draw('[]'::jsonb)", "select public.reveal_assignment('hash')"]) {
        await expect(db.query(sql)).rejects.toMatchObject({ code: '42501' })
      }
    } finally { await db.exec('reset role') }
  })
})
