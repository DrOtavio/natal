export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function parseRegistration(body: Record<string, unknown>) {
  if (typeof body.name !== 'string' || typeof body.email !== 'string' || typeof body.wishlist !== 'string') {
    throw new RequestError('Preencha seu nome, e-mail e a dica de presente.')
  }
  const name = body.name.trim()
  const email = body.email.trim().toLowerCase()
  const wishlist = body.wishlist.trim()
  if (name.length < 2 || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || wishlist.length > 800) {
    throw new RequestError('Confira o nome, o e-mail e o tamanho da dica de presente.')
  }
  return { name, email, wishlist }
}

export function parseToken(token: unknown): string {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new RequestError('Este link não é válido. Peça seu link completo à organização.', 404)
  }
  return token
}
