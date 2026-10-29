import { supabase } from './supabase'
import type { AdminOverview, EventStatus, IndividualLink, RevealResult } from '../types'

async function request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('O evento ainda está sendo preparado. Volte em breve.')
  const { data, error } = await supabase.functions.invoke('christmas-api', {
    body: { action, ...payload },
  })
  if (error) {
    let message = 'Não foi possível conectar. Tente novamente em instantes.'
    if (error.context instanceof Response) {
      const body: unknown = await error.context.json().catch(() => null)
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error
      }
    }
    throw new Error(message)
  }
  return data as T
}

export const api = {
  status: () => request<EventStatus>('status'),
  register: (data: { name: string; email: string; wishlist: string; website: string }) => request<{ ok: boolean }>('register', data),
  overview: () => request<AdminOverview>('admin-overview'),
  setRegistration: (open: boolean) => request<{ ok: boolean }>('set-registration', { open }),
  draw: () => request<{ links: IndividualLink[] }>('draw'),
  reveal: (token: string) => request<RevealResult>('reveal', { token }),
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.'
}

export function individualUrl(token: string): string {
  const url = new URL('/revelar', window.location.origin)
  // O fragmento não é enviado ao servidor estático nem aos logs do Cloudflare.
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}
