import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";

let rows;
vi.mock("../src/db.js", () => ({
  getDbPool: () => ({
    query: async (sql, params = []) => {
      // implement tiny in-memory handler for SELECT/INSERT/UPDATE/DELETE used in tasks.js
      // return [rows] or [{ insertId }] etc.
      return [rows];
    },
  }),
}));

import app from "../src/app.js";

beforeEach(() => {
  rows = [
    {
      id: 1,
      title: "A",
      status: "todo",
      done: 0,
      createdAt: "",
      updatedAt: "",
    },
  ];
});

describe("Tasks API", () => {
  it("lists grouped tasks", async () => {
    const res = await request(app)
      .get("/api/v1/tasks?group=status")
      .expect(200);
    expect(res.body.todo.length).toBeGreaterThan(0);
  });

  it("creates a task", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .send({ title: "New", status: "todo" })
      .expect(201);
    expect(res.body.title).toBe("New");
  });

  it("updates a task", async () => {
    await request(app).put("/api/v1/tasks/1").send({ done: true }).expect(200);
  });

  it("deletes a task", async () => {
    await request(app).delete("/api/v1/tasks/1").expect(204);
  });
});
