// Código exclusivo do servidor. Não importar em src/.
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 2 ** 32) {
    throw new RangeError('Intervalo aleatório inválido.')
  }
  const range = 2 ** 32
  const cutoff = range - (range % maxExclusive)
  const value = new Uint32Array(1)
  do { crypto.getRandomValues(value) } while (value[0] >= cutoff)
  return value[0] % maxExclusive
}

export function drawRecipients(ids: readonly string[]): string[] {
  if (ids.length < 2 || ids.length > 200 || new Set(ids).size !== ids.length) {
    throw new Error('O sorteio requer de 2 a 200 participantes únicos.')
  }
  // Fisher–Yates com Web Crypto e rejection sampling: todas as permutações
  // válidas têm a mesma probabilidade, sem viés de módulo nem fallback cíclico.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const recipients = [...ids]
    for (let i = recipients.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1)
      ;[recipients[i], recipients[j]] = [recipients[j], recipients[i]]
    }
    if (recipients.every((id, i) => id !== ids[i])) return recipients
  }
  throw new Error('Não foi possível gerar uma combinação válida. Tente novamente.')
}

export function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}
