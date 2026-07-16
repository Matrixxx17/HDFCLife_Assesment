import mongoose, { Schema, Document } from "mongoose";

export interface IPolicy extends Document {
  policyNumber: string;
  customerId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  term: number;
  premiumFrequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
  premiumAmount: number;
  sumAssured: number;
  startDate: Date;
  status: "Issued";
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    policyNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    term: { type: Number, enum: [10, 15, 20, 25, 30], required: true },
    premiumFrequency: { 
      type: String, 
      enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly"], 
      required: true 
    },
    premiumAmount: { type: Number, required: true, min: 5000 },
    sumAssured: { type: Number, required: true, min: 50000 },
    startDate: { type: Date, required: true },
    status: { type: String, enum: ["Issued"], default: "Issued" },
  },
  { timestamps: true }
);

export const Policy = mongoose.model<IPolicy>("Policy", PolicySchema);
export default Policy;
