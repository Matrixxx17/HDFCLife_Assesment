import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";
import { LoginSchema } from "shared";

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, role } = req.body;

      const parseResult = LoginSchema.safeParse({ email, password });
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            field: parseResult.error.errors[0].path[0],
            message: parseResult.error.errors[0].message,
          },
        });
      }

      if (role !== "Admin" && role !== "Agent") {
        return res.status(400).json({
          success: false,
          error: { message: "Role must be 'Admin' or 'Agent'." },
        });
      }

      const { user, token } = await AuthService.login(parseResult.data, role);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  }
}
