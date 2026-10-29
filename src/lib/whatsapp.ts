import { normalizeWhatsApp } from '../../supabase/functions/_shared/whatsapp'
export { formatWhatsApp, normalizeWhatsApp } from '../../supabase/functions/_shared/whatsapp'

// Emoji codepoints are escaped in source to avoid loss through text encoding tools.
const tree = '\u{1F384}'
const sparkles = '\u{2728}'
const gift = '\u{1F381}'
const secret = '\u{1F92B}'
const heart = '\u{2764}\u{FE0F}'

export function whatsappMessage(name: string, revealUrl: string): string {
  return [
    `${tree} *NATAL DA FAMÍLIA OLIVEIRA*`,
    '',
    `Olá, *${name}*! ${sparkles}`,
    '',
    'O sorteio do nosso *Amigo Invisível* aconteceu!',
    '',
    `${gift} *Seu link individual:*`,
    revealUrl,
    '',
    'Abra o link e descubra quem você tirou.',
    `${secret} Guarde o segredo até a troca de presentes!`,
    '',
    `Com carinho, *Família Oliveira* ${heart}`,
  ].join('\n')
}

/** Open a prefilled WhatsApp conversation; the user still confirms sending. */
export function whatsappShareUrl(phone: string | null, name: string, revealUrl: string): string | null {
  const digits = phone ? normalizeWhatsApp(`+${phone}`) : null
  if (!digits) return null
  // Explicit UTF-8 percent encoding preserves emoji, accents and line breaks.
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage(name, revealUrl))}`
}

/** Reads both old email-based and new phone-based confidential text exports. */
export function tokensFromSavedLinks(text: string): string[] {
  const tokens = new Set<string>()
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const url = new URL(match[0])
    if (url.pathname !== '/revelar') continue
    const token = new URLSearchParams(url.hash.slice(1)).get('token')
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Um dos links do arquivo está incompleto. Use o arquivo original salvo pela organização.')
    tokens.add(token)
  }
  if (!tokens.size || tokens.size > 200) throw new Error('O arquivo precisa conter de 1 a 200 links de revelação válidos.')
  return [...tokens]
}
