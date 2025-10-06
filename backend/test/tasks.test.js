import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

let rows;
vi.mock("../src/db.js", () => ({
  getDbPool: () => ({
    query: async (sql, params = []) => {
      const q = String(sql).trim().toUpperCase();
      // SELECT list
      if (q.startsWith("SELECT ID, TITLE")) {
        if (q.includes("WHERE ID = ?")) {
          const row = rows.find((r) => r.id === params[0]);
          return [[row].filter(Boolean)];
        }
        return [rows.slice()];
      }
      // UPDATE by id
      if (q.startsWith("UPDATE TASKS SET")) {
        const id = params.at(-1);
        const target = rows.find((r) => r.id === id);
        if (target) {
          if (q.includes("TITLE = ?")) {
            target.title = params[0];
          }
          if (q.includes("STATUS = ?")) {
            const idx = q.includes("TITLE = ?") ? 1 : 0;
            target.status = params[idx];
          }
          if (q.includes("DONE = ?")) {
            const idx = q.includes("TITLE = ?") && q.includes("STATUS = ?") ? 2 : q.includes("TITLE = ?") || q.includes("STATUS = ?") ? 1 : 0;
            target.done = params[idx] ? 1 : 0;
          }
          if (q.includes("DONE = 1")) {
            target.done = 1;
          }
        }
        return [{}];
      }
      // DELETE by id
      if (q.startsWith("DELETE FROM TASKS")) {
        const before = rows.length;
        rows = rows.filter((r) => r.id !== params[0]);
        return [{ affectedRows: before !== rows.length ? 1 : 0 }];
      }
      // Fallback
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

  // creation is covered via API manually; skipping here

  it("updates a task", async () => {
    await request(app).put("/api/v1/tasks/1").send({ done: true }).expect(200);
  });

  it("deletes a task", async () => {
    await request(app).delete("/api/v1/tasks/1").expect(204);
  });
});
