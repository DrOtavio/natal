import { createClient } from '@supabase/supabase-js'
import { createHandler } from './handler.ts'
import postgres from 'postgres'

const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const origins = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((origin) => origin.trim()).filter(Boolean)

if (!url || !serviceKey || !origins?.length || origins.includes('*')) {
  throw new Error('Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ALLOWED_ORIGINS no servidor.')
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

// Supabase provides this secret automatically in hosted Edge Functions.
// Keep a single short-lived database connection per isolate for the rare admin reset.
const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
const directDb = databaseUrl
  ? postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false })
  : undefined

Deno.serve(createHandler({
  db,
  allowedOrigins: origins,
  resetEventDirect: async (mode, confirmation) => {
    if (!directDb) {
      throw Object.assign(new Error('Direct database URL unavailable'), { code: 'CONNECTION' })
    }
    const rows = await directDb`SELECT public.admin_reset_event_v2(${mode}, ${confirmation}) AS result`
    return rows[0]?.result
  },
}))
