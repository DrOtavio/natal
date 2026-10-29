import { lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'

const HomePage = lazy(() => import('./pages/HomePage').then((page) => ({ default: page.HomePage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((page) => ({ default: page.AdminPage })))
const RevealPage = lazy(() => import('./pages/RevealPage').then((page) => ({ default: page.RevealPage })))

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
