import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import App from "./App.jsx";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, variants, initial, animate, ...props }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    h1: ({ children, className, variants, initial, animate, ...props }) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({ children, className, variants, initial, animate, ...props }) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock the API calls for authentication
const mockUser = {
  id: 1,
  displayName: "Test User",
  email: "test@example.com",
};

const reply = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
});

beforeEach(() => {
  const getUrl = (url) =>
    typeof url === "string" ? url : (url?.url ?? url?.href ?? String(url));
  global.fetch = vi.fn((url, opts = {}) => {
    const u = getUrl(url);

    // Mock authentication endpoints
    if (u.includes("/api/v1/auth/me")) {
      return Promise.resolve(reply(mockUser));
    }
    if (u.includes("/api/v1/auth/login") && opts.method === "POST") {
      return Promise.resolve(reply(mockUser));
    }
    if (u.includes("/api/v1/auth/signup") && opts.method === "POST") {
      return Promise.resolve(reply(mockUser));
    }

    // Mock teams endpoint
    if (
      u.includes("/api/v1/teams") &&
      (!opts.method || opts.method === "GET")
    ) {
      return Promise.resolve(reply([]));
    }

    // Mock task endpoints
    if (u.includes("/api/v1/tasks?group=status")) {
      return Promise.resolve(reply({ todo: [], inprogress: [], done: [] }));
    }
    if (u.includes("/api/v1/tasks") && opts.method === "POST") {
      const body = JSON.parse(opts.body || "{}");
      return Promise.resolve(
        reply({ id: 1, title: body.title, status: body.status, done: 0 }, 201),
      );
    }
    if (/\/v1\/tasks\/\d+$/.test(u) && opts.method === "PUT") {
      const body = JSON.parse(opts.body || "{}");
      return Promise.resolve(
        reply({
          id: 1,
          title: body.title ?? "Write tests",
          status: body.status ?? "todo",
          done: body.done ? 1 : 0,
        }),
      );
    }
    if (/\/v1\/tasks\/\d+$/.test(u) && opts.method === "DELETE") {
      return Promise.resolve(reply(null, 204));
    }
    return Promise.resolve(reply(null, 404));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  test("renders authentication form when user is not logged in", () => {
    render(<App />);

    // Check for authentication elements
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to access your boards"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Email or username"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  test("renders task board when user is logged in", async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve(reply(mockUser));
      }
      if (url.includes("/api/v1/tasks?group=status")) {
        return Promise.resolve(reply({ todo: [], inprogress: [], done: [] }));
      }
      if (url.includes("/api/v1/teams")) {
        return Promise.resolve(reply([]));
      }
      return Promise.resolve(reply(null, 404));
    });

    render(<App />);

    // Wait for authentication to complete and task board to render
    await waitFor(() => {
      expect(screen.getByText("To Do")).toBeInTheDocument();
    });

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Signed in as Test User")).toBeInTheDocument();
  });

  test("renders auth welcome header on login page", () => {
    render(<App />);

    // Check for the welcome animation text
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to access your boards"),
    ).toBeInTheDocument();
  });

  test("shows authentication form elements", () => {
    render(<App />);

    // Check authentication form elements
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Email or username"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create an account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeInTheDocument();
  });
});
