import type { SupabaseClient } from '@supabase/supabase-js'
import { createToken, drawRecipients, hashToken } from '../_shared/draw.ts'
import { parseParticipantId, parseRegistration, parseToken, RequestError } from '../_shared/validation.ts'

interface Dependencies { db: SupabaseClient; allowedOrigins: readonly string[] }
interface Participant { id: string; name: string; whatsapp: string | null; wishlist: string; created_at: string }
interface DatabaseError { code?: string; message?: string }

function databaseFailure(error: DatabaseError): never {
  // Nunca repassar mensagens SQL, credenciais ou payloads para o cliente/logs.
  if (error.code === 'PGRST202') throw new RequestError('O banco ainda não recebeu esta atualização administrativa. Publique as migrações do Supabase e tente novamente.', 503)
  if (error.code === '55006') throw new RequestError('Depois do sorteio, não é possível remover participantes. Você ainda pode corrigir o cadastro.', 409)
  if (error.code === 'P0002') throw new RequestError('Este cadastro não foi encontrado. Atualize a lista.', 404)
  if (error.code === '22023' || error.code === '23514') throw new RequestError('Confira os dados do cadastro e tente novamente.', 400)
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
        if (size > 16384) { await reader.cancel(); throw new RequestError('A mensagem é muito grande.', 413) }
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
      if (size > 8192 && body.action !== 'restore-links') throw new RequestError('A mensagem é muito grande.', 413)

      switch (body.action) {
        case 'status': return json(await eventStatus())
        case 'register': {
          if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true })
          const participant = parseRegistration(body)
          const { error } = await db.rpc('register_participant_whatsapp', { p_name: participant.name, p_whatsapp: participant.whatsapp, p_wishlist: participant.wishlist })
          if (error) databaseFailure(error)
          // Cada inscrição tem seu próprio ID, mesmo quando o WhatsApp se repete.
          return json({ ok: true })
        }
        case 'admin-overview': {
          await requireAdmin(request)
          const status = await eventStatus()
          const { data, error } = await db.from('participants').select('id, name, whatsapp, wishlist, created_at').order('created_at')
          if (error) databaseFailure(error)
          return json({ ...status, participants: data ?? [] })
        }
        case 'update-participant': {
          await requireAdmin(request)
          const id = parseParticipantId(body.id)
          const participant = parseRegistration(body)
          const { error } = await db.rpc('admin_update_participant', { p_id: id, p_name: participant.name, p_whatsapp: participant.whatsapp, p_wishlist: participant.wishlist })
          if (error) databaseFailure(error)
          return json({ ok: true })
        }
        case 'delete-participant': {
          await requireAdmin(request)
          const id = parseParticipantId(body.id)
          if (body.confirmation !== 'REMOVER') throw new RequestError('Confirme a remoção deste cadastro.')
          const { error } = await db.rpc('admin_delete_participant', { p_id: id })
          if (error) databaseFailure(error)
          return json({ ok: true })
        }
        case 'restore-links': {
          await requireAdmin(request)
          if (!Array.isArray(body.tokens) || body.tokens.length < 1 || body.tokens.length > 200) {
            throw new RequestError('Carregue um arquivo com até 200 links individuais.')
          }
          const tokens = body.tokens.map(parseToken)
          if (new Set(tokens).size !== tokens.length) throw new RequestError('O arquivo contém links repetidos.')
          const hashes = await Promise.all(tokens.map(hashToken))
          const { data, error } = await db.rpc('admin_restore_links', { p_token_hashes: hashes })
          if (error) databaseFailure(error)
          const rows = (data ?? []) as { giver_id: string; token_hash: string; name: string; whatsapp: string | null }[]
          const byHash = new Map(rows.map((row) => [row.token_hash, row]))
          const validLinks = tokens.flatMap((token, index) => {
            const person = byHash.get(hashes[index])
            return person ? [{ id: person.giver_id, name: person.name, whatsapp: person.whatsapp, token }] : []
          })
          if (validLinks.length === 0) {
            throw new RequestError('Nenhum link do arquivo pertence ao sorteio atual. Peça novos links à organização.', 409)
          }
          return json({ links: validLinks, skipped: tokens.length - validLinks.length })
        }
        case 'reissue-link': {
          await requireAdmin(request)
          const id = parseParticipantId(body.id)
          if (body.confirmation !== 'REEMITIR') throw new RequestError('Confirme a reemissão do convite.', 400)
          const token = createToken()
          const { error } = await db.rpc('admin_reissue_link', {
            p_giver_id: id,
            p_token_hash: await hashToken(token),
          })
          if (error) databaseFailure(error)
          // Apenas o novo token sai nesta resposta e não fica armazenado em texto puro.
          return json({ token })
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
          const { data, error } = await db.rpc('admin_reset_event_v2', {
            p_mode: body.mode,
            p_confirmation: body.confirmation,
          })
          if (error) {
            const code = typeof error.code === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(error.code)
              ? error.code : 'SEM_CODIGO'
            console.error('admin_reset_event_v2 failed, SQLSTATE:', code)
            if (code === '21000') throw new RequestError('O servidor retornou um conflito de cardinalidade (21000). Nenhum reinício foi confirmado.', 500)
            if (code === 'PGRST202') throw new RequestError('Atualização do reset pendente no banco (PGRST202). Publique a API Supabase.', 503)
            if (code === '42501') throw new RequestError('A função de reset não tem permissão de execução (42501).', 503)
            databaseFailure(error)
          }
          if (!data || data.ok !== true || data.mode !== body.mode) {
            throw new RequestError('O banco não confirmou o reinício. Atualize o painel e confira o estado do sorteio.', 500)
          }
          return json({ ok: true })
        }
        case 'draw': {
          await requireAdmin(request)
          const { data, error } = await db.from('participants').select('id, name, whatsapp, wishlist, created_at').order('id')
          if (error) databaseFailure(error)
          const participants = (data ?? []) as Participant[]
          if (participants.length < 2) throw new RequestError('Inscreva pelo menos duas pessoas antes do sorteio.')
          const recipients = drawRecipients(participants.map((person) => person.id))
          const links = participants.map(({ id, name, whatsapp }) => ({ id, name, whatsapp, token: createToken() }))
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
