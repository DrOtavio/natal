import { readFile } from 'node:fs/promises'

const token = process.env.SUPABASE_ACCESS_TOKEN
const project = process.env.SUPABASE_PROJECT_ID
if (!token || !project || !/^[a-z]+$/.test(project)) throw new Error('Configure o acesso de implantação do Supabase.')

// Only reviewed fixed migrations. No user-supplied SQL or destructive data changes.
const migrations = [
  '20261029010000_admin_reset.sql',
  '20261029020000_whatsapp_participants.sql',
  '20261029030000_reissue_link.sql',
]

for (const filename of migrations) {
  const query = await readFile(new URL(`../../supabase/migrations/${filename}`, import.meta.url), 'utf8')
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    // Do not output SQL errors, credentials or participant details.
    throw new Error(`A migração ${filename} falhou (HTTP ${response.status}). A implantação da API foi interrompida.`)
  }
  await response.arrayBuffer()
  console.log(`Migração aplicada: ${filename}. Sorteio e inscritos preservados.`)
}
