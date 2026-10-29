import { describe, expect, it, vi } from 'vitest'
import { createToken, drawRecipients, hashToken, secureRandomInt } from '../supabase/functions/_shared/draw'

describe('sorteio criptográfico', () => {
  it.each([2, 3, 10, 200])('gera uma bijeção sem auto-sorteio com %i participantes', (count) => {
    const ids = Array.from({ length: count }, (_, index) => `participant-${index}`)
    for (let attempt = 0; attempt < 25; attempt++) {
      const recipients = drawRecipients(ids)
      expect([...recipients].sort()).toEqual([...ids].sort())
      expect(recipients.every((id, index) => id !== ids[index])).toBe(true)
    }
    expect(ids[0]).toBe('participant-0')
  })

  it('rejeita tamanhos inválidos e participantes repetidos', () => {
    expect(() => drawRecipients([])).toThrow()
    expect(() => drawRecipients(['a'])).toThrow()
    expect(() => drawRecipients(['a', 'a'])).toThrow()
    expect(() => drawRecipients(Array.from({ length: 201 }, (_, i) => String(i)))).toThrow()
  })

  it('descarta valores que causariam viés de módulo', () => {
    const random = vi.spyOn(crypto, 'getRandomValues')
      .mockImplementationOnce((array) => { (array as Uint32Array)[0] = 0xffffffff; return array })
      .mockImplementationOnce((array) => { (array as Uint32Array)[0] = 5; return array })
    try { expect(secureRandomInt(3)).toBe(2); expect(random).toHaveBeenCalledTimes(2) }
    finally { random.mockRestore() }
  })

  it('cria tokens de 256 bits e persiste um hash separado', async () => {
    const tokens = Array.from({ length: 100 }, createToken)
    expect(new Set(tokens).size).toBe(100)
    expect(tokens.every((token) => /^[A-Za-z0-9_-]{43}$/.test(token))).toBe(true)
    const hash = await hashToken(tokens[0])
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(await hashToken(tokens[0])).toBe(hash)
    expect(await hashToken(tokens[1])).not.toBe(hash)
    expect(hash).not.toBe(tokens[0])
  })
})
