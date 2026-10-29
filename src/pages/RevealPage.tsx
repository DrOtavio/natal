import { useEffect, useRef, useState } from 'react'
import { Gift, Heart, LockKeyhole, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { FestiveLights } from '../components/FestiveLights'
import { GiftBox } from '../components/GiftBox'
import { RevealConfetti } from '../components/RevealConfetti'
import { RevealSound } from '../lib/reveal-sound'
import { api, errorMessage } from '../lib/api'
import type { RevealResult } from '../types'

export function RevealPage() {
  const location = useLocation()
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
  return <RevealCard key={token} token={token} />
}

function RevealCard({ token }: { token: string }) {
  const [result, setResult] = useState<RevealResult | null>(null)
  const [unwrapped, setUnwrapped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)
  const soundRef = useRef<RevealSound | null>(null)

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) soundRef.current?.stop() }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden)
      soundRef.current?.dispose()
      soundRef.current = null
    }
  }, [])

  // Presentation only: no additional requests or changes to the returned pairing.
  useEffect(() => {
    if (!result) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!motion.matches) soundRef.current?.play('suspense')
    const finish = () => setUnwrapped(true)
    const timer = window.setTimeout(finish, motion.matches ? 0 : 2800)
    const onMotionChange = () => { if (motion.matches) finish() }
    motion.addEventListener('change', onMotionChange)
    return () => {
      window.clearTimeout(timer)
      motion.removeEventListener('change', onMotionChange)
    }
  }, [result])

  useEffect(() => {
    if (unwrapped) {
      resultRef.current?.focus({ preventScroll: true })
      soundRef.current?.play('reveal')
    }
  }, [unwrapped])

  async function reveal() {
    if (busy || result) return
    // AudioContext is unlocked synchronously by the reveal button, never on page load.
    soundRef.current ??= new RevealSound()
    soundRef.current.prime()
    setBusy(true)
    setError('')
    try { setResult(await api.reveal(token)) }
    catch (err) { soundRef.current?.stop(); setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  const opened = Boolean(result && unwrapped)

  return (
    <section className="reveal-stage" aria-labelledby="reveal-title">
      <FestiveLights />
      <div className="page-shell">
        <div className="reveal-intro"><p className="eyebrow">Um segredo. Um sorriso.</p><h1 id="reveal-title">{opened && result ? `Oi, ${result.giverName}!` : 'Tem carinho guardado aqui.'}</h1></div>
        <div className={`reveal-card${opened ? ' is-revealed' : ''}`}>
          {opened && <RevealConfetti />}
          {opened && result ? <div className="reveal-result" ref={resultRef} tabIndex={-1} role="region" aria-labelledby="recipient-name"><p className="eyebrow">Seu amigo secreto é…</p><h2 id="recipient-name" className="recipient-name">{result.recipientName}</h2><div className="reveal-divider" aria-hidden="true"><span /><Heart size={20} strokeWidth={1.3} /><span /></div><div className="wishlist-card"><p className="eyebrow"><Gift size={15} aria-hidden="true" /> Uma dica para a surpresa</p><p>{result.wishlist || 'O melhor presente é aquele escolhido com carinho.'}</p></div><p className="reveal-result-note">Guarde esse segredo até a troca de presentes.<br />Não compartilhe seu link com outras pessoas.</p></div>
            : token ? <>
              <GiftBox opening={Boolean(result)} waiting={busy} />
              <p className="reveal-description">Seu amigo secreto está a um clique de distância.<br />Prepare o coração para descobrir!</p>
              {result ? <p className="reveal-loading" role="status"><Sparkles size={17} aria-hidden="true" /> O segredo está quase se revelando…</p> : <button className="button button-gold mx-auto" disabled={busy} aria-busy={busy} onClick={() => void reveal()}>{busy ? 'Buscando sua surpresa…' : 'Revelar meu amigo secreto'}<Sparkles size={17} aria-hidden="true" /></button>}
              <p className="reveal-privacy"><LockKeyhole size={13} aria-hidden="true" /> Este link é pessoal. Guarde com cuidado.</p>
            </>
              : <div className="reveal-missing"><Gift size={44} strokeWidth={1.2} aria-hidden="true" /><h2>Falta o seu convite secreto.</h2><p>Abra o link completo enviado pela organização. Ele contém a chave para a sua surpresa.</p><Link to="/" className="button button-gold mx-auto">Voltar para o início</Link></div>}
          {error && <p className="notice reveal-error mt-6" role="alert">{error}</p>}
        </div>
        <p className="reveal-privacy"><Heart size={12} aria-hidden="true" /> Uma surpresa escolhida pelo destino. Um presente escolhido com carinho.</p>
      </div>
    </section>
  )
}
