import mongoose, { Schema, Document } from "mongoose";
import { IUser } from './User'

export enum PaperStatus {
  Draft = "Draft",
  Submitted = "Odovzdaná",
  UnderReview = "Posudzovanie",
  Accepted = "Prijatá",
  AcceptedWithChanges = "Prijatá_so_zmenami",
  Rejected = "Odmietnutá",
}

export interface IPaper extends Document {
  title: string;
  status: PaperStatus;
  submission_date: Date;
  user: mongoose.Schema.Types.ObjectId;
  category: mongoose.Schema.Types.ObjectId;
  conference: mongoose.Schema.Types.ObjectId;
  abstract: string;
  keywords: string[];
  authors: { firstName: string; lastName: string }[];
  file_link: string;
  isFinal: boolean;
  deadline_date: Date;
  reviewer: mongoose.Schema.Types.ObjectId | IUser;
  review: mongoose.Types.ObjectId;
}

const PaperSchema: Schema = new Schema({
  title: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: Object.values(PaperStatus),
    default: PaperStatus.Draft,
  },
  submission_date: { type: Date, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  conference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conference",
    required: true,
  },
  abstract: { type: String, required: false },
  keywords: { type: [String], required: false },
  authors: [
    {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
    },
  ],
  file_link: { type: String, required: false },
  isFinal: { type: Boolean, default: false },
  deadline_date: { type: Date, required: false },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  review: { type: Schema.Types.ObjectId, ref: "Review", required: false  },
  awarded: { type: Boolean, default: false },
});

export default mongoose.model<IPaper>("Paper", PaperSchema);
