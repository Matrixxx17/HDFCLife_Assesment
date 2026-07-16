import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";
import app from "../app";
import User from "../models/User";
import Customer from "../models/Customer";
import Policy from "../models/Policy";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_123456789";

describe("Backend Integration Tests (RBAC, Ownership, Business Rules)", () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let agentAToken: string;
  let agentBToken: string;
  let agentAId: string;
  let agentBId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear models
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Policy.deleteMany({});

    // Create Admin
    const adminHash = await bcrypt.hash("admin123", 12);
    const admin = await User.create({
      fullName: "Admin User",
      email: "admin@insurance.com",
      password: adminHash,
      role: "Admin",
      isActive: true,
    });
    adminToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create Agent A
    const agentHash = await bcrypt.hash("agent123", 12);
    const agentA = await User.create({
      fullName: "Agent Alice",
      email: "agentA@insurance.com",
      password: agentHash,
      role: "Agent",
      isActive: true,
    });
    agentAId = agentA._id.toString();
    agentAToken = jwt.sign(
      { id: agentA._id, email: agentA.email, role: agentA.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create Agent B
    const agentB = await User.create({
      fullName: "Agent Bob",
      email: "agentB@insurance.com",
      password: agentHash,
      role: "Agent",
      isActive: true,
    });
    agentBId = agentB._id.toString();
    agentBToken = jwt.sign(
      { id: agentB._id, email: agentB.email, role: agentB.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
  });

  describe("RBAC (Role Based Access Control)", () => {
    it("should block Admin from accessing customer routes", async () => {
      const response = await supertest(app)
        .get("/api/customers/search")
        .set("Cookie", [`token=${adminToken}`]);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Requires Agent role");
    });

    it("should block Agent from accessing Admin agent creation route", async () => {
      const response = await supertest(app)
        .post("/api/admin/agents")
        .set("Cookie", [`token=${agentAToken}`])
        .send({
          fullName: "New Agent",
          email: "new@insurance.com",
          password: "password123",
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Requires Admin role");
    });
  });

  describe("Ownership Isolation", () => {
    it("should prevent Agent B from fetching Agent A's customer details", async () => {
      // 1. Agent A creates customer
      const customer = await Customer.create({
        fullName: "Agent A Customer",
        email: "cust.a@test.com",
        mobile: "9876543210",
        dob: new Date("1990-01-01"),
        aadhaar: "111122223333",
        pan: "ABCDE1111F",
        nomineeName: "John Nominee",
        nomineeRelation: "Brother",
        agentId: new mongoose.Types.ObjectId(agentAId),
      });

      // 2. Agent B tries to fetch this customer
      const response = await supertest(app)
        .get(`/api/customers/${customer._id}`)
        .set("Cookie", [`token=${agentBToken}`]);

      // Must return 403 Forbidden
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Access denied. Customer not found or does not belong to this agent.");
    });
  });

  describe("Business Rules & Custom Checks", () => {
    it("should block issuing policy with premium > 50,000 if customer has NO PAN", async () => {
      // 1. Create a customer with no PAN (set to null or empty)
      const customer = await Customer.create({
        fullName: "No Pan Customer",
        email: "nopan@test.com",
        mobile: "9876543210",
        dob: new Date("1990-01-01"),
        aadhaar: "222233334444",
        pan: "", // no PAN
        nomineeName: "Bill Nominee",
        nomineeRelation: "Spouse",
        agentId: new mongoose.Types.ObjectId(agentAId),
      });

      // 2. Try to issue a policy with premium ₹60,000 (> ₹50,000)
      const policyResponse = await supertest(app)
        .post("/api/policies/issue")
        .set("Cookie", [`token=${agentAToken}`])
        .send({
          customerId: customer._id.toString(),
          term: 15,
          premiumFrequency: "Yearly",
          premiumAmount: 60000,
          sumAssured: 1000000,
          startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        });

      expect(policyResponse.status).toBe(400);
      expect(policyResponse.body.success).toBe(false);
      expect(policyResponse.body.error.message).toContain("PAN is mandatory for policy premiums exceeding ₹50,000");
    });

    it("should successfully issue policy with premium > 50,000 if customer HAS PAN", async () => {
      // 1. Create a customer WITH PAN
      const customer = await Customer.create({
        fullName: "Has Pan Customer",
        email: "haspan@test.com",
        mobile: "9876543210",
        dob: new Date("1990-01-01"),
        aadhaar: "222233334444",
        pan: "ABCDE1234F",
        nomineeName: "Bill Nominee",
        nomineeRelation: "Spouse",
        agentId: new mongoose.Types.ObjectId(agentAId),
      });

      // 2. Issue a policy with premium ₹60,000 (> ₹50,000)
      const policyResponse = await supertest(app)
        .post("/api/policies/issue")
        .set("Cookie", [`token=${agentAToken}`])
        .send({
          customerId: customer._id.toString(),
          term: 15,
          premiumFrequency: "Yearly",
          premiumAmount: 60000,
          sumAssured: 1000000,
          startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        });

      expect(policyResponse.status).toBe(201);
      expect(policyResponse.body.success).toBe(true);
      expect(policyResponse.body.data.policyNumber).toBeDefined();
    });
  });
});
