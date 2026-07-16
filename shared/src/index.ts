import { z } from "zod";

// --- HELPERS ---

export function calculateAge(dob: string | Date): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isStartDateValid(startDate: string | Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start >= today;
}

// PAN validation regex: 5 uppercase letters, 4 digits, 1 uppercase letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Aadhaar: exactly 12 digits
export const AADHAAR_REGEX = /^[0-9]{12}$/;
// Mobile: exactly 10 digits, starts with 6, 7, 8, or 9
export const MOBILE_REGEX = /^[6-9][0-9]{9}$/;

// --- SCHEMAS ---

// Auth login schema
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Admin agent creation schema
export const AgentCreateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Customer schemas
export const CustomerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    mobile: z.string().regex(MOBILE_REGEX, "Mobile number must be exactly 10 digits and start with 6/7/8/9"),
    dob: z.string().refine((val) => {
      const age = calculateAge(val);
      return age >= 18 && age <= 65;
    }, "Customer age must be between 18 and 65 years"),
    aadhaar: z.string().regex(AADHAAR_REGEX, "Aadhaar number must be exactly 12 digits"),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .or(z.literal(""))
      .refine((val) => {
        if (!val) return true;
        return PAN_REGEX.test(val);
      }, "Invalid PAN format (expected ABCDE1234F)"),
    nomineeName: z.string().trim().min(2, "Nominee name is mandatory"),
    nomineeRelation: z.string().trim().min(2, "Nominee relation is mandatory"),
  })
  .refine((data) => {
    return data.fullName.toLowerCase() !== data.nomineeName.toLowerCase();
  }, {
    message: "Nominee cannot be the same person as the policyholder",
    path: ["nomineeName"],
  });

// Policy issue schema
export const PolicyIssueSchema = z
  .object({
    customerId: z.string().min(1, "Customer ID is required"),
    term: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(25), z.literal(30)], {
      errorMap: () => ({ message: "Policy term must be 10, 15, 20, 25, or 30 years" }),
    }),
    premiumFrequency: z.enum(["Monthly", "Quarterly", "Half-Yearly", "Yearly"], {
      errorMap: () => ({ message: "Premium frequency must be Monthly, Quarterly, Half-Yearly, or Yearly" }),
    }),
    premiumAmount: z.number().min(5000, "Minimum premium is ₹5,000"),
    sumAssured: z.number().min(50000, "Minimum Sum Assured is ₹50,000"),
    startDate: z.string().refine((val) => {
      return isStartDateValid(val);
    }, "Policy start date cannot be in the past"),
  });

// --- TYPES ---

export type LoginInput = z.infer<typeof LoginSchema>;
export type AgentCreateInput = z.infer<typeof AgentCreateSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type PolicyIssueInput = z.infer<typeof PolicyIssueSchema>;

// --- PREMIUM CALCULATOR LOGIC ---

export interface PremiumCalculationResult {
  basePremium: number;
  ageLoad: number;
  termDiscount: number;
  frequencyPremium: number;
  gstAmount: number;
  totalPremium: number;
}

export function calculatePremium(
  sumAssured: number,
  term: number,
  frequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly",
  dob: string | Date
): PremiumCalculationResult {
  const age = calculateAge(dob);

  // Base rate is 1.2% of Sum Assured divided by term (annual base)
  const baseAnnualRate = 0.012;
  const annualBasePremium = (sumAssured * baseAnnualRate);

  // Age load: +2% for every year above 18
  const ageMultiplier = 1 + Math.max(0, age - 18) * 0.02;
  
  // Term discount: longer terms get minor annual discounts
  // 10 years -> 0% discount
  // 15 years -> 5% discount
  // 20 years -> 10% discount
  // 25 years -> 15% discount
  // 30 years -> 20% discount
  const termDiscountRate = Math.min(0.2, (term - 10) * 0.01);
  const termMultiplier = 1 - termDiscountRate;

  const adjustedAnnualPremium = annualBasePremium * ageMultiplier * termMultiplier;

  // Frequency factors (adjusted for operational cost overheads)
  let frequencyFactor = 1.0;
  let divisions = 1;
  switch (frequency) {
    case "Yearly":
      frequencyFactor = 1.0;
      divisions = 1;
      break;
    case "Half-Yearly":
      frequencyFactor = 0.51; // slightly higher than 0.5
      divisions = 2;
      break;
    case "Quarterly":
      frequencyFactor = 0.26; // slightly higher than 0.25
      divisions = 4;
      break;
    case "Monthly":
      frequencyFactor = 0.09; // slightly higher than 1/12 (0.0833)
      divisions = 12;
      break;
  }

  // This is the premium per installment
  const rawFrequencyPremium = adjustedAnnualPremium * frequencyFactor;
  const finalFrequencyPremium = Math.max(5000 / divisions, rawFrequencyPremium); // minimum check scaled

  const gstRate = 0.18; // 18% GST standard
  const gstAmount = finalFrequencyPremium * gstRate;
  const totalPremium = finalFrequencyPremium + gstAmount;

  return {
    basePremium: Math.round(adjustedAnnualPremium / divisions),
    ageLoad: Math.round((ageMultiplier - 1) * 100),
    termDiscount: Math.round(termDiscountRate * 100),
    frequencyPremium: Math.round(finalFrequencyPremium),
    gstAmount: Math.round(gstAmount),
    totalPremium: Math.round(totalPremium),
  };
}
