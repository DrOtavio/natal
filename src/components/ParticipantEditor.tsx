import type { SubmitEvent } from 'react'
import { Save } from 'lucide-react'
import type { Participant } from '../types'
import { normalizeWhatsApp } from '../lib/whatsapp'
import { AdminDialog } from './AdminDialog'
import { WhatsAppField } from './WhatsAppField'

export interface ParticipantUpdate { id: string; name: string; whatsapp: string; wishlist: string }

export function ParticipantEditor({ participant, busy, error, onSave, onClose }: { participant: Participant; busy: boolean; error: string; onSave: (data: ParticipantUpdate) => Promise<void>; onClose: () => void }) {
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const whatsapp = normalizeWhatsApp(String(form.get('whatsapp') ?? ''))
    if (!whatsapp) return
    void onSave({ id: participant.id, name: String(form.get('name') ?? '').trim(), whatsapp, wishlist: String(form.get('wishlist') ?? '').trim() })
  }

  return <AdminDialog title="Editar cadastro" busy={busy} onClose={onClose}>
    <p className="mb-6 text-sm leading-7 text-muted">Corrija os dados de {participant.name}. O cadastro e o link individual continuam os mesmos.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy} className="space-y-5">
        <label className="field-label" htmlFor="edit-name">Nome do participante<input className="text-input" id="edit-name" name="name" required minLength={2} maxLength={80} defaultValue={participant.name} autoComplete="off" /></label>
        <WhatsAppField id="edit-whatsapp" defaultValue={participant.whatsapp ? `+${participant.whatsapp}` : ''} sharedHint />
        <label className="field-label" htmlFor="edit-wishlist">Dica de presente <span className="font-normal text-muted">(opcional)</span><textarea className="text-input min-h-28 resize-y" id="edit-wishlist" name="wishlist" rows={3} maxLength={800} defaultValue={participant.wishlist} /></label>
      </fieldset>
      {error && <p className="notice mt-5 text-wine" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="submit" className="button" disabled={busy}><Save size={16} aria-hidden="true" />{busy ? 'Salvando…' : 'Salvar alterações'}</button><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancelar</button></div>
    </form>
  </AdminDialog>
}
