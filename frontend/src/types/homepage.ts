export interface Committee {
  _id: string;
  fullName: string;
  university: 'UKF' | 'UMB' | 'UCM';
}

export interface ProgramItem {
  _id: string;
  schedule: string;
  description: string;
}

export interface Program {
  fileLink: File | null;
  items: ProgramItem[];
}
