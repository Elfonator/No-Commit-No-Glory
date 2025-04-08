export interface Committee {
  _id: string;
  fullName: string;
  university: 'UKF' | 'UMB' | 'UCM';
}

export interface ProgramItem {
  _id?: string;
  schedule: string;
  description: string;
}

export interface Program {
  fileLink: File;
  items: ProgramItem[];
}

export interface ConferenceFile  {
  _id: string;
  conference: string;
  awarded?: string;
  published?: string;
  collection?: string;
  isbn?: string;
}

export interface UploadFormDocument  {
  _id?: string;
  conference: string;
  awarded?: File;
  published?: File;
  collection?: File;
  isbn?: string;
}
