import { Heart, LockKeyhole } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <header className="border-b border-forest/10 bg-cream">
        <div className="page-shell flex min-h-24 flex-wrap items-center justify-between gap-4 py-5">
          <Link to="/" className="flex items-center" aria-label="Natal da Família Oliveira, início">
            <img src="/logo-natal-oliveira.svg" width="300" height="64" alt="Natal da Família Oliveira" className="h-12 w-auto" />
          </Link>
          <nav className="flex items-center gap-5 text-sm" aria-label="Principal">
            <a href="/#como-funciona" className="hidden text-muted hover:text-forest sm:inline">Como funciona</a>
            <a href="/#inscricao" className="button button-small">Quero participar <Heart size={15} /></a>
          </nav>
        </div>
      </header>
      <main id="conteudo"><Outlet /></main>
      <footer className="mt-20 border-t border-forest/10">
        <div className="page-shell flex flex-wrap items-center justify-between gap-5 py-8 text-sm text-muted">
          <p className="flex items-center gap-2"><Heart size={14} className="text-wine" /> Feito para celebrar quem faz parte da nossa história.</p>
          <Link to="/admin" className="flex items-center gap-2 hover:text-forest"><LockKeyhole size={14} /> Área da organização</Link>
        </div>
      </footer>
    </div>
  )
}
