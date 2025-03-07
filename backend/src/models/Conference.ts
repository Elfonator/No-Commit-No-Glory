import mongoose, { Schema, Document } from "mongoose";

export enum ConferenceStatus {
  Upcoming = "Nadchádzajúca",
  Ongoing = "Aktuálna",
  Completed = "Ukončená",
  Canceled = "Zrušená",
}

export interface IConference extends Document {
  year: number;
  location: string;
  university: string;
  date: Date;
  status: ConferenceStatus;
  start_date: Date;
  end_date: Date;
  deadline_submission: Date;
  submission_confirmation: Date;
  deadline_review: Date;
  deadline_correction: Date;
  created_at: Date;
}

const ConferenceSchema: Schema = new Schema(
  {
    year: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => {
          //Validate that the year is a four-digit number between 2010 and the current year
          const currentYear = new Date().getFullYear();
          return value >= 2010 && value <= currentYear + 5;
        },
        message: "Year must be a valid four-digit year.",
      },
    },
    location: { type: String, required: true },
    university: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(ConferenceStatus),
      default: ConferenceStatus.Upcoming,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    deadline_submission: { type: Date, required: true },
    submission_confirmation: { type: Date, required: false },
    deadline_review: { type: Date, required: false },
    deadline_correction: { type: Date, required: false },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "conferences" },
);

export default mongoose.model<IConference>("Conference", ConferenceSchema);
