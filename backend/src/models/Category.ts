import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  isActive: boolean;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { collection: "categories" },
);

export default mongoose.model<ICategory>("Category", CategorySchema);
