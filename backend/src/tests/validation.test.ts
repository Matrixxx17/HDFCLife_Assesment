import { CustomerSchema, PolicyIssueSchema } from "shared";

describe("Business Rules & Zod Validations", () => {
  describe("Customer Validation Schema", () => {
    const validCustomerInput = {
      fullName: "John Doe",
      email: "john.doe@example.com",
      mobile: "9876543210",
      dob: "1990-05-15", // ~36 years old
      aadhaar: "123456789012",
      pan: "ABCDE1234F",
      nomineeName: "Mary Doe",
      nomineeRelation: "Spouse",
    };

    it("should pass for a fully valid customer input", () => {
      const result = CustomerSchema.safeParse(validCustomerInput);
      expect(result.success).toBe(true);
    });

    it("should fail if customer age is under 18", () => {
      // Calculate date for 17 years ago
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17);
      const dobStr = birthDate.toISOString().split("T")[0];

      const input = { ...validCustomerInput, dob: dobStr };
      const result = CustomerSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Customer age must be between 18 and 65 years");
      }
    });

    it("should fail if customer age is over 65", () => {
      // Calculate date for 66 years ago
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 66);
      const dobStr = birthDate.toISOString().split("T")[0];

      const input = { ...validCustomerInput, dob: dobStr };
      const result = CustomerSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Customer age must be between 18 and 65 years");
      }
    });

    it("should fail if mobile number is invalid", () => {
      // Starts with 5
      let result = CustomerSchema.safeParse({ ...validCustomerInput, mobile: "5876543210" });
      expect(result.success).toBe(false);

      // Less than 10 digits
      result = CustomerSchema.safeParse({ ...validCustomerInput, mobile: "98765432" });
      expect(result.success).toBe(false);
    });

    it("should fail if Aadhaar is not exactly 12 digits", () => {
      const result = CustomerSchema.safeParse({ ...validCustomerInput, aadhaar: "12345678901" });
      expect(result.success).toBe(false);
    });

    it("should fail if PAN is invalid format", () => {
      const result = CustomerSchema.safeParse({ ...validCustomerInput, pan: "ABCD12345F" });
      expect(result.success).toBe(false);
    });

    it("should pass if PAN is empty/optional", () => {
      const result1 = CustomerSchema.safeParse({ ...validCustomerInput, pan: "" });
      const result2 = CustomerSchema.safeParse({ ...validCustomerInput, pan: undefined });
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should fail if nominee is the same person as policyholder", () => {
      const result = CustomerSchema.safeParse({
        ...validCustomerInput,
        fullName: "John Doe",
        nomineeName: "John Doe",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Nominee cannot be the same person as the policyholder");
      }
    });
  });

  describe("Policy Validation Schema", () => {
    const validPolicyInput = {
      customerId: "507f1f77bcf86cd799439011",
      term: 15,
      premiumFrequency: "Yearly",
      premiumAmount: 15000,
      sumAssured: 200000,
      startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // tomorrow
    };

    it("should pass for a fully valid policy input", () => {
      const result = PolicyIssueSchema.safeParse(validPolicyInput);
      expect(result.success).toBe(true);
    });

    it("should fail if policy term is not in {10, 15, 20, 25, 30}", () => {
      const result = PolicyIssueSchema.safeParse({ ...validPolicyInput, term: 12 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Policy term must be 10, 15, 20, 25, or 30 years");
      }
    });

    it("should fail if premium frequency is invalid", () => {
      const result = PolicyIssueSchema.safeParse({ ...validPolicyInput, premiumFrequency: "Bi-Weekly" });
      expect(result.success).toBe(false);
    });

    it("should fail if premium is less than ₹5,000", () => {
      const result = PolicyIssueSchema.safeParse({ ...validPolicyInput, premiumAmount: 4999 });
      expect(result.success).toBe(false);
    });

    it("should fail if policy start date is in the past", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const dobStr = yesterday.toISOString().split("T")[0];

      const result = PolicyIssueSchema.safeParse({ ...validPolicyInput, startDate: dobStr });
      expect(result.success).toBe(false);
    });
  });
});
