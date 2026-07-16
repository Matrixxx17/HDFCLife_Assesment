import React from "react";
import { render } from "@testing-library/react";
import { calculateAge, calculatePremium } from "shared";

describe("Debug Premium Calculations", () => {
  it("logs values for default parameters", () => {
    const dob = "1995-01-01";
    const sumAssured = 200000;
    const term = 15;
    const frequency = "Yearly";

    const age = calculateAge(dob);
    const quote = calculatePremium(sumAssured, term, frequency, dob);

    console.log("DEBUG: Current Date is:", new Date().toISOString());
    console.log("DEBUG: DOB:", dob);
    console.log("DEBUG: Calculated Age:", age);
    console.log("DEBUG: Quote:", quote);
  });
});
