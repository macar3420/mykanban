import express from "express";
import { getDbPool } from "../db.js";

// Resolve the current user (if any) from cookie-session
async function getCurrentUser(req) {
  const token = req.cookies?.sid;
  if (!token) return null;
  const db = getDbPool();
  const [[row]] = await db.query(
    `SELECT u.id, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token],
  );
  return row || null;
}

const router = express.Router();

// GET /api/v1/teams - Get all teams the current user is a member of
router.get("/", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const db = getDbPool();
    const [teams] = await db.query(
      `SELECT t.id, t.name, t.created_by, t.created_at,
              tm.role, tm.added_at
       FROM teams t
       INNER JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = ?
       ORDER BY t.created_at DESC`,
      [user.id],
    );
    res.json(teams);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/teams - Create a new team
router.post("/", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Team name is required" });
    }
    const db = getDbPool();
    // Create team
    const [result] = await db.query(
      "INSERT INTO teams (name, created_by) VALUES (?, ?)",
      [name.trim(), user.id],
    );
    const teamId = result.insertId;
    // Add creator as owner
    await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'owner')",
      [teamId, user.id],
    );
    // Create default board for the team
    await db.query(
      "INSERT INTO boards (name, team_id) VALUES (?, ?)",
      [`${name.trim()} Board`, teamId],
    );
    res.status(201).json({ id: teamId, name: name.trim(), created_by: user.id });
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/teams/:teamId/assign - Assign a user to a team
router.post("/:teamId/assign", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }
    const { user_id } = req.body || {};
    const targetUserId = user_id ? parseInt(user_id, 10) : user.id;
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const db = getDbPool();
    // Check if team exists
    const [[team]] = await db.query("SELECT id FROM teams WHERE id = ?", [teamId]);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    // Check if target user exists
    const [[targetUser]] = await db.query("SELECT id FROM users WHERE id = ?", [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    // Check if user is already a member
    const [[existing]] = await db.query(
      "SELECT user_id FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, targetUserId],
    );
    if (existing) {
      return res.status(409).json({ error: "User is already a member of this team" });
    }
    // Add user to team as member
    await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')",
      [teamId, targetUserId],
    );
    res.status(201).json({ message: "User assigned to team", team_id: teamId, user_id: targetUserId });
  } catch (e) {
    next(e);
  }
});

// PUT /api/v1/teams/:teamId - Update team name (owner only)
router.put("/:teamId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Team name is required" });
    }
    const db = getDbPool();
    // Check if team exists and user is owner
    const [[team]] = await db.query(
      "SELECT id, created_by FROM teams WHERE id = ?",
      [teamId],
    );
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    if (team.created_by !== user.id) {
      return res.status(403).json({ error: "Only the team owner can update the team name" });
    }
    // Update team name
    await db.query("UPDATE teams SET name = ? WHERE id = ?", [name.trim(), teamId]);
    res.json({ id: teamId, name: name.trim() });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/v1/teams/:teamId - Delete team (owner only)
router.delete("/:teamId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }
    const db = getDbPool();
    // Check if team exists and user is owner
    const [[team]] = await db.query(
      "SELECT id, created_by FROM teams WHERE id = ?",
      [teamId],
    );
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    if (team.created_by !== user.id) {
      return res.status(403).json({ error: "Only the team owner can delete the team" });
    }
    // Delete team (cascade will handle team_members and boards)
    await db.query("DELETE FROM teams WHERE id = ?", [teamId]);
    res.json({ message: "Team deleted successfully" });
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/teams/:teamId/leave - Leave team (members only, not owner)
router.post("/:teamId/leave", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }
    const db = getDbPool();
    // Check if team exists
    const [[team]] = await db.query("SELECT id, created_by FROM teams WHERE id = ?", [teamId]);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    // Check if user is the owner
    if (team.created_by === user.id) {
      return res.status(403).json({ error: "Team owner cannot leave the team. Please delete the team instead." });
    }
    // Check if user is a member
    const [[member]] = await db.query(
      "SELECT user_id FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, user.id],
    );
    if (!member) {
      return res.status(404).json({ error: "You are not a member of this team" });
    }
    // Remove user from team
    await db.query("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", [teamId, user.id]);
    res.json({ message: "Left team successfully" });
  } catch (e) {
    next(e);
  }
});

// GET /api/v1/teams/:teamId/members - Get team members
router.get("/:teamId/members", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }
    const db = getDbPool();
    // Check if user is a member of the team
    const [[member]] = await db.query(
      "SELECT user_id FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, user.id],
    );
    if (!member) {
      return res.status(403).json({ error: "You are not a member of this team" });
    }
    // Get all team members
    const [members] = await db.query(
      `SELECT tm.user_id, tm.role, u.display_name, u.email
       FROM team_members tm
       INNER JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.role DESC, tm.added_at ASC`,
      [teamId],
    );
    res.json(members);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/v1/teams/:teamId/members/:userId - Remove member (owner only)
router.delete("/:teamId/members/:userId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const teamId = parseInt(req.params.teamId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(teamId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid team ID or user ID" });
    }
    const db = getDbPool();
    // Check if team exists and user is owner
    const [[team]] = await db.query(
      "SELECT id, created_by FROM teams WHERE id = ?",
      [teamId],
    );
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    if (team.created_by !== user.id) {
      return res.status(403).json({ error: "Only the team owner can remove members" });
    }
    // Check if target user is a member
    const [[targetMember]] = await db.query(
      "SELECT user_id, role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, userId],
    );
    if (!targetMember) {
      return res.status(404).json({ error: "User is not a member of this team" });
    }
    // Don't allow removing the owner
    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: "Cannot remove the team owner" });
    }
    // Remove member
    await db.query("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", [teamId, userId]);
    res.json({ message: "Member removed successfully" });
  } catch (e) {
    next(e);
  }
});

export default router;

