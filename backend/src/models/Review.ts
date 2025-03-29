import mongoose, { Schema, Document } from "mongoose";

export interface IReviewResponse {
  question: mongoose.Schema.Types.ObjectId;
  answer: string | number;
}

export interface IReview extends Document {
  paper: mongoose.Schema.Types.ObjectId;
  reviewer: mongoose.Schema.Types.ObjectId;
  responses: IReviewResponse[];
  comments: string;
  recommendation: "Publikovať" | "Publikovať so zmenami" | "Odmietnuť";
  created_at: Date;
  isDraft: boolean;
}

const ReviewSchema: Schema = new Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responses: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        answer: {
          type: Schema.Types.Mixed,
          required: function (this: any) {
            return !this.parent().isDraft;
          },
        },
      },
    ],
    comments: { type: String, required: false },
    recommendation: {
      type: String,
      enum: ["Publikovať", "Publikovať so zmenami", "Odmietnuť"],
      required: true,
    },
    created_at: { type: Date, default: Date.now },
    isDraft: { type: Boolean, default: true },
  },
  { collection: "reviews" },
);

export default mongoose.model<IReview>("Review", ReviewSchema);
