import { normalizeWhatsApp } from '../../supabase/functions/_shared/whatsapp'
export { formatWhatsApp, normalizeWhatsApp } from '../../supabase/functions/_shared/whatsapp'

export function whatsappMessage(name: string, revealUrl: string): string {
  return `Olá, ${name}! 🎄✨\n\nO amigo secreto do Natal da Família Oliveira chegou!\nEste é o seu link individual para descobrir quem você tirou:\n\n${revealUrl}\n\nEste convite é para ${name}. Se este WhatsApp for compartilhado, cada pessoa receberá seu próprio link.\nGuarde a surpresa até a nossa troca de presentes! 🎁\n\nCom carinho,\nFamília Oliveira ❤️`
}

/** Only prepares a conversation; sending always requires the administrator's click. */
export function whatsappShareUrl(phone: string | null, name: string, revealUrl: string): string | null {
  const digits = phone ? normalizeWhatsApp(`+${phone}`) : null
  if (!digits) return null
  const url = new URL(`https://wa.me/${digits}`)
  url.searchParams.set('text', whatsappMessage(name, revealUrl))
  return url.toString()
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
