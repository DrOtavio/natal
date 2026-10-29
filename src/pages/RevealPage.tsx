import { useState } from 'react'
import { Gift, Heart, LockKeyhole, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import type { RevealResult } from '../types'

export function RevealPage() {
  const location = useLocation()
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
  return <RevealCard key={token} token={token} />
}

function RevealCard({ token }: { token: string }) {
  const [result, setResult] = useState<RevealResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function reveal() {
    setBusy(true)
    setError('')
    try { setResult(await api.reveal(token)) }
    catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <section className="page-shell flex min-h-[65vh] items-center justify-center py-14">
      <div className="paper-card w-full max-w-xl overflow-hidden text-center">
        <div className="relative bg-forest px-7 py-12 text-cream"><Sparkles className="mx-auto mb-5 text-gold" size={30} strokeWidth={1.3} /><p className="eyebrow text-gold">Um segredo. Um sorriso.</p><h1 className="mt-4 font-display text-4xl">{result ? `Oi, ${result.giverName}!` : 'Tem carinho guardado aqui.'}</h1></div>
        <div className="p-8 sm:p-10">
          {result ? <div className="reveal-enter" role="status"><p className="text-sm text-muted">Seu amigo secreto é…</p><h2 className="mt-4 break-words font-display text-4xl text-wine">{result.recipientName}</h2><div className="my-7 flex items-center justify-center gap-3 text-gold-dark"><span className="h-px w-12 bg-gold/60" /><Heart size={19} /><span className="h-px w-12 bg-gold/60" /></div><p className="text-xs font-semibold uppercase tracking-widest text-muted">Uma dica para a surpresa</p><p className="mt-4 whitespace-pre-wrap break-words leading-7 text-forest">{result.wishlist || 'O melhor presente é aquele escolhido com carinho.'}</p><p className="mt-8 text-xs leading-6 text-muted">Guarde esse segredo até a troca de presentes.<br />Não compartilhe seu link com outras pessoas.</p></div>
            : token ? <><span className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-sage text-forest"><Gift size={36} strokeWidth={1.3} /></span><p className="mb-7 leading-7 text-muted">Seu amigo secreto está a um clique de distância.<br />Prepare o coração para descobrir!</p><button className="button mx-auto" disabled={busy} onClick={() => void reveal()}>{busy ? 'Abrindo seu presente…' : 'Revelar meu amigo secreto'}<Sparkles size={17} /></button><p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted"><LockKeyhole size={13} /> Este link é pessoal. Guarde com cuidado.</p></>
              : <><Gift size={42} className="mx-auto mb-5 text-gold-dark" /><h2 className="font-display text-2xl">Falta o seu convite secreto.</h2><p className="my-5 leading-7 text-muted">Abra o link completo enviado pela organização. Ele contém a chave para a sua surpresa.</p><Link to="/" className="button mx-auto">Voltar para o início</Link></>}
          {error && <p className="notice mt-6 text-wine" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  )
}
