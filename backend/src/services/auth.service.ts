import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { LoginInput } from "shared";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_123456789";

export class AuthService {
  static async login(input: LoginInput, expectedRole: "Admin" | "Agent") {
    const user = await User.findOne({ email: input.email.toLowerCase() });
    
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.role !== expectedRole) {
      throw new Error(`Unauthorized. This login is for ${expectedRole}s only.`);
    }

    if (!user.isActive) {
      throw new Error("Account has been deactivated. Please contact support.");
    }

    const isMatch = await bcrypt.compare(input.password, user.password || "");
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }
}
