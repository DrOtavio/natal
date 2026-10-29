import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { AdminPage } from './pages/AdminPage'
import { RevealPage } from './pages/RevealPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="revelar" element={<RevealPage />} />
        <Route path="*" element={<div className="page-shell py-24 text-center"><h1 className="font-display text-4xl">Esse caminho não chegou à festa.</h1><Link to="/" className="button mx-auto mt-8">Voltar ao início</Link></div>} />
      </Route>
    </Routes>
  )
}
