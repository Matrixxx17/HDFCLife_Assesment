import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentDashboard from "../app/(dashboard)/agent/page";
import { useAuth } from "../components/auth-provider";
import { useToast } from "../components/toast";
import { useTheme } from "../components/theme-provider";
import { useQuery } from "@tanstack/react-query";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth provider
jest.mock("../components/auth-provider", () => ({
  useAuth: jest.fn(),
}));

// Mock toast provider
jest.mock("../components/toast", () => ({
  useToast: jest.fn(),
}));

// Mock theme provider
jest.mock("../components/theme-provider", () => ({
  useTheme: jest.fn(),
}));

// Mock useQuery
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock subcomponents
jest.mock("../components/policy-wizard", () => {
  return function DummyPolicyWizard() {
    return <div data-testid="policy-wizard">Policy Wizard Mock</div>;
  };
});

jest.mock("../components/command-palette", () => {
  return function DummyCommandPalette() {
    return <div data-testid="command-palette">Command Palette Mock</div>;
  };
});

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock confirm dialog
global.confirm = jest.fn().mockReturnValue(true);

describe("Live Premium Calculator Widget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "agent1", fullName: "Sales Agent", email: "agent@test.com", role: "Agent" },
      loading: false,
      logout: jest.fn(),
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: jest.fn(),
    });
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      toggleTheme: jest.fn(),
    });
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("calculates and displays estimated total premium quote", () => {
    const { calculatePremium, calculateAge } = require("shared");
    console.log("DEBUG IN TEST SUITE - calculateAge:", calculateAge("1995-01-01"));
    console.log("DEBUG IN TEST SUITE - calculatePremium:", calculatePremium(200000, 15, "Yearly", "1995-01-01"));

    render(<AgentDashboard />);

    // Default calculations:
    // sumAssured = 200,000
    // term = 15
    // frequency = "Yearly"
    // dob = "1995-01-01" (Age in 2026: 31)
    // baseAnnualRate = 0.012 -> annualBasePremium = 2400
    // ageMultiplier = 1 + (31 - 18) * 0.02 = 1.26
    // termDiscount = (15 - 10) * 0.01 = 0.05 -> termMultiplier = 0.95
    // adjustedAnnualPremium = 2400 * 1.26 * 0.95 = 2872.8
    // frequencyPremium = 2873 (rounded)
    // gstAmount = 2873 * 0.18 = 517.14 -> 517
    // totalPremium = 2873 + 517 = 3390 (rounded)

    // Check if the estimated quote is rendered
    expect(screen.getByText("₹5,900")).toBeInTheDocument();
  });

  it("updates quote display when sum assured input changes", () => {
    render(<AgentDashboard />);

    const slider = screen.getByRole("slider");
    // Change sum assured to 500,000
    fireEvent.change(slider, { target: { value: "500000" } });

    // math:
    // annualBasePremium = 6000
    // adjustedAnnualPremium = 6000 * 1.26 * 0.95 = 7182
    // gstAmount = 7182 * 0.18 = 1292.76 -> 1293
    // totalPremium = 7182 + 1293 = 8475
    expect(screen.getByText("₹8,475")).toBeInTheDocument();
  });

  it("updates quote display when premium frequency changes", () => {
    render(<AgentDashboard />);

    // Change frequency to Monthly
    const monthlyBtn = screen.getByRole("button", { name: "Monthly" });
    fireEvent.click(monthlyBtn);

    // Monthly math:
    // adjustedAnnualPremium = 2872.8
    // divisions = 12
    // frequencyFactor = 0.09
    // rawFrequencyPremium = 2872.8 * 0.09 = 258.552
    // minimum check scaled: Math.max(5000/12, 258.552) = Math.max(416.67, 258.552) = 416.67
    // finalFrequencyPremium = 417 (rounded)
    // gst = 417 * 0.18 = 75.06 -> 75
    // total = 417 + 75 = 492
    expect(screen.getByText("₹492")).toBeInTheDocument();
  });

  it("updates quote display when policy term changes", () => {
    render(<AgentDashboard />);

    // Change term to 30 years
    const term30Btn = screen.getByRole("button", { name: "30Y" });
    fireEvent.click(term30Btn);

    // 30Y math:
    // termDiscount = Math.min(0.2, (30-10)*0.01) = 0.20 -> termMultiplier = 0.8
    // adjustedAnnualPremium = 2400 * 1.26 * 0.8 = 2419.2
    // Minimum annual premium of 5000 is applied: Math.max(5000, 2419.2) = 5000
    // gst = 5000 * 0.18 = 900
    // total = 5000 + 900 = 5900
    expect(screen.getByText("₹5,900")).toBeInTheDocument();
  });
});
