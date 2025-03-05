import dotenv from "dotenv";
import mongoose from "mongoose";
import argon2 from "argon2";
import Role from "./models/Role";
import Category from "./models/Category";
import User, { UserStatus } from './models/User'
import Conference from "./models/Conference";
import Paper from "./models/Paper";
import Review from "./models/Review";
import Question from "./models/Question";
import Database from "./config/db";

dotenv.config();

const SEED_LOG_COLLECTION = "seeding_log";

// Environment variable validation
const validateEnvVariables = () => {
  const requiredVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Function to check if seeding has already been performed
const hasAlreadySeeded = async (): Promise<boolean> => {
  const connection = Database.getInstance().getConnection();
  const log = await connection
    .collection(SEED_LOG_COLLECTION)
    .findOne({ seedName: "initialSeed" });
  return !!log; // Returns true if the log exists
};

// Function to mark seeding as complete
const markAsSeeded = async (): Promise<void> => {
  const connection = Database.getInstance().getConnection();
  await connection
    .collection(SEED_LOG_COLLECTION)
    .insertOne({
      seedName: "initialSeed",
      date: new Date(),
      environment: process.env.NODE_ENV || 'development'
    });
};

export async function prepareDatabase(): Promise<void> {
  try {
    // Validate environment variables before proceeding
    validateEnvVariables();

    const db = Database.getInstance();
    await db.connect();
    console.log("Connected to MongoDB.");

    // Check if seeding has already been performed
    if (await hasAlreadySeeded()) {
      console.log("Database already seeded. Skipping...");
      process.exit(0); //Exit the process successfully
    }

    console.log("Seeding database...");

    // Insert roles
    await Role.insertMany([
      {
        name: "admin",
        permissions: [
          "manage_users",
          "manage_conferences",
          "manage_categories",
          "manage_questions",
          "manage_papers",
          "view_reports",
        ],
        ui_components: [
          "/admin/CategoryTable",
          "/admin/ConferencePapers",
          "/admin/ConferenceTable",
          "/admin/QuestionTable",
          "/admin/UserTable",
          "/common/SideBar",
          "/profile"
        ],
      },
      {
        name: "participant",
        permissions: [
          "submit_paper",
          "edit_paper",
          "delete_paper",
          "view_reviews",
        ],
        ui_components: [
          "/participant/MyWorksTable",
          "/common/SideBar",
          "/profile"
        ],
      },
      {
        name: "reviewer",
        permissions: [
          "view_assigned_papers",
          "submit_reviews",
          "download_papers",
        ],
        ui_components: [
          "/reviewer/AssignedPapersTable",
          "/reviewer/ReviewTable",
          "/common/SideBar",
          "/profile"
        ],
      },
    ]);

    console.log("Roles inserted successfully.");

    // Insert categories
    await Category.insertMany([
      { name: "Biológia, ekológia a environmentalistika", isActive: true },
      { name: "Geografia a regionálny rozvoj a geológia", isActive: true },
      { name: "Informatika", isActive: true },
      { name: "Chémia, fyzika a matematika", isActive: true },
      { name: "Odborová didaktika", isActive: true },
      { name: "PhD", isActive: true },
    ]);

    // Initialize empty collections without data and ensure they exist
    await User.createCollection();

    // Insert Default Admin user if not already created
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existingAdmin) {
      const adminRole = await Role.findOne({ name: "admin" });
      if (!adminRole) {
        console.error("Admin role does not exist. Cannot create Default Admin.");
        process.exit(1);
      }

      const hashedPassword = await argon2.hash(process.env.ADMIN_PASSWORD!);

      await User.create({
        first_name: "Super",
        last_name: "Admin",
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        university: "UKF",
        role: adminRole.name,
        isVerified: true,
        status: UserStatus.Active,
        created_at: new Date(),
        verificationToken: null,
        refreshToken: null,
      });

      console.log("Default Admin user created successfully.");
    } else {
      console.log("Default Admin already exists. Skipping user creation...");
    }

    await Conference.createCollection();
    await Paper.createCollection();
    await Review.createCollection();
    await Question.insertMany([
      {
        text: "Aktuálnosť a náročnosť práce.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Obsah práce",
      },
      {
        text: "Zorientovanie sa študenta v danej problematike prostredníctvom analýzou domácej a zahraničnej literatúry.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Obsah práce",
      },
      {
        text: "Vhodnosť zvolených metód spracovania riešenej problematiky.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Obsah práce",
      },
      {
        text: "Rozsah a úroveň dosiahnutých výsledkov.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Obsah práce",
      },
      {
        text: "Analýza a interpretácia výsledkov a formulácia záverov práce.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Obsah práce",
      },
      {
        text: "Prehľadnosť a logická štruktúra práce.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Štruktúra práce",
      },
      {
        text: "Formálna, jazyková a štylistická úroveň práce.",
        type: "rating",
        options: { min: 1, max: 6 },
        category: "Štruktúra práce",
      },
      {
        text: "Práca zodpovedá šablóne určenej pre ŠVK.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýba názov práce v slovenskom alebo anglickom jazyku.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýba meno autora alebo školiteľa.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýba pracovná emailová adresa autora alebo školiteľa.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýba abstrakt v slovenskom alebo anglickom jazyku.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Abstrakt nespĺňa rozsah 100–150 slov.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýbajú kľúčové slová v slovenskom alebo anglickom jazyku.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Chýba „Úvod“, „Výsledky a diskusia“ alebo „Záver“.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Nie sú uvedené zdroje a použitá literatúra.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "V texte chýbajú referencie na zoznam bibliografie.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "V texte chýbajú referencie na použité obrázky a/alebo tabuľky.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Obrázkom a/alebo tabuľkám chýba popis.",
        type: "yes_no",
        category: "Dodržiavanie pravidiel",
      },
      {
        text: "Prínos (silné stránky) práce.",
        type: "text",
        category: "Hodnotenie",
      },
      {
        text: "Nedostatky (slabé stránky) práce.",
        type: "text",
        category: "Hodnotenie",
      },
    ]);

    console.log("Questions inserted successfully.");

    console.log("Database preparation complete.");

    // Mark as seeded
    await markAsSeeded();
    console.log("Seeding marked as complete.");

    // Disconnect from the database
    await mongoose.disconnect();

    // Exit the script successfully
    process.exit(0);
  } catch (error) {
    console.error("Error preparing the database", error);
    process.exit(1);
  }
};

// Add environment information to the startup log
console.log(`Starting database seeding in ${process.env.NODE_ENV || 'development'} environment`);

// IIFE to handle the async prepareDatabase function
(async () => {
  try {
    await prepareDatabase();
    console.log("Database prepared successfully.");
  } catch (error) {
    console.error("Error in preparing the database:", error);
  }
})();
