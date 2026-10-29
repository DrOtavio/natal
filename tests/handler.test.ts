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
  it.each(['admin-overview', 'set-registration', 'draw', 'reset-event'])('bloqueia %s sem JWT mesmo com administrador forjado no corpo', async (action) => {
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
      : { select: () => ({ order: async () => ({ data: [{ id: 'a', name: 'Ana', email: 'ana@example.com' }, { id: 'b', name: 'Bia', email: 'bia@example.com' }], error: null }) }) })
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

  it('valida dados antes de inscrever e não revela se o e-mail já existe', async () => {
    const ctx = setup()
    expect((await ctx.handle(post({ action: 'register', name: '', email: 'bad', wishlist: '' }))).status).toBe(400)
    expect(ctx.rpc).not.toHaveBeenCalled()
    const response = await ctx.handle(post({ action: 'register', name: ' Ana ', email: ' ANA@example.com ', wishlist: ' Livros ' }))
    expect(await response.json()).toEqual({ ok: true })
    expect(ctx.rpc).toHaveBeenCalledWith('register_participant', { p_name: 'Ana', p_email: 'ana@example.com', p_wishlist: 'Livros' })
  })

  it('não aceita tokens malformados', async () => {
    const ctx = setup()
    expect((await ctx.handle(post({ action: 'reveal', token: '../wrong' }))).status).toBe(404)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('não vaza mensagens internas do banco', async () => {
    const ctx = setup()
    ctx.rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'internal secret' } })
    const response = await ctx.handle(post({ action: 'register', name: 'Ana', email: 'ana@example.com', wishlist: '' }))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('internal secret')
  })
})
