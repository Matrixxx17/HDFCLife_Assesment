import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminLoginPage from "../app/(auth)/admin/login/page";
import { useAuth } from "../components/auth-provider";
import { useToast } from "../components/toast";
import { useRouter } from "next/navigation";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

// Mock auth provider
const mockLogin = jest.fn();
jest.mock("../components/auth-provider", () => ({
  useAuth: jest.fn(),
}));

// Mock toast provider
const mockToast = jest.fn();
jest.mock("../components/toast", () => ({
  useToast: jest.fn(),
}));

// Mock theme provider
jest.mock("../components/theme-provider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: jest.fn(),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
}));

describe("Admin Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      user: null,
      loading: false,
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
  });

  it("renders the login form elements", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@insurance.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In to Console" })).toBeInTheDocument();
  });

  it("shows validation error messages when fields are empty", async () => {
    render(<AdminLoginPage />);
    
    const submitBtn = screen.getByRole("button", { name: "Sign In to Console" });
    fireEvent.click(submitBtn);

    // Schema validations are async in react-hook-form
    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    });
  });

  it("calls login and redirects to /admin on successful login", async () => {
    mockLogin.mockResolvedValueOnce();
    render(<AdminLoginPage />);

    const emailInput = screen.getByPlaceholderText("admin@insurance.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: "Sign In to Console" });

    fireEvent.change(emailInput, { target: { value: "admin@insurance.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@insurance.com", "password123", "Admin");
      expect(mockToast).toHaveBeenCalledWith("Logged in successfully as Admin.", "success", "Welcome Back");
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  it("shows error toast if login fails", async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: "Invalid email or password",
          },
        },
      },
    });
    render(<AdminLoginPage />);

    const emailInput = screen.getByPlaceholderText("admin@insurance.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: "Sign In to Console" });

    fireEvent.change(emailInput, { target: { value: "admin@insurance.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Invalid email or password", "error", "Login Failed");
    });
  });
});
