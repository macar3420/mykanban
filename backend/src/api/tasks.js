import express from "express";
import { getDbPool } from "../db.js";

const router = express.Router();

// GET /api/v1/tasks?group=status
router.get("/", async (req, res, next) => {
  try {
    const db = getDbPool();
    const [rows] = await db.query(
      "SELECT id, title, status, done, created_at AS createdAt, updated_at AS updatedAt FROM tasks ORDER BY id DESC",
    );

    if (String(req.query.group || "").toLowerCase() === "status") {
      const grouped = { todo: [], inprogress: [], done: [] };
      for (const row of rows) grouped[row.status].push(row);
      res.json(grouped);
      return;
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks
router.post("/", async (req, res, next) => {
  try {
    const { title, status } = req.body ?? {};
    if (!title || typeof title !== "string") {
      res.status(400);
      throw new Error("title is required");
    }
    const normalizedStatus = ["todo", "inprogress", "done"].includes(status)
      ? status
      : "todo";
    const db = getDbPool();

    const [result] = await db.query(
      "INSERT INTO tasks (title, status, done) VALUES (?, ?, ?)",
      [title, normalizedStatus, normalizedStatus === "done" ? 1 : 0],
    );

    const [rows] = await db.query(
      "SELECT id, title, status, done, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/tasks/:id
router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400);
      throw new Error("invalid id");
    }

    const { title, status, done } = req.body ?? {};
    const updates = [];
    const params = [];

    if (typeof title === "string" && title.trim()) {
      updates.push("title = ?");
      params.push(title.trim());
    }
    if (["todo", "inprogress", "done"].includes(status)) {
      updates.push("status = ?");
      params.push(status);
      if (status === "done") updates.push("done = 1");
    }
    if (typeof done === "boolean") {
      updates.push("done = ?");
      params.push(done ? 1 : 0);
    }
    if (updates.length === 0) {
      res.status(400);
      throw new Error("no valid fields to update");
    }

    const db = getDbPool();
    params.push(id);
    await db.query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    const [rows] = await db.query(
      "SELECT id, title, status, done, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id = ?",
      [id],
    );
    if (!rows[0]) {
      res.status(404);
      throw new Error("task not found");
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/tasks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400);
      throw new Error("invalid id");
    }
    const db = getDbPool();
    const [result] = await db.query("DELETE FROM tasks WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      res.status(404);
      throw new Error("task not found");
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
