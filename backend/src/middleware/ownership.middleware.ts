import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import Customer from "../models/Customer";
import Policy from "../models/Policy";
import mongoose from "mongoose";

export async function checkCustomerOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const customerId = req.params.id || req.params.customerId || req.query.customerId;
  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: { message: "Customer ID is required for this operation." },
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: "Not authenticated" },
    });
  }

  if (req.user.role !== "Agent") {
    return res.status(403).json({
      success: false,
      error: { message: "Access forbidden: Only Agents can access customers." },
    });
  }

  if (!mongoose.Types.ObjectId.isValid(customerId as string)) {
    return res.status(400).json({
      success: false,
      error: { message: "Invalid Customer ID format." },
    });
  }

  try {
    const customer = await Customer.findOne({
      _id: customerId,
      agentId: req.user.id,
    });

    if (!customer) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Customer not found or does not belong to this agent.",
        },
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Internal server error during customer ownership validation." },
    });
  }
}

export async function checkPolicyOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const policyId = req.params.id;
  if (!policyId) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: "Not authenticated" },
    });
  }

  if (req.user.role !== "Agent") {
    return res.status(403).json({
      success: false,
      error: { message: "Access forbidden: Only Agents can access policies." },
    });
  }

  if (!mongoose.Types.ObjectId.isValid(policyId)) {
    return res.status(400).json({
      success: false,
      error: { message: "Invalid Policy ID format." },
    });
  }

  try {
    const policy = await Policy.findOne({
      _id: policyId,
      agentId: req.user.id,
    });

    if (!policy) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Policy not found or does not belong to this agent.",
        },
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Internal server error during policy ownership validation." },
    });
  }
}
