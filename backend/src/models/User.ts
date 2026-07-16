import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  role: "Admin" | "Agent";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true, 
      lowercase: true, 
      trim: true 
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin", "Agent"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
export default User;
