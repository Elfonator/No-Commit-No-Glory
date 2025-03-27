export interface Committee {
  _id: string;
  fullName: string;
  university: 'UKF' | 'UMB' | 'UCM';
}

export interface ProgramItem {
  schedule: string;
  description: string;
}

export interface Program {
  fileLink: File;
  items: ProgramItem[];
}
