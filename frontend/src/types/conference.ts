export interface ConferenceAdmin {
  _id: string
  year: number
  location: string
  university: string
  date: Date
  status: string
  start_date: Date
  end_date: Date
  deadline_submission: Date
  deadline_review?: Date
  [key: string]: any
}

export interface ActiveCategory {
  _id: string
  name: string
  isActive: boolean
}

export interface ParticipantConference {
  _id: string
  year: number
  university: string
  location: string
  date: Date
  deadline_submission: Date
  start_date: Date
  end_date: Date
}
