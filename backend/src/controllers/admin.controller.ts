import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AgentService } from "../services/agent.service";
import { AnalyticsService } from "../services/analytics.service";
import { AgentCreateSchema } from "shared";

export class AdminController {
  static async createAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const parseResult = AgentCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            field: parseResult.error.errors[0].path[0],
            message: parseResult.error.errors[0].message,
          },
        });
      }

      const agent = await AgentService.createAgent(parseResult.data);
      return res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async listAgents(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string; // Active or Inactive

      const result = await AgentService.listAgents(page, limit, status);
      return res.status(200).json({
        success: true,
        data: result.agents,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async getAgentProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const agentId = req.params.id;
      const profile = await AgentService.getAgentProfile(agentId);
      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async deactivateAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const agentId = req.params.id;
      const agent = await AgentService.deactivateAgent(agentId);
      return res.status(200).json({
        success: true,
        message: "Agent deactivated successfully.",
        data: agent,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics();
      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}
