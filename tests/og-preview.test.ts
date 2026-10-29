import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const html = readFileSync(join(root, 'index.html'), 'utf8')
const imagePath = join(root, 'public/og-logo-familia-oliveira.png')

describe('cartão do WhatsApp e da página de revelação', () => {
  it('inclui OG tags no HTML estático, acessíveis a robôs sem JavaScript', () => {
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:description"')
    expect(html).toContain('property="og:image" content="https://natal-familia-oliveira.pages.dev/og-logo-familia-oliveira.png"')
    expect(html).toContain('property="og:image:type" content="image/png"')
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html).toContain('property="og:image:height" content="630"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).not.toContain('og:image" content="data:')
    expect(html).not.toContain('og:url" content="https://natal-familia-oliveira.pages.dev/revelar#token=')
  })

  it('tem imagem real PNG de 1200x630 pixels dentro de public', () => {
    const bytes = readFileSync(imagePath)
    expect(bytes.byteLength).toBeGreaterThan(30000)
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(bytes.readUInt32BE(16)).toBe(1200)
    expect(bytes.readUInt32BE(20)).toBe(630)
  })

  it('redireciona /revelar ao HTML com a prévia, preservando o fragmento no cliente', () => {
    expect(readFileSync(join(root, 'public/_redirects'), 'utf8')).toContain('/* /index.html 200')
    expect(html).toContain('<meta name="description"')
  })
})
