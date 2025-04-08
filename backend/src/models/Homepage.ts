import mongoose, { Schema, Document } from 'mongoose';

interface IProgramItem {
  schedule: string;
  description: string;
}

interface IProgram {
  fileLink?: string;
  items: IProgramItem[];
}

interface ITemplate {
  word: string;
  latex: string;
}

interface ICommittee {
  fullName: string;
  university: string;
}

interface IConferenceFile {
  conference: string;
  awarded?: string;
  published?: string;
  collection?: string;
  isbn?: string;
}

export interface IHomepage extends Document {
  program: IProgram;
  templates: ITemplate;
  committees: ICommittee[];
  conferenceFiles: IConferenceFile[];
}

const HomepageSchema: Schema = new Schema({
  program: {
    fileLink: { type: String, required: false },
    items: [
      {
        schedule: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
  },
  templates: {
    word: { type: String, required: false },
    latex: { type: String, required: false },
  },
  committees: [
    {
      fullName: { type: String, required: true },
      university: { type: String, required: true },
    },
  ],
  conferenceFiles: [
    {
      conference: { type: String, required: true },
      isbn: { type: String, required: false },
      awarded: { type: String, required: false },
      published: { type: String, required: false },
      collection: { type: String, required: false },
    },
  ],
},
  { collection: "homepages" },

);

export default mongoose.model<IHomepage>('Homepage', HomepageSchema);