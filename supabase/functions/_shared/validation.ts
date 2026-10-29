import { normalizeWhatsApp } from './whatsapp.ts'

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function parseRegistration(body: Record<string, unknown>) {
  if (typeof body.name !== 'string' || typeof body.whatsapp !== 'string' || typeof body.wishlist !== 'string') {
    throw new RequestError('Preencha o nome, o WhatsApp e a dica de presente.')
  }
  const name = body.name.trim()
  const whatsapp = normalizeWhatsApp(body.whatsapp)
  const wishlist = body.wishlist.trim()
  if (name.length < 2 || name.length > 80 || !whatsapp || wishlist.length > 800) {
    throw new RequestError('Confira o nome, o WhatsApp com DDD e o tamanho da dica de presente.')
  }
  return { name, whatsapp, wishlist }
}

export function parseParticipantId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) {
    throw new RequestError('O cadastro informado não é válido.')
  }
  return value
}

export function parseToken(token: unknown): string {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new RequestError('Este link não é válido. Peça seu link completo à organização.', 404)
  }
  return token
}
