import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { CustomerService } from "../services/customer.service";
import { CustomerSchema } from "shared";
import { serializeCustomer, serializeCustomers } from "../utils/masking";

export class CustomerController {
  static async createCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const parseResult = CustomerSchema.safeParse(req.body);
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
      const customer = await CustomerService.createCustomer(parseResult.data, agentId);
      
      return res.status(201).json({
        success: true,
        data: serializeCustomer(customer),
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async searchCustomers(req: AuthenticatedRequest, res: Response) {
    try {
      const q = (req.query.q as string) || "";
      const agentId = req.user!.id;
      
      const customers = await CustomerService.searchCustomers(q, agentId);
      return res.status(200).json({
        success: true,
        data: serializeCustomers(customers),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async getCustomerById(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id;
      const agentId = req.user!.id;

      const customer = await CustomerService.getCustomerById(id, agentId);
      return res.status(200).json({
        success: true,
        data: serializeCustomer(customer),
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async updateCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id;
      const agentId = req.user!.id;

      const parseResult = CustomerSchema.safeParse(req.body);
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

      const customer = await CustomerService.updateCustomer(id, parseResult.data, agentId);
      return res.status(200).json({
        success: true,
        data: serializeCustomer(customer),
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}
