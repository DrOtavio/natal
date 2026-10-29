import { describe, expect, it } from 'vitest'
import { normalizeWhatsApp, formatWhatsApp, tokensFromSavedLinks, whatsappMessage, whatsappShareUrl } from '../src/lib/whatsapp'

const reveal = 'https://natal.example.com/revelar#token=exemplo'

describe('contatos e convites de WhatsApp', () => {
  it.each([
    ['(11) 99999-1111', '5511999991111'], ['11 99999 1111', '5511999991111'],
    ['+55 (11) 99999-1111', '5511999991111'], ['5511999991111', '5511999991111'],
    ['(21) 3333-4444', '552133334444'], ['+1 (415) 555-2671', '14155552671'],
    ['+351 912 345 678', '351912345678'],
  ])('normaliza %s', (input, expected) => expect(normalizeWhatsApp(input)).toBe(expected))

  it.each(['', '123', '1199999111', '(20) 99999-1111', '+55 00 99999-1111', '+55 11 89999-1111', '00000000000', '+05511999991111', '11abc999991111', '5511999991111?text=malicious', '++5511999991111', '+1234567890123456'])('rejeita número inválido: %s', (input) => expect(normalizeWhatsApp(input)).toBeNull())

  it('formata números e identifica cadastro legado sem WhatsApp', () => {
    expect(formatWhatsApp('5511999991111')).toBe('+55 (11) 99999-1111')
    expect(formatWhatsApp('552133334444')).toBe('+55 (21) 3333-4444')
    expect(formatWhatsApp(null)).toBe('WhatsApp não informado')
  })

  it('gera mensagens separadas por participante mesmo com o mesmo número', () => {
    const ana = new URL(whatsappShareUrl('5511999991111', 'Ana', reveal + 'Ana')!)
    const bia = new URL(whatsappShareUrl('5511999991111', 'Bia', reveal + 'Bia')!)
    expect(ana.origin).toBe('https://wa.me')
    expect(ana.pathname).toBe(bia.pathname)
    expect(ana.searchParams.get('text')).toBe(whatsappMessage('Ana', reveal + 'Ana'))
    expect(bia.searchParams.get('text')).toBe(whatsappMessage('Bia', reveal + 'Bia'))
    expect(ana.toString()).not.toBe(bia.toString())
    expect(ana.searchParams.get('text')).not.toContain(reveal + 'Bia')
  })

  it('preserva acentos, quebras e o fragmento do link sem criar parâmetros extras', () => {
    const url = new URL(whatsappShareUrl('5511999991111', 'João & Maria + família', reveal)!)
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.searchParams.get('text')).toContain('Olá, *João & Maria + família*!')
    expect(url.searchParams.get('text')).toContain('\n' + reveal + '\n\n')
    expect(url.searchParams.get('text')).toContain('🎄')
    expect(url.searchParams.get('text')).toContain('🎁')
    expect(url.searchParams.get('text')).toContain('🤫')
    expect(url.searchParams.get('text')).not.toContain('\uFFFD')
    expect(url.toString()).toContain('%F0%9F%8E%84')
    expect(url.toString()).toContain('%0A')
    expect(url.hash).toBe('')
    expect(whatsappShareUrl(null, 'Ana', reveal)).toBeNull()
    expect(whatsappShareUrl('invalid', 'Ana', reveal)).toBeNull()
  })
  it('lê arquivos novos e legados, ignorando nomes e e-mails e preservando tokens distintos', () => {
    const a = 'a'.repeat(43), b = 'b'.repeat(43)
    const text = `NATAL DA FAMÍLIA OLIVEIRA
Mesmo nome <pai@example.com>
https://old.example.com/revelar#token=${a}
Mesmo nome — +55 (11) 99999-1111
https://natal.example.com/revelar#token=${b}
`
    expect(tokensFromSavedLinks(text)).toEqual([a, b])
    expect(tokensFromSavedLinks(text + `https://natal.example.com/revelar#token=${a}`)).toEqual([a, b])
    expect(() => tokensFromSavedLinks('arquivo sem links')).toThrow()
    expect(() => tokensFromSavedLinks('https://natal.example.com/revelar#token=incompleto')).toThrow()
    expect(() => tokensFromSavedLinks('https://outro.example.com/not-reveal#token=' + a)).toThrow()
  })

})
