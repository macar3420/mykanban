import express from "express";
import { getDbPool } from "../db.js";

const router = express.Router();

/**
 * Health check endpoint - returns 200 OK if the application is running
 * This endpoint does not check database connectivity
 */
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness check endpoint - returns 200 OK if the application is ready to handle traffic
 * This includes checking database connectivity
 */
router.get("/ready", async (_req, res) => {
  try {
    const db = getDbPool();
    // Simple query to check database connectivity
    await db.query("SELECT 1 as health_check");

    res.status(200).json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Database connection failed
    res.status(503).json({
      status: "not ready",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

