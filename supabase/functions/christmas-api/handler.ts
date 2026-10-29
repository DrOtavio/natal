import type { SupabaseClient } from '@supabase/supabase-js'
import { createToken, drawRecipients, hashToken } from '../_shared/draw.ts'
import { parseRegistration, parseToken, RequestError } from '../_shared/validation.ts'

interface Dependencies { db: SupabaseClient; allowedOrigins: readonly string[] }
interface Participant { id: string; name: string; email: string; wishlist: string; created_at: string }
interface DatabaseError { code?: string; message?: string }

function databaseFailure(error: DatabaseError): never {
  // Nunca repassar mensagens SQL, credenciais ou payloads para o cliente/logs.
  if (error.code === '55000') throw new RequestError('As inscrições estão encerradas ou o sorteio já foi realizado.', 409)
  if (error.code === '40001') throw new RequestError('A lista de participantes mudou. Atualize a página e tente novamente.', 409)
  if (error.code === '54000') throw new RequestError('O evento atingiu o limite de participantes. Fale com a organização.', 409)
  throw new RequestError('Não foi possível concluir a operação. Tente novamente.', 500)
}

export function createHandler({ db, allowedOrigins }: Dependencies) {
  async function requireAdmin(request: Request) {
    const match = /^Bearer (.+)$/i.exec(request.headers.get('authorization') ?? '')
    if (!match) throw new RequestError('Entre na área da organização para continuar.', 401)
    const { data: { user }, error } = await db.auth.getUser(match[1])
    if (error || !user) throw new RequestError('Sua sessão expirou. Entre novamente.', 401)
    const { data: admin, error: adminError } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (adminError) databaseFailure(adminError)
    if (!admin) throw new RequestError('Esta conta não tem acesso à organização.', 403)
  }

  async function eventStatus() {
    const { data: event, error } = await db.from('christmas_event').select('registration_open, drawn_at').eq('id', true).single()
    if (error || !event) databaseFailure(error ?? {})
    const { count, error: countError } = await db.from('participants').select('id', { count: 'exact', head: true })
    if (countError) databaseFailure(countError)
    return { registrationOpen: event.registration_open as boolean, drawn: Boolean(event.drawn_at), participantCount: count ?? 0 }
  }

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin')
    const originAllowed = !origin || allowedOrigins.includes(origin)
    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Vary': 'Origin',
    })
    if (origin && originAllowed) headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
    if (!originAllowed) return json({ error: 'Origem não permitida.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') { headers.set('Allow', 'POST, OPTIONS'); return json({ error: 'Método não permitido.' }, 405) }

    try {
      // Limite efetivo mesmo para transferências sem Content-Length.
      const reader = request.body?.getReader()
      if (!reader) throw new RequestError('Envie um corpo JSON.')
      let size = 0
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 8192) { await reader.cancel(); throw new RequestError('A mensagem é muito grande.', 413) }
        chunks.push(value)
      }
      const buffer = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }
      let parsed: unknown
      try { parsed = JSON.parse(new TextDecoder().decode(buffer)) }
      catch { throw new RequestError('Envie um corpo JSON válido.') }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RequestError('Mensagem inválida.')
      const body = parsed as Record<string, unknown>

      switch (body.action) {
        case 'status': return json(await eventStatus())
        case 'register': {
          if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true })
          const participant = parseRegistration(body)
          const { error } = await db.rpc('register_participant', { p_name: participant.name, p_email: participant.email, p_wishlist: participant.wishlist })
          if (error) databaseFailure(error)
          // Mesmo resultado para e-mail já inscrito; não expõe a lista pública.
          return json({ ok: true })
        }
        case 'admin-overview': {
          await requireAdmin(request)
          const status = await eventStatus()
          const { data, error } = await db.from('participants').select('id, name, email, wishlist, created_at').order('created_at')
          if (error) databaseFailure(error)
          return json({ ...status, participants: data ?? [] })
        }
        case 'set-registration': {
          await requireAdmin(request)
          if (typeof body.open !== 'boolean') throw new RequestError('Informe se as inscrições devem ser abertas.')
          const { error } = await db.rpc('set_registration', { p_open: body.open })
          if (error) databaseFailure(error)
          return json({ ok: true })
        }
        case 'reset-event': {
          await requireAdmin(request)
          if ((body.mode !== 'draw' && body.mode !== 'all') || body.confirmation !== 'REINICIAR') {
            throw new RequestError('Confirme a operação digitando REINICIAR.', 400)
          }
          const { error } = await db.rpc('reset_christmas_event', {
            p_mode: body.mode,
            p_confirmation: body.confirmation,
          })
          if (error) databaseFailure(error)
          return json({ ok: true })
        }
        case 'draw': {
          await requireAdmin(request)
          const { data, error } = await db.from('participants').select('id, name, email, wishlist, created_at').order('id')
          if (error) databaseFailure(error)
          const participants = (data ?? []) as Participant[]
          if (participants.length < 2) throw new RequestError('Inscreva pelo menos duas pessoas antes do sorteio.')
          const recipients = drawRecipients(participants.map((person) => person.id))
          const links = participants.map(({ id, name, email }) => ({ id, name, email, token: createToken() }))
          const assignments = await Promise.all(links.map(async (link, index) => ({
            giver_id: link.id, recipient_id: recipients[index], token_hash: await hashToken(link.token),
          })))
          const { error: drawError } = await db.rpc('complete_draw', { p_assignments: assignments })
          if (drawError) databaseFailure(drawError)
          // Retorna apenas os links, nunca os pares. Tokens brutos só existem
          // nesta resposta e na memória da organização; não persistir/logar.
          return json({ links })
        }
        case 'reveal': {
          const token = parseToken(body.token)
          const { data, error } = await db.rpc('reveal_assignment', { p_token_hash: await hashToken(token) })
          if (error) databaseFailure(error)
          if (!data) throw new RequestError('Este link não está disponível. Confira com a organização.', 404)
          return json(data)
        }
        default: throw new RequestError('Operação não encontrada.', 404)
      }
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status)
      return json({ error: 'Não foi possível concluir a operação. Tente novamente.' }, 500)
    }
  }
}
