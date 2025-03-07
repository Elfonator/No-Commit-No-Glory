import mongoose, { Schema, Document } from 'mongoose';

interface IProgramItem {
  schedule: string;
  description: string;
}

interface IProgram {
  fileLink: string;
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
  name: string;
  conference: mongoose.Schema.Types.ObjectId;
  awarded: string;
  submitted: string;
  works: string;
}

export interface IHomepage extends Document {
  program: IProgram[];
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
      name: { type: String, default: "ŠVK" },
      conference: { type: Schema.Types.ObjectId, ref: 'Conference', required: false },
      awarded: { type: String, required: false },
      submitted: { type: String, required: false },
      works: { type: String, required: false },
    },
  ],
},
  { collection: "homepages" },

);

export default mongoose.model<IHomepage>('Homepage', HomepageSchema);