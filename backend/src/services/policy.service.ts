import Policy from "../models/Policy";
import Customer from "../models/Customer";
import { PolicyIssueInput } from "shared";
import mongoose from "mongoose";

export class PolicyService {
  static async issuePolicy(input: PolicyIssueInput, agentId: string) {
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(input.customerId),
      agentId: new mongoose.Types.ObjectId(agentId),
    });

    if (!customer) {
      throw new Error("Customer not found or access denied.");
    }

    // Business Rule: PAN is mandatory if premium > ₹50,000
    if (input.premiumAmount > 50000) {
      if (!customer.pan) {
        throw new Error("PAN is mandatory for policy premiums exceeding ₹50,000. Please update customer profile with a valid PAN first.");
      }
    }

    const policyNumber = `POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const policy = new Policy({
      ...input,
      policyNumber,
      customerId: new mongoose.Types.ObjectId(input.customerId),
      agentId: new mongoose.Types.ObjectId(agentId),
      startDate: new Date(input.startDate),
    });

    return await policy.save();
  }

  static async getPoliciesByCustomerId(customerId: string, agentId: string) {
    // Verify customer belongs to the agent
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      agentId: new mongoose.Types.ObjectId(agentId),
    });

    if (!customer) {
      throw new Error("Customer not found or access denied.");
    }

    return await Policy.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      agentId: new mongoose.Types.ObjectId(agentId),
    }).sort({ createdAt: -1 });
  }
}
