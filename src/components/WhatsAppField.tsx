import { normalizeWhatsApp } from '../lib/whatsapp'

export function WhatsAppField({ id, defaultValue = '', sharedHint = false }: { id: string; defaultValue?: string; sharedHint?: boolean }) {
  return (
    <label className="field-label" htmlFor={id}>WhatsApp com DDD
      <input className="text-input" id={id} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required maxLength={40} defaultValue={defaultValue}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const input = event.currentTarget
          input.setCustomValidity(input.value && !normalizeWhatsApp(input.value) ? 'Informe um WhatsApp válido com DDD. Para outro país, inclua + e o código do país.' : '')
        }} />
      <span className="field-hint" id={`${id}-hint`}>{sharedHint ? 'Pode ser o número de um responsável e se repetir em outros cadastros. ' : ''}Inclua o DDD. Para outro país, use + e o código do país. Seu número não fica público.</span>
    </label>
  )
}
