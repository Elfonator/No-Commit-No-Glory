export enum ConferenceStatus {
  Upcoming = "Nadchádzajúca",
  Ongoing = "Aktuálna",
  Completed = "Ukončená",
  Canceled = "Zrušená",
}

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
  submission_confirmation: Date
  deadline_review: Date
  deadline_correction: Date
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

export interface ReviewerConference {
  _id: string
  year: number
  university: string
  location: string
  date: Date
  deadline_review: Date
  start_date: Date
  end_date: Date
}
