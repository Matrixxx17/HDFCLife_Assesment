import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_123456789";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "Admin" | "Agent";
    fullName: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: "No token provided, authorization denied." },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName || "",
    };

    // Sliding window token refresh
    // If the token has less than 5 minutes left, issue a new one
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - now;

    if (timeRemaining > 0 && timeRemaining < 300) {
      // 5 minutes = 300 seconds
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role, fullName: decoded.fullName },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", newToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax", // "none" required for cross-domain (Vercel <-> Render)
        maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
      });
    }

    next();
  } catch (error) {
    res.clearCookie("token");
    return res.status(401).json({
      success: false,
      error: { message: "Token is invalid or expired." },
    });
  }
}

export function requireRole(role: "Admin" | "Agent") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: { message: `Access denied. Requires ${role} role.` },
      });
    }

    next();
  };
}
