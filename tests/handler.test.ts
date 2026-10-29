import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHandler } from '../supabase/functions/christmas-api/handler'

function setup() {
  const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }
  const from = vi.fn()
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  const db = { auth, from, rpc } as unknown as SupabaseClient
  return { auth, from, rpc, handle: createHandler({ db, allowedOrigins: ['https://natal.example.com'] }) }
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.supabase.co/functions/v1/christmas-api', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  })
}

describe('fronteiras da API', () => {
  it.each(['admin-overview', 'set-registration', 'draw', 'reset-event', 'update-participant', 'delete-participant', 'restore-links'])('bloqueia %s sem JWT mesmo com administrador forjado no corpo', async (action) => {
    const ctx = setup()
    const response = await ctx.handle(post({ action, user_id: 'admin', role: 'admin' }))
    expect(response.status).toBe(401)
    expect(ctx.from).not.toHaveBeenCalled()
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('rejeita JWT inválido', async () => {
    const ctx = setup()
    const response = await ctx.handle(post({ action: 'draw' }, { Authorization: 'Bearer forged' }))
    expect(response.status).toBe(401)
    expect(ctx.auth.getUser).toHaveBeenCalledWith('forged')
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('rejeita usuário autenticado que não está na lista de administradores', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'ordinary-user' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })
    const response = await ctx.handle(post({ action: 'draw' }, { Authorization: 'Bearer signed-user-token' }))
    expect(response.status).toBe(403)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('sorteia para um administrador, salva só hashes e retorna só os links', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockImplementation((table: string) => table === 'admins'
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) }
      : { select: () => ({ order: async () => ({ data: [{ id: 'a', name: 'Ana', whatsapp: '5511999991111' }, { id: 'b', name: 'Bia', whatsapp: '5511999991111' }], error: null }) }) })
    const response = await ctx.handle(post({ action: 'draw' }, { Authorization: 'Bearer valid-admin-token' }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.links).toHaveLength(2)
    expect(body.links[0].token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(JSON.stringify(body)).not.toContain('recipient')
    const [name, args] = ctx.rpc.mock.calls[0]
    expect(name).toBe('complete_draw')
    expect(args.p_assignments[0]).toMatchObject({ giver_id: 'a', recipient_id: 'b' })
    expect(args.p_assignments[0].token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(args)).not.toContain(body.links[0].token)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each(['draw', 'all'])('exige autorização administrativa e confirmação para reset %s', async (mode) => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }),
    }))
    const headers = { Authorization: 'Bearer valid-admin-token' }

    const denied = await ctx.handle(post({ action: 'reset-event', mode, confirmation: 'wrong' }, headers))
    expect(denied.status).toBe(400)
    expect(ctx.rpc).not.toHaveBeenCalled()

    const success = await ctx.handle(post({ action: 'reset-event', mode, confirmation: 'REINICIAR' }, headers))
    expect(success.status).toBe(200)
    expect(ctx.rpc).toHaveBeenCalledWith('reset_christmas_event', { p_mode: mode, p_confirmation: 'REINICIAR' })
  })

  it('rejeita origem não permitida antes de acessar o banco', async () => {
    const ctx = setup()
    const response = await ctx.handle(post({ action: 'register' }, { Origin: 'https://other.example.com' }))
    expect(response.status).toBe(403)
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('responde ao preflight da origem autorizada', async () => {
    const ctx = setup()
    const response = await ctx.handle(new Request('https://example.com', { method: 'OPTIONS', headers: { Origin: 'https://natal.example.com' } }))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://natal.example.com')
  })

  it('limita corpos grandes mesmo sem Content-Length', async () => {
    const ctx = setup()
    const response = await ctx.handle(post({ action: 'register', name: 'a'.repeat(9000) }))
    expect(response.status).toBe(413)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('valida dados e normaliza o WhatsApp antes de inscrever', async () => {
    const ctx = setup()
    expect((await ctx.handle(post({ action: 'register', name: '', whatsapp: 'bad', wishlist: '' }))).status).toBe(400)
    expect(ctx.rpc).not.toHaveBeenCalled()
    const response = await ctx.handle(post({ action: 'register', name: ' Ana ', whatsapp: ' (11) 99999-1111 ', wishlist: ' Livros ' }))
    expect(await response.json()).toEqual({ ok: true })
    expect(ctx.rpc).toHaveBeenCalledWith('register_participant_whatsapp', { p_name: 'Ana', p_whatsapp: '5511999991111', p_wishlist: 'Livros' })
  })

  it('edita somente o ID autorizado e normaliza o telefone', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const id = '00000000-0000-4000-8000-000000000001'
    const response = await ctx.handle(post({ action: 'update-participant', id, name: ' Ana ', whatsapp: '(21) 99999-2222', wishlist: ' Livros ' }, { Authorization: 'Bearer admin' }))
    expect(response.status).toBe(200)
    expect(ctx.rpc).toHaveBeenCalledWith('admin_update_participant', { p_id: id, p_name: 'Ana', p_whatsapp: '5521999992222', p_wishlist: 'Livros' })
  })

  it('aceita número internacional com código explícito sem acrescentar o país brasileiro', async () => {
    const ctx = setup()
    const response = await ctx.handle(post({ action: 'register', name: 'Ana', whatsapp: '+1 (415) 555-2671', wishlist: '' }))
    expect(response.status).toBe(200)
    expect(ctx.rpc).toHaveBeenCalledWith('register_participant_whatsapp', { p_name: 'Ana', p_whatsapp: '14155552671', p_wishlist: '' })
  })

  it('exige confirmação de remoção e traduz a proteção de sorteio sem vazar SQL', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const id = '00000000-0000-4000-8000-000000000001'
    const headers = { Authorization: 'Bearer admin' }
    expect((await ctx.handle(post({ action: 'delete-participant', id }, headers))).status).toBe(400)
    expect(ctx.rpc).not.toHaveBeenCalled()
    ctx.rpc.mockResolvedValue({ data: null, error: { code: '55006', message: 'internal SQL' } })
    const response = await ctx.handle(post({ action: 'delete-participant', id, confirmation: 'REMOVER' }, headers))
    expect(response.status).toBe(409)
    expect(await response.text()).not.toContain('internal SQL')
    expect(ctx.rpc).toHaveBeenCalledWith('admin_delete_participant', { p_id: id })
  })

  it.each(['update-participant', 'delete-participant', 'restore-links'])('rejeita %s para usuário comum', async (action) => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'ordinary-user' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })
    expect((await ctx.handle(post({ action, id: '00000000-0000-4000-8000-000000000001', confirmation: 'REMOVER' }, { Authorization: 'Bearer ordinary-user' }))).status).toBe(403)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('recusa IDs e telefones malformados na edição e retorna 404 para cadastro ausente', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const headers = { Authorization: 'Bearer admin' }
    const body = { action: 'update-participant', id: 'invalid', name: 'Ana', whatsapp: '5511999991111', wishlist: '' }
    expect((await ctx.handle(post(body, headers))).status).toBe(400)
    const id = '00000000-0000-4000-8000-000000000001'
    expect((await ctx.handle(post({ ...body, id, whatsapp: 'bad' }, headers))).status).toBe(400)
    expect(ctx.rpc).not.toHaveBeenCalled()
    ctx.rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'internal SQL' } })
    expect((await ctx.handle(post({ ...body, id }, headers))).status).toBe(404)
  })

  it('carrega links pelo hash sem salvar tokens nem revelar os pares', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const tokens = ['a'.repeat(43), 'b'.repeat(43)]
    ctx.rpc.mockImplementation(async (_name, args) => ({ data: args.p_token_hashes.map((hash: string, i: number) => ({ giver_id: String(i), token_hash: hash, name: i ? 'Bia' : 'Ana', whatsapp: '5511999991111' })), error: null }))
    const response = await ctx.handle(post({ action: 'restore-links', tokens }, { Authorization: 'Bearer admin' }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.links).toEqual([{ id: '0', name: 'Ana', whatsapp: '5511999991111', token: tokens[0] }, { id: '1', name: 'Bia', whatsapp: '5511999991111', token: tokens[1] }])
    expect(JSON.stringify(body)).not.toContain('recipient')
    expect(JSON.stringify(body)).not.toContain('token_hash')
    expect(ctx.rpc.mock.calls[0][0]).toBe('admin_restore_links')
    expect(ctx.rpc.mock.calls[0][1].p_token_hashes.every((hash: string) => /^[a-f0-9]{64}$/.test(hash))).toBe(true)
    expect(JSON.stringify(ctx.rpc.mock.calls)).not.toContain(tokens[0])
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('recusa links antigos, duplicados, vazios ou malformados na importação', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const headers = { Authorization: 'Bearer admin' }
    for (const tokens of [[], ['bad'], ['a'.repeat(43), 'a'.repeat(43)], Array(201).fill('a'.repeat(43))]) {
      expect((await ctx.handle(post({ action: 'restore-links', tokens }, headers))).status).toBeGreaterThanOrEqual(400)
    }
    expect(ctx.rpc).not.toHaveBeenCalled()
    ctx.rpc.mockResolvedValue({ data: [], error: null })
    const response = await ctx.handle(post({ action: 'restore-links', tokens: ['a'.repeat(43)] }, headers))
    expect(response.status).toBe(409)
    expect(await response.text()).not.toContain('a'.repeat(43))
  })

  it('aceita os 200 convites da edição e mantém os outros corpos limitados a 8 KB', async () => {
    const ctx = setup()
    ctx.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null })
    ctx.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'admin' }, error: null }) }) }) })
    const tokens = Array.from({ length: 200 }, (_, i) => 'a'.repeat(40) + i.toString(36).padStart(3, '0'))
    ctx.rpc.mockImplementation(async (_name, args) => ({ data: args.p_token_hashes.map((hash: string, i: number) => ({ giver_id: String(i), token_hash: hash, name: 'Pessoa', whatsapp: null })), error: null }))
    const response = await ctx.handle(post({ action: 'restore-links', tokens }, { Authorization: 'Bearer admin' }))
    expect(response.status).toBe(200)
    expect((await response.json()).links).toHaveLength(200)
  })

  it('não aceita tokens malformados', async () => {
    const ctx = setup()
    expect((await ctx.handle(post({ action: 'reveal', token: '../wrong' }))).status).toBe(404)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('não vaza mensagens internas do banco', async () => {
    const ctx = setup()
    ctx.rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'internal secret' } })
    const response = await ctx.handle(post({ action: 'register', name: 'Ana', whatsapp: '5511999991111', wishlist: '' }))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('internal secret')
  })
})
