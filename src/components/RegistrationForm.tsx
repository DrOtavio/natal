import { useEffect, useState, type SubmitEvent } from 'react'
import { ArrowRight, Check, LockKeyhole, Mail } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { supabase } from '../lib/supabase'

export function RegistrationForm() {
  const [status, setStatus] = useState<'loading' | 'open' | 'closed' | 'unconfigured' | 'error'>(supabase ? 'loading' : 'unconfigured')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function checkStatus() {
    setStatus('loading')
    try {
      const event = await api.status()
      setStatus(event.registrationOpen && !event.drawn ? 'open' : 'closed')
    } catch { setStatus('error') }
  }

  useEffect(() => { if (supabase) void checkStatus() }, [])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || status !== 'open') return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api.register({
        name: String(form.get('name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        wishlist: String(form.get('wishlist') ?? '').trim(),
        website: String(form.get('website') ?? ''),
      })
      setDone(true)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  if (done) return (
    <div className="paper-card flex min-h-96 flex-col items-center justify-center p-8 text-center" role="status">
      <span className="mb-6 grid size-16 place-items-center rounded-full bg-sage text-forest"><Check size={30} /></span>
      <h3 className="font-display text-3xl">Seu carinho já faz parte.</h3>
      <p className="mt-4 max-w-sm leading-relaxed text-muted">Recebemos sua inscrição. Após o sorteio, a organização compartilhará seu link individual em particular.</p>
      <p className="mt-5 text-xs text-muted">Se este e-mail já estava inscrito, a inscrição original será mantida.</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="paper-card p-6 sm:p-9" aria-label="Inscrição no amigo secreto">
      <div className="mb-7 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-sage text-forest"><Mail size={18} /></span><div><h3 className="font-display text-2xl">Pode contar comigo!</h3><p className="mt-1 text-sm text-muted">Preencha com carinho para participar.</p></div></div>
      {status !== 'open' && <div className="notice mb-6" role="status">
        {status === 'unconfigured' && 'As inscrições estão sendo preparadas. Volte em breve.'}
        {status === 'loading' && 'Consultando as inscrições…'}
        {status === 'closed' && 'As inscrições estão encerradas. Fale com a organização para saber mais.'}
        {status === 'error' && <span>Não conseguimos consultar as inscrições. <button type="button" onClick={() => void checkStatus()} className="underline">Tentar novamente</button></span>}
      </div>}
      <fieldset disabled={status !== 'open' || busy} className="space-y-5 disabled:opacity-60">
        <label className="field-label" htmlFor="name">Como a família chama você?<input className="text-input" id="name" name="name" placeholder="Seu nome ou apelido" autoComplete="name" required minLength={2} maxLength={80} /></label>
        <label className="field-label" htmlFor="email">Seu e-mail<input className="text-input" id="email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" required maxLength={254} /><span className="field-hint">Usado para identificar sua inscrição. Não fica público.</span></label>
        <label className="field-label" htmlFor="wishlist">Uma dica para quem tirar você <span className="font-normal text-muted">(opcional)</span><textarea className="text-input min-h-28 resize-y" id="wishlist" name="wishlist" placeholder="Seus gostos, ideias de presente, tamanho da camiseta…" maxLength={800} rows={3} /></label>
        <div className="honeypot" aria-hidden="true"><label htmlFor="website">Não preencha<input id="website" name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <button className="button w-full justify-center" type="submit">{busy ? 'Enviando sua inscrição…' : 'Quero fazer parte'}<ArrowRight size={17} /></button>
      </fieldset>
      {error && <p className="mt-4 text-sm text-wine" role="alert">{error}</p>}
      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted"><LockKeyhole size={13} className="mt-0.5 shrink-0" /> Seus dados ficam com a organização. Só a pessoa que tirar você verá seu nome e sua dica de presente.</p>
    </form>
  )
}
