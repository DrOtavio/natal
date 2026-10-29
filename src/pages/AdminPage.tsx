import { useCallback, useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Check, Copy, Download, Gift, LockKeyhole, LogOut, MessageCircle, Pencil, RefreshCw, RotateCcw, Trash2, Upload, Users } from 'lucide-react'
import { api, errorMessage, individualUrl } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { AdminOverview, IndividualLink, Participant } from '../types'
import { ScrollReveal } from '../components/ScrollReveal'
import { AdminDialog } from '../components/AdminDialog'
import { ParticipantEditor, type ParticipantUpdate } from '../components/ParticipantEditor'
import { formatWhatsApp, tokensFromSavedLinks, whatsappShareUrl } from '../lib/whatsapp'

function LoginForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) })
      if (loginError) setError('Não foi possível entrar. Confira seu e-mail e sua senha.')
    } catch { setError('Não foi possível conectar. Tente novamente.') }
    finally { setBusy(false) }
  }

  return (
    <section className="private-stage">
      <div className="page-shell login-layout">
      <ScrollReveal className="login-story"><p className="eyebrow text-wine">Por trás de cada encontro</p><h2>Um Natal especial<br />começa com <em>cuidado.</em></h2><p>Cada nome na lista, cada surpresa e cada detalhe fazem parte da nossa história. Este é o espaço de quem ajuda tudo a acontecer.</p><div className="gold-rule" aria-hidden="true" /><span className="login-note"><LockKeyhole size={15} aria-hidden="true" /> Um espaço reservado à organização.</span></ScrollReveal>
      <form onSubmit={login} className="paper-card login-card" aria-label="Acesso da organização" aria-busy={busy}>
        <span className="login-lock"><LockKeyhole size={23} strokeWidth={1.4} aria-hidden="true" /></span><p className="eyebrow text-muted">Só para a organização</p><h1 className="mt-3 font-display text-3xl">Cuidando de cada detalhe.</h1><p className="mb-7 mt-4 text-sm leading-7 text-muted">Entre com sua conta administrativa para acompanhar as inscrições e realizar o sorteio.</p>
        {!supabase && <p className="notice mb-5">A conexão com a organização ainda está sendo preparada.</p>}
        <fieldset disabled={!supabase || busy} className="space-y-5 disabled:opacity-50">
          <label className="field-label" htmlFor="admin-email">E-mail<input className="text-input" id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required /></label>
          <label className="field-label" htmlFor="admin-password">Senha<input className="text-input" id="admin-password" name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button w-full justify-center" type="submit">{busy ? 'Entrando…' : 'Entrar na organização'}<LockKeyhole size={16} /></button>
        </fieldset>
        {error && <p role="alert" className="mt-5 text-sm text-wine">{error}</p>}
        <p className="mt-6 text-xs leading-6 text-muted">O acesso é exclusivo para contas autorizadas. Sua sessão termina ao recarregar ou fechar a página.</p>
      </form>
      </div>
    </section>
  )
}

function Dashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [links, setLinks] = useState<IndividualLink[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDraw, setConfirmDraw] = useState(false)
  const [copied, setCopied] = useState('')
  const [resetMode, setResetMode] = useState<'draw' | 'all' | null>(null)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [editPerson, setEditPerson] = useState<Participant | null>(null)
  const [deletePerson, setDeletePerson] = useState<Participant | null>(null)
  const [participantError, setParticipantError] = useState('')
  const importInput = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setError('')
    try { setOverview(await api.overview()) }
    catch (err) { setError(errorMessage(err)) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!links.length) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [links.length])

  async function runDraw() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await api.draw()
      setLinks(result.links)
      setConfirmDraw(false)
      await refresh()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function toggleRegistration() {
    if (!overview || busy) return
    setBusy(true)
    setError('')
    try { await api.setRegistration(!overview.registrationOpen); await refresh() }
    catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function resetEvent() {
    if (busy || !resetMode || resetConfirmation !== 'REINICIAR') return
    setBusy(true)
    setError('')
    try {
      await api.resetEvent(resetMode, resetConfirmation)
      setLinks([])
      setConfirmDraw(false)
      setResetMode(null)
      setResetConfirmation('')
      await refresh()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function reissueLink(person: Participant) {
    if (busy || !overview?.drawn) return
    const confirmed = window.confirm(
      `Gerar um novo link para ${person.name}?\n\nO link anterior dessa pessoa deixará de funcionar. O amigo sorteado NÃO mudará.\n\nSe já enviou o link antigo, avise a pessoa e encaminhe o novo.`
    )
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      const { token } = await api.reissueLink(person.id)
      setLinks((current) => [
        ...current.filter((link) => link.id !== person.id),
        { id: person.id, name: person.name, whatsapp: person.whatsapp, token },
      ])
      setCopied('')
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function saveParticipant(data: ParticipantUpdate) {
    if (busy) return
    setBusy(true)
    setParticipantError('')
    try {
      await api.updateParticipant(data)
      setOverview((current) => current ? { ...current, participants: current.participants.map((person) => person.id === data.id ? { ...person, ...data } : person) } : current)
      setLinks((current) => current.map((link) => link.id === data.id ? { ...link, name: data.name, whatsapp: data.whatsapp } : link))
      await refresh()
      setEditPerson(null)
    } catch (err) { setParticipantError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function removeParticipant() {
    if (busy || !deletePerson) return
    setBusy(true)
    setParticipantError('')
    try {
      await api.deleteParticipant(deletePerson.id)
      setOverview((current) => current ? { ...current, participantCount: current.participantCount - 1, participants: current.participants.filter((person) => person.id !== deletePerson.id) } : current)
      await refresh()
      setDeletePerson(null)
    } catch (err) { setParticipantError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  async function copy(link: IndividualLink) {
    try { await navigator.clipboard.writeText(individualUrl(link.token)); setCopied(link.id) }
    catch { setError('Não foi possível copiar. Baixe o arquivo de links para compartilhar.') }
  }

  async function importLinks(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      if (file.size > 128 * 1024) throw new Error('Use o arquivo de links original, com até 128 KB.')
      const tokens = tokensFromSavedLinks(await file.text())
      const result = await api.restoreLinks(tokens)
      setLinks((current) => [...new Map([...current, ...result.links].map((link) => [link.id, link])).values()])
      await refresh()
      if (result.skipped > 0) setError(`${result.skipped} link(s) do arquivo já foram substituídos. Os outros convites foram carregados; reemita somente os que faltam.`)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  function downloadLinks() {
    const text = ['NATAL DA FAMÍLIA OLIVEIRA — LINKS CONFIDENCIAIS', 'Envie cada link somente à pessoa indicada. Não compartilhe este arquivo em grupos.', '', ...links.map((link) => { const person = overview?.participants.find((participant) => participant.id === link.id) ?? link; return `${person.name} — ${formatWhatsApp(person.whatsapp)}\n${individualUrl(link.token)}\n` })].join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'natal-oliveira-links-confidenciais.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function logout() {
    if (links.length && !window.confirm('Os links só estão disponíveis nesta sessão. Confirma que já salvou os links e deseja sair?')) return
    const { error: logoutError } = await supabase!.auth.signOut()
    if (logoutError) setError('Não foi possível sair. Tente novamente.')
  }

  return (
    <section className="page-shell dashboard">
      <div className="dashboard-header flex flex-wrap items-center justify-between gap-5"><div><p className="eyebrow text-wine">Área privada</p><h1 className="mt-3 font-display text-4xl">A magia começa nos detalhes.</h1></div><button className="button button-secondary button-small" onClick={() => void logout()}><LogOut size={15} /> Sair</button></div>
      {error && <p role="alert" className="notice mt-7 text-wine">{error}</p>}
      {!overview ? <div className="paper-card mt-8 p-8"><p className="text-muted">{error ? 'Não foi possível carregar o painel.' : 'Consultando as inscrições…'}</p>{error && <button className="button button-small mt-5" onClick={() => void refresh()}>Tentar novamente</button>}</div> : <>
        <div className="dashboard-stats my-8 grid gap-5 sm:grid-cols-3">
          <div className="paper-card p-6"><Users size={22} className="mb-3 text-wine" /><p className="font-display text-3xl">{overview.participantCount}</p><p className="mt-1 text-sm text-muted">Pessoas inscritas</p></div>
          <div className="paper-card p-6"><LockKeyhole size={22} className="mb-3 text-wine" /><p className="font-display text-3xl">{overview.registrationOpen ? 'Abertas' : 'Encerradas'}</p><p className="mt-1 text-sm text-muted">Inscrições</p></div>
          <div className="paper-card p-6"><Gift size={22} className="mb-3 text-wine" /><p className="font-display text-3xl">{overview.drawn ? 'Realizado' : 'Aguardando'}</p><p className="mt-1 text-sm text-muted">Sorteio do amigo secreto</p></div>
        </div>
        <div className="paper-card mb-8 p-6 sm:p-8"><h2 className="font-display text-2xl">O grande momento</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted">Cada participante recebe um único amigo secreto e ninguém tira a si mesmo. Os convites são individuais e devem ser compartilhados em particular.</p>
          {overview.drawn ? <p className="notice mt-5">{links.length ? 'Sorteio concluído. Salve os links abaixo antes de sair.' : 'Sorteio já realizado. Carregue o arquivo confidencial salvo pela organização para preparar as mensagens no WhatsApp.'}</p> : <div className="mt-6 flex flex-wrap gap-3"><button className="button" disabled={busy || overview.participantCount < 2} onClick={() => setConfirmDraw(true)}><Gift size={17} /> Realizar sorteio</button><button className="button button-secondary" disabled={busy} onClick={() => void toggleRegistration()}>{overview.registrationOpen ? 'Pausar inscrições' : 'Reabrir inscrições'}</button></div>}
          {!overview.drawn && overview.participantCount < 2 && <p className="mt-4 text-sm text-muted">É preciso ter pelo menos duas pessoas inscritas.</p>}
          {confirmDraw && !overview.drawn && <div className="notice mt-6"><p className="font-semibold">Confirma o sorteio com {overview.participantCount} participantes?</p><p className="mt-2">As inscrições serão encerradas. Os links secretos aparecerão uma única vez: salve o arquivo antes de fechar a página.</p><div className="mt-4 flex flex-wrap gap-3"><button className="button button-small" disabled={busy} onClick={() => void runDraw()}>{busy ? 'Sorteando com segurança…' : 'Confirmar sorteio'}</button><button className="button button-secondary button-small" disabled={busy} onClick={() => setConfirmDraw(false)}>Cancelar</button></div></div>}
        </div>
        <input ref={importInput} type="file" accept=".txt,text/plain" className="hidden" aria-label="Arquivo confidencial de links" onChange={(event) => void importLinks(event)} />
        {overview.drawn && <div className="mb-7 flex flex-wrap items-center gap-4"><button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => importInput.current?.click()}><Upload size={15} aria-hidden="true" />{busy ? 'Aguarde…' : 'Carregar links salvos'}</button><p className="max-w-xl text-xs leading-6 text-muted">Para enviar pelo celular, carregue o arquivo confidencial do sorteio. Os botões de WhatsApp aparecerão junto de cada participante. Se perdeu o arquivo, é possível reemitir o link individual abaixo, invalidando somente o link antigo da pessoa.</p></div>}
        {links.length > 0 && <section className="paper-card mb-8 border-gold p-6 sm:p-8" aria-label="Links individuais confidenciais">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow text-wine">Um convite para cada pessoa</p><h2 className="mt-2 font-display text-3xl">Cada segredo, no seu lugar.</h2></div><button className="button button-small" onClick={downloadLinks}><Download size={15} aria-hidden="true" /> Baixar links confidenciais</button></div>
          <p className="my-5 text-sm leading-7 text-muted">O botão abre uma conversa com o nome e o link daquela pessoa na mensagem. Confira e toque em enviar no WhatsApp. Mesmo com números repetidos, cada participante recebe um convite separado.</p>
          <p className="notice mb-4 text-wine">Salve o arquivo antes de sair ou atualizar a página. Os links estão disponíveis somente nesta sessão. Quem receber um link poderá abrir a revelação daquela pessoa.</p>
          <ul className="invite-list">{links.map((link) => {
            const person = overview.participants.find((participant) => participant.id === link.id) ?? link
            const shareUrl = whatsappShareUrl(person.whatsapp, person.name, individualUrl(link.token))
            return <li key={link.id} className="invite-row" data-participant-id={link.id}>
              <div className="min-w-0"><p className="break-words font-semibold">{person.name}</p><p className="mt-1 text-xs text-muted">{formatWhatsApp(person.whatsapp)}</p>{!shareUrl && <p className="mt-2 text-xs text-wine">Edite o cadastro para informar o WhatsApp.</p>}</div>
              <div className="invite-actions">{shareUrl ? <a className="button button-whatsapp button-small" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp para ${person.name}`}><MessageCircle size={16} aria-hidden="true" /> Abrir WhatsApp</a> : <button type="button" className="button button-whatsapp button-small" disabled><MessageCircle size={16} aria-hidden="true" /> Abrir WhatsApp</button>}<button className="button button-secondary button-small" onClick={() => void copy(link)} aria-label={`Copiar link de ${person.name}`}>{copied === link.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === link.id ? 'Copiado' : 'Copiar link'}</button></div>
            </li>
          })}</ul>
        </section>}
        <section className="paper-card mb-8 overflow-hidden" aria-label="Participantes inscritos">
          <div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="eyebrow text-wine">A nossa lista de presenças</p><h2 className="mt-2 font-display text-3xl" tabIndex={-1} data-participants-heading>Quem vem celebrar</h2></div><button className="button button-secondary button-small" disabled={busy} onClick={() => void refresh()} aria-label="Atualizar participantes"><RefreshCw size={15} aria-hidden="true" /></button></div>
          {overview.drawn && <p id="participant-removal-note" className="mx-6 mb-5 text-xs leading-6 text-muted">Depois do sorteio, você pode corrigir nomes, números e dicas. A remoção fica bloqueada para preservar os pares e os links já distribuídos.</p>}
          {overview.participants.length ? <ul className="participant-list">{overview.participants.map((person) => {
            const currentLink = links.find((link) => link.id === person.id)
            const shareUrl = currentLink ? whatsappShareUrl(person.whatsapp, person.name, individualUrl(currentLink.token)) : null
            return <li key={person.id} className="participant-row" data-participant-id={person.id}>
            <div className="participant-name"><span className="eyebrow">Participante</span><h3>{person.name}</h3></div>
            <div className="participant-contact"><span className="eyebrow">WhatsApp privado</span><p className={!person.whatsapp ? 'text-wine' : ''}>{formatWhatsApp(person.whatsapp)}</p></div>
            <div className="participant-wishlist"><span className="eyebrow">Dica de presente</span><p>{person.wishlist || 'Ainda sem dica de presente.'}</p></div>
            <div className="participant-actions">
              {overview.drawn && (currentLink
                ? shareUrl
                  ? <a className="button button-whatsapp button-small" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label={`Enviar convite de ${person.name} pelo WhatsApp`}><MessageCircle size={17} aria-hidden="true" /> Enviar pelo WhatsApp</a>
                  : <button type="button" className="button button-whatsapp button-small" disabled>Informe o WhatsApp</button>
                : <button type="button" className="button button-whatsapp button-small" disabled={busy} onClick={() => void reissueLink(person)} aria-label={`Reemitir convite de ${person.name}; invalida o link anterior`}><RotateCcw size={16} aria-hidden="true" /> Reemitir link para enviar</button>
              )}
              <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => { setParticipantError(''); setEditPerson(person) }} aria-label={`Editar cadastro de ${person.name}`}><Pencil size={15} aria-hidden="true" /> Editar</button>
              <button type="button" className="button button-secondary button-small button-remove" disabled={busy || overview.drawn} aria-describedby={overview.drawn ? 'participant-removal-note' : undefined} onClick={() => { setParticipantError(''); setDeletePerson(person) }} aria-label={`Remover cadastro de ${person.name}`}><Trash2 size={15} aria-hidden="true" /> Remover</button>
            </div>
          </li>})}</ul> : <p className="px-6 pb-8 text-sm text-muted">A lista está esperando o primeiro nome da família.</p>}
        </section>
        <section className="paper-card maintenance-card mb-8 p-6 sm:p-8" aria-label="Manutenção do evento">
          <p className="eyebrow text-wine">Zona de manutenção</p>
          <h2 className="mt-3 font-display text-2xl">Reiniciar o evento</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Exclusivo da organização. Qualquer reinício apaga o sorteio anterior e invalida definitivamente todos os links já distribuídos.
            Use apenas em testes ou se a família concordar em fazer um novo sorteio.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => { setResetMode('draw'); setResetConfirmation('') }}>
              <RotateCcw size={16} /> Refazer sorteio (manter inscritos)
            </button>
            <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => { setResetMode('all'); setResetConfirmation('') }}>
              <Trash2 size={16} /> Apagar inscrições e sorteio
            </button>
          </div>
          {resetMode && <div className="notice mt-6" role="group" aria-label="Confirmar reinício do evento">
            <h3 className="font-semibold text-wine">Atenção: ação irreversível</h3>
            <p className="mt-2 text-sm leading-6">
              {resetMode === 'draw'
                ? 'Todos os resultados e links de revelação serão apagados. Os participantes e suas dicas permanecerão cadastrados e as inscrições serão reabertas.'
                : 'Todos os participantes, dicas, resultados e links de revelação serão apagados. As inscrições serão reabertas do zero.'}
            </p>
            <label className="field-label mt-4" htmlFor="reset-confirmation">Digite REINICIAR para confirmar
              <input className="text-input mt-2" id="reset-confirmation" type="text" autoComplete="off" spellCheck={false} value={resetConfirmation} onChange={event => setResetConfirmation(event.target.value)} placeholder="REINICIAR" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="button button-small" disabled={busy || resetConfirmation !== 'REINICIAR'} onClick={() => void resetEvent()}>
                {busy ? 'Reiniciando…' : 'Confirmar reinício'}
              </button>
              <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => { setResetMode(null); setResetConfirmation('') }}>Cancelar</button>
            </div>
          </div>}
        </section>
        {editPerson && <ParticipantEditor participant={editPerson} busy={busy} error={participantError} onSave={saveParticipant} onClose={() => { if (!busy) setEditPerson(null) }} />}
        {deletePerson && <AdminDialog title="Remover este cadastro?" busy={busy} onClose={() => { if (!busy) setDeletePerson(null) }}><p className="text-sm leading-7 text-muted">Você vai remover <strong className="text-forest">{deletePerson.name}</strong> ({formatWhatsApp(deletePerson.whatsapp)}). Os outros cadastros serão mantidos, inclusive os que usam o mesmo WhatsApp.</p><p className="notice mt-5">Esta ação não pode ser desfeita. A pessoa poderá se inscrever novamente enquanto as inscrições estiverem abertas.</p>{participantError && <p className="mt-5 text-sm text-wine" role="alert">{participantError}</p>}<div className="dialog-actions"><button type="button" className="button" disabled={busy} onClick={() => void removeParticipant()}><Trash2 size={16} aria-hidden="true" />{busy ? 'Removendo…' : 'Confirmar remoção'}</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => setDeletePerson(null)}>Cancelar</button></div></AdminDialog>}

      </>}
    </section>
  )
}

export function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setLoading(false) })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p className="page-shell py-16" role="status">Verificando sua sessão…</p>
  return session ? <Dashboard key={session.user.id} /> : <LoginForm />
}
