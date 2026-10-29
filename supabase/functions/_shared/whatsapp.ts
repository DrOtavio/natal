const brazilAreaCodes = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

/** E.164 digits for storage and wa.me. National numbers default to Brazil. */
export function normalizeWhatsApp(value: string): string | null {
  const input = value.trim()
  if (input.length > 40 || !/^\+?[\d\s().-]+$/.test(input)) return null
  let digits = input.replace(/\D/g, '')
  if (!input.startsWith('+') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`
  else if (!input.startsWith('+') && !(digits.startsWith('55') && (digits.length === 12 || digits.length === 13))) return null
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null
  if (digits.startsWith('55')) {
    const national = digits.slice(2)
    if (!brazilAreaCodes.has(national.slice(0, 2)) || !/^\d{2}(?:9\d{8}|[2-5]\d{7})$/.test(national)) return null
  }
  return digits
}

export function formatWhatsApp(value: string | null): string {
  if (!value) return 'WhatsApp não informado'
  if (value.startsWith('55') && (value.length === 12 || value.length === 13)) {
    const national = value.slice(2)
    return `+55 (${national.slice(0, 2)}) ${national.slice(2, -4)}-${national.slice(-4)}`
  }
  return `+${value}`
}
