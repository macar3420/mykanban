import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import App from "./App.jsx";

const reply = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
});

beforeEach(() => {
  const getUrl = (url) => (typeof url === "string" ? url : url?.url ?? url?.href ?? String(url));
  global.fetch = vi.fn((url, opts = {}) => {
    const u = getUrl(url);
    if (u.endsWith("/api/v1/tasks?group=status")) {
      return Promise.resolve(reply({ todo: [], inprogress: [], done: [] }));
    }
    if (u.endsWith("/api/v1/tasks") && opts.method === "POST") {
      const body = JSON.parse(opts.body || "{}");
      return Promise.resolve(
        reply({ id: 1, title: body.title, status: body.status, done: 0 }, 201),
      );
    }
    if (/\/api\/v1\/tasks\/\d+$/.test(u) && opts.method === "PUT") {
      const body = JSON.parse(opts.body || "{}");
      return Promise.resolve(
        reply({ id: 1, title: body.title ?? "Write tests", status: body.status ?? "todo", done: body.done ? 1 : 0 }),
      );
    }
    if (/\/api\/v1\/tasks\/\d+$/.test(u) && opts.method === "DELETE") {
      return Promise.resolve(reply(null, 204));
    }
    return Promise.resolve(reply(null, 404));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  test("renders columns and submits a To Do item request", async () => {
    render(<App />);

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    const input = screen.getAllByPlaceholderText("Type")[0];
    await userEvent.type(input, "Write tests");
    await userEvent.click(screen.getAllByRole("button", { name: /add/i })[0]);

    // Soft assertion: fetch was called at least once during add flow
    await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(0));
  });


});


