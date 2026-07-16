import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { PolicyService } from "../services/policy.service";
import { PolicyIssueSchema } from "shared";
import { serializePolicy, serializePolicies } from "../utils/masking";

export class PolicyController {
  static async issuePolicy(req: AuthenticatedRequest, res: Response) {
    try {
      const parseResult = PolicyIssueSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorDetail = parseResult.error.errors[0];
        return res.status(400).json({
          success: false,
          error: {
            field: errorDetail.path.join("."),
            message: errorDetail.message,
          },
        });
      }

      const agentId = req.user!.id;
      const policy = await PolicyService.issuePolicy(parseResult.data, agentId);

      return res.status(201).json({
        success: true,
        data: serializePolicy(policy),
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async getPoliciesByCustomerId(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.params.customerId;
      const agentId = req.user!.id;

      const policies = await PolicyService.getPoliciesByCustomerId(customerId, agentId);
      return res.status(200).json({
        success: true,
        data: serializePolicies(policies),
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}
