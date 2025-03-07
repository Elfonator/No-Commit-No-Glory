import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import Database from "./config/db";
import commonRoutes from "./routes/common.routes";
import authRoutes from "./routes/auth.routes";
import reviewerRoutes from "./routes/reviewer.routes";
import participantRoutes from "./routes/participant.routes";
import adminRoutes from "./routes/admin.routes";
import path from "path";
import {config} from "./config";

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: [config.baseFrontendUrl, "https://svk-ukf.sk"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

console.log(config);
// Apply CORS globally
app.use(cors(corsOptions));

// Handle CORS preflight requests globally
app.options("*", cors(corsOptions));

// Initialize database
const initializeDatabase = async () => {
  try {
    const db = Database.getInstance();
    await db.connect();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
};

initializeDatabase().catch((error) => {
  console.error("Database initialization error:", error);
  process.exit(1);
});

// API Routes
app.use("/api", commonRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth/admin", adminRoutes);
app.use("/api/auth/participant", participantRoutes);
app.use("/api/auth/reviewer", reviewerRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

export default app;
