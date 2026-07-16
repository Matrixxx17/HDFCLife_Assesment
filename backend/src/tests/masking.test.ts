import {
  maskAadhaar,
  maskPAN,
  maskMobile,
  serializeCustomer,
  serializePolicy,
} from "../utils/masking";

describe("PII Masking Utilities", () => {
  describe("maskAadhaar", () => {
    it("should mask 12-digit Aadhaar number correctly", () => {
      expect(maskAadhaar("123456789012")).toBe("XXXX-XXXX-9012");
    });

    it("should handle spaces or hyphens and mask correctly", () => {
      expect(maskAadhaar("1234-5678-9012")).toBe("XXXX-XXXX-9012");
      expect(maskAadhaar("1234 5678 9012")).toBe("XXXX-XXXX-9012");
    });

    it("should return empty string if input is falsy", () => {
      expect(maskAadhaar("")).toBe("");
    });

    it("should return original value if it is not 12 digits after cleaning", () => {
      expect(maskAadhaar("123456")).toBe("123456");
    });
  });

  describe("maskPAN", () => {
    it("should mask 10-character PAN correctly and convert to uppercase", () => {
      expect(maskPAN("ABCDE1234F")).toBe("ABCXX12XXF");
      expect(maskPAN("abcde1234f")).toBe("ABCXX12XXF");
    });

    it("should return empty string if input is falsy", () => {
      expect(maskPAN("")).toBe("");
    });

    it("should return original value if not 10 characters", () => {
      expect(maskPAN("ABC12")).toBe("ABC12");
    });
  });

  describe("maskMobile", () => {
    it("should mask 10-digit mobile number correctly", () => {
      expect(maskMobile("9876543210")).toBe("98XXXXXX10");
    });

    it("should return empty string if input is falsy", () => {
      expect(maskMobile("")).toBe("");
    });

    it("should return original value if not 10 digits", () => {
      expect(maskMobile("98765")).toBe("98765");
    });
  });

  describe("Serialization wrapper functions", () => {
    it("should serialize customer object by masking PII fields", () => {
      const customerObj = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        mobile: "9876543210",
        aadhaar: "123456789012",
        pan: "ABCDE1234F",
        nomineeName: "John Doe",
      };

      const result = serializeCustomer(customerObj);
      expect(result.aadhaar).toBe("XXXX-XXXX-9012");
      expect(result.pan).toBe("ABCXX12XXF");
      expect(result.mobile).toBe("98XXXXXX10");
      expect(result.fullName).toBe("Jane Doe"); // Unaffected field
    });

    it("should serialize policy and nested populated customer details", () => {
      const policyObj = {
        policyNumber: "POL-12345",
        premiumAmount: 12000,
        customerId: {
          fullName: "Jane Doe",
          mobile: "9876543210",
          aadhaar: "123456789012",
          pan: "ABCDE1234F",
        },
      };

      const result = serializePolicy(policyObj);
      expect(result.policyNumber).toBe("POL-12345");
      expect(result.customerId.aadhaar).toBe("XXXX-XXXX-9012");
      expect(result.customerId.pan).toBe("ABCXX12XXF");
      expect(result.customerId.mobile).toBe("98XXXXXX10");
    });
  });
});
