import { createClient } from '@supabase/supabase-js'
import { createHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const origins = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((origin) => origin.trim()).filter(Boolean)

if (!url || !serviceKey || !origins?.length || origins.includes('*')) {
  throw new Error('Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ALLOWED_ORIGINS no servidor.')
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

Deno.serve(createHandler({ db, allowedOrigins: origins }))
