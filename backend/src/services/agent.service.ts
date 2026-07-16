import bcrypt from "bcrypt";
import User from "../models/User";
import Customer from "../models/Customer";
import Policy from "../models/Policy";
import { AgentCreateInput } from "shared";

export class AgentService {
  static async createAgent(input: AgentCreateInput) {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new Error("An agent with this email address already exists.");
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const agent = new User({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role: "Agent",
      isActive: true,
    });

    await agent.save();

    const agentObj = agent.toObject();
    delete agentObj.password;
    return agentObj;
  }

  static async listAgents(page: number = 1, limit: number = 10, status?: string) {
    const query: any = { role: "Agent" };
    
    if (status === "Active") {
      query.isActive = true;
    } else if (status === "Inactive") {
      query.isActive = false;
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);
    const agents = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const customersCount = await Customer.countDocuments({ agentId: agent._id });
        const policiesCount = await Policy.countDocuments({ agentId: agent._id });
        return {
          ...agent.toObject(),
          customersCount,
          policiesCount,
        };
      })
    );

    return {
      agents: agentsWithCounts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getAgentProfile(agentId: string) {
    const agent = await User.findOne({ _id: agentId, role: "Agent" }).select("-password");
    if (!agent) {
      throw new Error("Agent not found.");
    }

    const customersCount = await Customer.countDocuments({ agentId });
    const policiesCount = await Policy.countDocuments({ agentId });

    return {
      agent,
      summary: {
        customersCount,
        policiesCount,
      },
    };
  }

  static async deactivateAgent(agentId: string) {
    const agent = await User.findOneAndUpdate(
      { _id: agentId, role: "Agent" },
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }
}
