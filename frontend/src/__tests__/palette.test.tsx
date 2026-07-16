import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CommandPalette from "../components/command-palette";
import { useAuth } from "../components/auth-provider";

// Mock auth provider
const mockLogout = jest.fn();
jest.mock("../components/auth-provider", () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("Command Palette Component", () => {
  const mockClose = jest.fn();
  const mockTriggerAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders command items when isOpen is true", () => {
    render(
      <CommandPalette isOpen={true} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );

    expect(screen.getByPlaceholderText("Type a command or search action...")).toBeInTheDocument();
    expect(screen.getByText("Search Customer")).toBeInTheDocument();
    expect(screen.getByText("Register New Customer")).toBeInTheDocument();
    expect(screen.getByText("Issue Policy Contract")).toBeInTheDocument();
    expect(screen.getByText("Live Premium Calculator")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("filters command items based on search query input", () => {
    render(
      <CommandPalette isOpen={true} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );

    const input = screen.getByPlaceholderText("Type a command or search action...");
    fireEvent.change(input, { target: { value: "wizard" } }); // 'wizard' is in "Launch the multi-step policy issuance wizard."

    expect(screen.getByText("Issue Policy Contract")).toBeInTheDocument();
    expect(screen.queryByText("Search Customer")).not.toBeInTheDocument();
  });

  it("triggers onTriggerAction callback when a command item is clicked", () => {
    render(
      <CommandPalette isOpen={true} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );

    const calculatorCmd = screen.getByText("Live Premium Calculator");
    fireEvent.click(calculatorCmd);

    expect(mockTriggerAction).toHaveBeenCalledWith("calculator");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard navigation: ArrowDown, ArrowUp, and Enter", () => {
    render(
      <CommandPalette isOpen={true} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );

    // Initial selected index is 0 ("Search Customer")
    // Press ArrowDown to select index 1 ("Register New Customer")
    fireEvent.keyDown(window, { key: "ArrowDown" });
    // Press Enter to trigger the action
    fireEvent.keyDown(window, { key: "Enter" });

    expect(mockTriggerAction).toHaveBeenCalledWith("new-customer");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("calls logout when Sign Out is triggered", () => {
    render(
      <CommandPalette isOpen={true} onClose={mockClose} onTriggerAction={mockTriggerAction} />
    );

    const signOutCmd = screen.getByText("Sign Out");
    fireEvent.click(signOutCmd);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
