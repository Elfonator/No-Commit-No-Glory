import mongoose, { Schema, Document } from "mongoose";
import { IRole } from "./Role";

export enum UserStatus {
  Pending = "Čakajúci",
  Active = "Aktívny",
  Suspended = "Pozastavený",
  Inactive = "Neaktívny",
}

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  university: string;
  role: string;
  created_at: Date;
  isVerified: boolean;
  status: UserStatus;
  verificationToken?: string | null;
  refreshToken?: string | null;
  faculty?: string;
  about?: string;
  avatar?: string;
}

const UserSchema: Schema = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    university: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.Inactive,
    },
    role: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, required: false },
    refreshToken: { type: String, required: false },
    faculty: { type: String, default: "" },
    about: { type: String, default: "" },
    avatar: { type: String, default: null },
  },
  { collection: "users" },
);

// Middleware to validate and set role name from the Role model
UserSchema.pre<IUser>("save", async function (next) {
  const RoleModel = mongoose.model<IRole>("Role");
  const role = await RoleModel.findOne({ name: this.role });
  if (!role) {
    throw new Error(`Role "${this.role}" does not exist`);
  }
  next();
});

export default mongoose.model<IUser>("User", UserSchema);
