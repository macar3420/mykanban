import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

import app from "../src/app.js";
import * as dbModule from "../src/db.js";

describe("GET /health", () => {
  it("responds with 200 OK and status ok", async () => {
    const response = await request(app)
      .get("/health")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });
});

describe("GET /ready", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("responds with 200 OK when database is connected", async () => {
    // Mock successful database query
    const mockQuery = vi.fn().mockResolvedValue([[{ health_check: 1 }]]);
    vi.spyOn(dbModule, "getDbPool").mockReturnValue({
      query: mockQuery,
    });

    const response = await request(app)
      .get("/ready")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toHaveProperty("status", "ready");
    expect(response.body).toHaveProperty("database", "connected");
    expect(response.body).toHaveProperty("timestamp");
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1 as health_check");
  });

  it("responds with 503 when database connection fails", async () => {
    // Mock failed database query
    const mockQuery = vi.fn().mockRejectedValue(new Error("Connection failed"));
    vi.spyOn(dbModule, "getDbPool").mockReturnValue({
      query: mockQuery,
    });

    const response = await request(app)
      .get("/ready")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(503);

    expect(response.body).toHaveProperty("status", "not ready");
    expect(response.body).toHaveProperty("database", "disconnected");
    expect(response.body).toHaveProperty("error");
    expect(response.body).toHaveProperty("timestamp");
  });
});

