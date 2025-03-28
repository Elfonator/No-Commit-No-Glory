import type { Review } from '@/types/review.ts'

export enum PaperStatus {
  Draft = 'Draft',
  Submitted = 'Odovzdaná',
  SubmittedAfterReview = "Odovzdaná po recenzii",
  UnderReview = 'Posudzovanie',
  Accepted = 'Prijatá',
  AcceptedWithChanges = 'Prijatá so zmenami',
  Rejected = 'Odmietnutá',
}

export interface Paper {
  _id: string
  title: string
  status: string
  user: {
    first_name: string
    last_name: string
  }
  category: { _id: string, name: string }
  conference: { _id: string; year: number; location: string; date: Date }
  abstract: string
  keywords: string[]
  authors: { firstName: string; lastName: string }[]
  submission_date: string | Date
  isFinal: boolean
  file_link?: string | File | null;
  deadline_date?: string | Date
  review?: Review
  awarded?: boolean
}

export interface AdminPaper {
  _id: string
  title: string
  status: string
  submission_date: Date
  user: {
    first_name: string
    last_name: string
    email: string
  }
  category: {
    _id: string;
    name: string
  }
  conference: {
    _id: string
    year: number
    location: string
  }
  file_link: string | File;
  deadline_date?: Date
  reviewer: string
  abstract: string
  keywords: string[]
  authors: { firstName: string; lastName: string }[]
  isFinal: boolean
  review?: Review
  awarded?: boolean
}

export interface ReviewerPaper {
  _id: string
  title: string
  status: string
  submission_date: Date
  category: {
    name: string
  }
  conference: {
    _id: string
    year: number
    location: string
    deadline_review: Date
  }
  file_link: string | File;
  reviewer: string
  review: Review
  abstract: string
  keywords: string[]
  authors: { firstName: string; lastName: string }[]
}
