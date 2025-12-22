import { initDb } from "./db.js";

try {
  await initDb();
  console.log("Database initialized successfully!");
  process.exit(0);
} catch (error) {
  console.error("Failed to initialize database:", error);
  process.exit(1);
}

