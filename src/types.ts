export interface EventStatus {
  registrationOpen: boolean
  drawn: boolean
  participantCount: number
}

export interface Participant {
  id: string
  name: string
  email: string
  wishlist: string
  created_at: string
}

export interface AdminOverview extends EventStatus { participants: Participant[] }

export interface IndividualLink {
  id: string
  name: string
  email: string
  token: string
}

export interface RevealResult {
  giverName: string
  recipientName: string
  wishlist: string
}
