import { readFile } from 'node:fs/promises'

const token = process.env.SUPABASE_ACCESS_TOKEN
const project = process.env.SUPABASE_PROJECT_ID
if (!token || !project || !/^[a-z]+$/.test(project)) throw new Error('Configure o acesso de implantação do Supabase.')

// Fixed, reviewed migration only. Never execute a query supplied via workflow input.
const query = await readFile(new URL('../../supabase/migrations/20261029020000_whatsapp_participants.sql', import.meta.url), 'utf8')
const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
  signal: AbortSignal.timeout(60_000),
})
if (!response.ok) {
  // Do not print the response: it may contain database internals.
  throw new Error(`A migração WhatsApp não foi aplicada (HTTP ${response.status}). A implantação da API foi interrompida.`)
}
await response.arrayBuffer()
console.log('Migração WhatsApp aplicada. Inscrições, IDs, e-mails legados, pares e tokens preservados.')
