import Customer from "../models/Customer";
import { CustomerInput } from "shared";
import mongoose from "mongoose";

export class CustomerService {
  static async createCustomer(input: CustomerInput, agentId: string) {
    // Unique Aadhaar check
    const existingAadhaar = await Customer.findOne({ aadhaar: input.aadhaar });
    if (existingAadhaar) {
      throw new Error("A customer with this Aadhaar number already exists.");
    }

    // Unique PAN check
    if (input.pan) {
      const existingPan = await Customer.findOne({ pan: input.pan.toUpperCase() });
      if (existingPan) {
        throw new Error("A customer with this PAN already exists.");
      }
    }

    const customer = new Customer({
      ...input,
      dob: new Date(input.dob),
      pan: input.pan ? input.pan.toUpperCase() : null,
      agentId: new mongoose.Types.ObjectId(agentId),
    });

    return await customer.save();
  }

  static async searchCustomers(q: string, agentId: string) {
    const query: any = { agentId: new mongoose.Types.ObjectId(agentId) };
    
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [
        { fullName: regex },
        { email: regex },
        { mobile: regex },
        { aadhaar: regex },
        { pan: regex },
      ];
    }

    return await Customer.find(query).sort({ fullName: 1 });
  }

  static async getCustomerById(id: string, agentId: string) {
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(id),
      agentId: new mongoose.Types.ObjectId(agentId),
    });
    
    if (!customer) {
      throw new Error("Customer not found or access denied.");
    }
    return customer;
  }

  static async updateCustomer(id: string, input: CustomerInput, agentId: string) {
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(id),
      agentId: new mongoose.Types.ObjectId(agentId),
    });

    if (!customer) {
      throw new Error("Customer not found or access denied.");
    }

    // Unique Aadhaar check
    const existingAadhaar = await Customer.findOne({
      aadhaar: input.aadhaar,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });
    if (existingAadhaar) {
      throw new Error("Another customer with this Aadhaar number already exists.");
    }

    // Unique PAN check
    if (input.pan) {
      const existingPan = await Customer.findOne({
        pan: input.pan.toUpperCase(),
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (existingPan) {
        throw new Error("Another customer with this PAN already exists.");
      }
    }

    customer.fullName = input.fullName;
    customer.email = input.email;
    customer.mobile = input.mobile;
    customer.dob = new Date(input.dob);
    customer.aadhaar = input.aadhaar;
    customer.pan = input.pan ? input.pan.toUpperCase() : undefined;
    customer.nomineeName = input.nomineeName;
    customer.nomineeRelation = input.nomineeRelation;

    return await customer.save();
  }
}
