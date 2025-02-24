import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

class Database {
  private static instance: Database;
  private connection!: mongoose.Connection;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    const dbUri = process.env.MONGO_URI;
    if (!dbUri) {
      throw new Error("MONGO_URI is not defined in the environment variables");
    }

    try {
      const connection = await mongoose.connect(dbUri); // No additional options are needed in Mongoose 6+
      this.connection = connection.connection;
      console.log("Connected to MongoDB Atlas");
    } catch (error) {
      console.error("Failed to connect to MongoDB Atlas:", error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    if (!this.connection) {
      throw new Error("Database connection has not been established.");
    }
    return this.connection;
  }
}

export default Database;
