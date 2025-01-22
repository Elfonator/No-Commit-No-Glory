import type { Review } from '@/types/review.ts'

export enum PaperStatus {
  Draft = 'Draft',
  Submitted = 'Odovzdaná',
  UnderReview = 'Posudzovanie',
  Accepted = 'Prijatá',
  AcceptedWithChanges = 'Prijatá_so_zmenami',
  Rejected = 'Odmietnutá',
}

export interface Paper {
  _id: string;
  title: string;
  status: string;
  user: {
    first_name: string;
    last_name: string;
  };
  category: { name: string; };
  conference: {_id: string, year: number, location: string, date: Date};
  abstract: string;
  keywords: string[];
  authors: { firstName: string; lastName: string }[];
  submission_date: string | Date;
  isFinal: boolean;
  file_link: File;
  deadline_date?: string | Date;
  review?: Review;
}

export interface AdminPaper {
  _id: string;
  title: string;
  status: string;
  submission_date: Date;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  category: {
    name: string;
  };
  conference: {
    _id: string;
    year: number;
    location: string;
  };
  file_link: File;
  deadline_date?: Date;
  reviewer: string;
  abstract: string;
  keywords: string[];
  authors: { firstName: string; lastName: string }[];
  isFinal: boolean;
  awarded?: boolean;
}

export interface ReviewerPaper {
  _id: string;
  title: string;
  status: string;
  category: {
    name: string;
  };
  conference: {
    _id: string;
    year: number;
    location: string;
  };
  file_link: File;
  reviewer: string;
  abstract: string;
  keywords: string[];
}
