import express from "express";
import emojis from "./emojis.js";
import tasks from "./tasks.js";
import users from "./users.js";
import teams from "./teams.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ message: "API - 👋🌎🌍🌏" });
});

router.use("/emojis", emojis);
router.use("/tasks", tasks);
router.use("/auth", users);
router.use("/teams", teams);

export default router;
