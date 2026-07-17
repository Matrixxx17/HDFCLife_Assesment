import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "./middleware/auth.middleware";
import { checkCustomerOwnership } from "./middleware/ownership.middleware";
import { AuthController } from "./controllers/auth.controller";
import { AdminController } from "./controllers/admin.controller";
import { CustomerController } from "./controllers/customer.controller";
import { PolicyController } from "./controllers/policy.controller";

const app = express();

const rawOrigins = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { message: "Too many login attempts. Please try again after 15 minutes." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

const authRouter = express.Router();
authRouter.post("/login", loginLimiter, AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", authMiddleware, AuthController.me);
app.use("/api/auth", authRouter);

const adminRouter = express.Router();
adminRouter.use(authMiddleware, requireRole("Admin"));
adminRouter.post("/agents", AdminController.createAgent);
adminRouter.get("/agents", AdminController.listAgents);
adminRouter.get("/agents/:id", AdminController.getAgentProfile);
adminRouter.delete("/agents/:id", AdminController.deactivateAgent);
adminRouter.get("/analytics", AdminController.getAnalytics);
app.use("/api/admin", adminRouter);

const customerRouter = express.Router();
customerRouter.use(authMiddleware, requireRole("Agent"));
customerRouter.post("/", CustomerController.createCustomer);
customerRouter.get("/search", CustomerController.searchCustomers);
customerRouter.get("/:id", checkCustomerOwnership, CustomerController.getCustomerById);
customerRouter.put("/:id", checkCustomerOwnership, CustomerController.updateCustomer);
app.use("/api/customers", customerRouter);

const policyRouter = express.Router();
policyRouter.use(authMiddleware, requireRole("Agent"));
policyRouter.post("/issue", PolicyController.issuePolicy);
policyRouter.get(
  "/customer/:customerId",
  checkCustomerOwnership,
  PolicyController.getPoliciesByCustomerId
);
app.use("/api/policies", policyRouter);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled express error:", err);
    return res.status(err.status || 500).json({
      success: false,
      error: {
        message: err.message || "An unexpected error occurred on the server.",
      },
    });
  }
);

export default app;
