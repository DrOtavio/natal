import { Suspense } from 'react'
import { ArrowUpRight, Heart, LockKeyhole } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="site-layout">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <main id="conteudo" tabIndex={-1}><Suspense fallback={<p className="page-shell py-16 text-sm text-muted" role="status">Preparando nosso encontro…</p>}><Outlet /></Suspense></main>
      <footer className="site-footer">
        <div className="page-shell">
          <div className="footer-top">
            <div><p className="eyebrow footer-eyebrow">Natal da Família Oliveira</p><p className="footer-message">O que nos une é o nosso<br /><em>melhor presente.</em></p></div>
            <div className="footer-links"><a href="/#como-funciona">Como funciona <ArrowUpRight size={14} aria-hidden="true" /></a><a href="/#inscricao">Fazer minha inscrição <ArrowUpRight size={14} aria-hidden="true" /></a><Link to="/admin"><LockKeyhole size={14} aria-hidden="true" /> Área da organização</Link></div>
          </div>
          <div className="footer-bottom"><p><Heart size={13} aria-hidden="true" /> Feito para celebrar quem faz parte da nossa história.</p><span>Uma família. Infinitas memórias.</span></div>
        </div>
      </footer>
    </div>
  )
}
