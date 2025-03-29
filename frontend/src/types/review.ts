import type { Question } from './question'

export interface ReviewResponse {
  _id: string
  question: string | Question
  answer: string | number | null
}

export interface Review {
  _id?: string
  paper: string | any
  reviewer: string
  responses: ReviewResponse[]
  comments: string
  recommendation: 'Publikovať' | 'Publikovať so zmenami' | 'Odmietnuť'
  created_at: Date
  isDraft: boolean
}

export interface ReviewForParticipant {
  _id: string;
  question: {
    _id: string;
    text: string;
    type: string;
    category: string;
    options: {
      min?: number;
      max?: number;
      choices: any[];
    };
    __v: number;
  };
  answer: string | number | null;
}

export interface ParticipantReview {
  _id: string;
  responses: ReviewForParticipant[];
  comments: string;
  recommendation: 'Publikovať' | 'Publikovať so zmenami' | 'Odmietnuť';
}
