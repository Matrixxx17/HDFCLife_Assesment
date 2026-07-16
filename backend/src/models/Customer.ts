import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  fullName: string;
  email: string;
  mobile: string;
  dob: Date;
  aadhaar: string;
  pan?: string;
  nomineeName: string;
  nomineeRelation: string;
  agentId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    aadhaar: { type: String, required: true, unique: true, index: true, trim: true },
    pan: { type: String, default: null, trim: true },
    nomineeName: { type: String, required: true, trim: true },
    nomineeRelation: { type: String, required: true, trim: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Unique index on PAN, only enforced when PAN is not null/empty string
CustomerSchema.index(
  { pan: 1 },
  {
    unique: true,
    partialFilterExpression: {
      pan: { $type: "string", $ne: "" },
    },
  }
);

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
