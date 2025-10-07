import express from "express";
import emojis from "./emojis.js";
import tasks from "./tasks.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ message: "API - 👋🌎🌍🌏" });
});

router.use("/emojis", emojis);
router.use("/tasks", tasks);

export default router;
