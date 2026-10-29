import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let db: PGlite
const migration = readFileSync(new URL('../supabase/migrations/20261029000000_initial.sql', import.meta.url), 'utf8')
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
  await db.exec(migration)
})

beforeEach(async () => {
  await db.exec("reset role; truncate public.assignments, public.participants; update public.christmas_event set drawn_at = null, registration_open = true;")
})

afterAll(async () => { await db?.close() })

async function seed() {
  await db.query("insert into public.participants(id, name, email, wishlist) values ($1, 'Ana', 'ana@example.com', 'Livros'), ($2, 'Bia', 'bia@example.com', 'Chocolate')", [a, b])
}

describe('migração e transações PostgreSQL', () => {
  it('mantém o e-mail único sem diferenciar maiúsculas e minúsculas', async () => {
    await db.query("select public.register_participant('Ana', 'ANA@example.com', 'Livros')")
    await db.query("select public.register_participant('Outro nome', 'ana@example.com', 'Outra dica')")
    const result = await db.query('select name, email from public.participants')
    expect(result.rows).toEqual([{ name: 'Ana', email: 'ana@example.com' }])
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
    await expect(db.query("select public.register_participant('Clara', 'clara@example.com', '')")).rejects.toMatchObject({ code: '55000' })
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
    await db.query("select public.register_participant('Clara', 'clara@example.com', '')")
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(assignments)])).rejects.toMatchObject({ code: '40001' })
    const people = await db.query<{ id: string }>('select id from public.participants order by id')
    const c = people.rows.find((row) => row.id !== a && row.id !== b)!.id
    const invalid = [assignments[0], { giver_id: b, recipient_id: a, token_hash: 'b'.repeat(64) }, { giver_id: c, recipient_id: a, token_hash: 'c'.repeat(64) }]
    await expect(db.query('select public.complete_draw($1::jsonb)', [JSON.stringify(invalid)])).rejects.toMatchObject({ code: '23505' })
    expect((await db.query('select * from public.assignments')).rows).toHaveLength(0)
  })

  it.each(['anon', 'authenticated'])('nega leitura direta e execução de RPCs ao papel %s', async (role) => {
    await seed()
    await db.exec(`set role ${role}`)
    try {
      for (const table of ['participants', 'assignments', 'admins', 'christmas_event']) {
        await expect(db.query(`select * from public.${table}`)).rejects.toMatchObject({ code: '42501' })
      }
      for (const sql of ["select public.register_participant('Nome', 'a@example.com', '')", 'select public.set_registration(true)', "select public.complete_draw('[]'::jsonb)", "select public.reveal_assignment('hash')"]) {
        await expect(db.query(sql)).rejects.toMatchObject({ code: '42501' })
      }
    } finally { await db.exec('reset role') }
  })
})
