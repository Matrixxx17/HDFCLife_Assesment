import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/insurance-policy-system";

async function seed() {
  try {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Clear existing seed users if they exist
    console.log("Clearing existing seed users...");
    await User.deleteMany({
      email: {
        $in: ["admin@insurance.com", "agent1@insurance.com", "agent2@insurance.com"],
      },
    });

    console.log("Seeding database...");

    const adminPasswordHash = await bcrypt.hash("admin123", 12);
    const agentPasswordHash = await bcrypt.hash("agent123", 12);

    const admin = new User({
      fullName: "System Admin",
      email: "admin@insurance.com",
      password: adminPasswordHash,
      role: "Admin",
      isActive: true,
    });

    const agent1 = new User({
      fullName: "Agent Alice",
      email: "agent1@insurance.com",
      password: agentPasswordHash,
      role: "Agent",
      isActive: true,
    });

    const agent2 = new User({
      fullName: "Agent Bob",
      email: "agent2@insurance.com",
      password: agentPasswordHash,
      role: "Agent",
      isActive: true,
    });

    await admin.save();
    await agent1.save();
    await agent2.save();

    console.log("Database seeded successfully!");
    console.log("-----------------------------------------");
    console.log("Credentials:");
    console.log("Admin:   admin@insurance.com / admin123");
    console.log("Agent 1: agent1@insurance.com / agent123");
    console.log("Agent 2: agent2@insurance.com / agent123");
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
}

seed();
