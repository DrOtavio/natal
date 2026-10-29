const project = process.env.SUPABASE_PROJECT_ID
if (!project || !/^[a-z]+$/.test(project)) throw new Error('Informe o projeto Supabase da implantação.')
const endpoint = `https://${project}.supabase.co/functions/v1/christmas-api`
const invoke = (action) => fetch(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action }), signal: AbortSignal.timeout(20_000),
})

// Read-only production smoke checks. No login, registration, draw, or mutation.
const status = await invoke('status')
if (!status.ok) throw new Error(`A consulta pública falhou após a implantação (HTTP ${status.status}).`)
const body = await status.json()
if (typeof body.registrationOpen !== 'boolean' || typeof body.drawn !== 'boolean' || typeof body.participantCount !== 'number') {
  throw new Error('A API não retornou o estado público esperado.')
}
for (const action of ['update-participant', 'delete-participant', 'restore-links']) {
  const response = await invoke(action)
  if (response.status !== 401) throw new Error(`A proteção de ${action} não retornou HTTP 401 (HTTP ${response.status}).`)
  await response.arrayBuffer()
}
console.log('API verificada: consulta pública disponível e novas operações privadas protegidas por autenticação.')
