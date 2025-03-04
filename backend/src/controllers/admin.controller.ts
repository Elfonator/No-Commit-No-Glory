import { Request, Response } from "express";
import AdmZip from "adm-zip";
import User, { IUser, UserStatus } from '../models/User'
import Conference, { ConferenceStatus } from "../models/Conference";
import { AuthRequest } from "../middleware/authenticateToken";
import Category from "../models/Category";
import Paper, { PaperStatus } from '../models/Paper'
import Question from "../models/Question";
import path from "path";
import { promises as fs } from "fs";
import { sendEmail } from '../utils/emailService'
import argon2 from 'argon2'
import Review from '../models/Review'
import {config} from "../config";

/** USERS**/
//Get all users
export const getAllUsers = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res
        .status(500)
        .json({ message: "Nepodarilo sa načítať používateľov", error });
  }
};

//Get user by ID
export const getUserById = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "Používateľ nebol nájdený" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať používateľa", error });
  }
};

// Create a new user (Admin only)
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, password, university, faculty, role, status } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email je už registrovaný." });
      return;
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create new user
    const newUser = new User({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      university,
      faculty,
      role,
      isVerified: true, // Admin manually creates verified users
      status: status || UserStatus.Active,
    });

    await newUser.save();
    res.status(201).json({ message: "Používateľ bol úspešne vytvorený.", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Chyba pri vytváraní používateľa", error });
  }
};

// Edit user details (Admin can modify everything)
export const editUserDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // If updating password, hash it before saving
    if (updates.password) {
      updates.password = await argon2.hash(updates.password);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      res.status(404).json({ message: "Používateľ nebol nájdený alebo sa nepodarilo aktualizovať." });
      return;
    }

    res.status(200).json({ message: "Používateľ bol úspešne aktualizovaný.", user: updatedUser });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ message: "Chyba pri aktualizácii používateľa", error });
  }
};

// Delete user and clean up related data
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "Používateľ nebol nájdený" });
      return;
    }

    // If user is a reviewer, remove assigned reviews and unassign papers
    if (user.role === "reviewer") {
      await Review.deleteMany({ reviewer: userId });
      await Paper.updateMany(
        { reviewer: userId },
        { $unset: { reviewer: "" }, $set: { status: PaperStatus.Submitted } }
      );
    }

    // If user is a participant, delete all their papers
    if (user.role === "participant") {
      await Paper.deleteMany({ user: userId });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Používateľ bol úspešne vymazaný." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Nepodarilo sa vymazať používateľa", error });
  }
};

/*
export const deleteUser = async (
    req: Request,
    res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      res.status(404).json({ message: "Používateľ nebol nájdený" });
      return;
    }
    await Paper.deleteMany({ user: userId });
    await Paper.updateMany(
        { reviewer: userId },
        {
          $unset: { reviewer: "" },
          $set: { status: "Odovzdaná" }
        }
    );
    res.status(200).json({
      message: "Používateľ bol úspešne vymazaný",
      user: deletedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nepodarilo sa vymazať používateľa", error });
  }
};
 */

/** CATEGORIES **/
//Get all categories
export const getAllCategories = async (req: AuthRequest, res: Response) => {
  try {
    //Fetch all categories
    const categories = await Category.find();

    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Nepodarilo sa načítať kategórie" });
  }
};

//Get category by ID
export const getCategoryById = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(404).json({ message: "Kategória nebola nájdená" });
      return;
    }
    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať kategóriu", error });
  }
};

//Create a new category
export const createCategory = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { name } = req.body;
    const newCategory = new Category({ name });
    await newCategory.save();
    res
        .status(201)
        .json({
          message: "Kategória bola úspešne vytvorená",
          category: newCategory,
        });
  } catch (error) {
    res.status(500).json({ message: "Chyba pri vytváraní kategórie", error });
  }
};

//Update category
export const updateCategory = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    if (!categoryId || !updates || Object.keys(updates).length === 0) {
      res
          .status(400)
          .json({
            message:
                "Neplatná požiadavka. Je potrebné zadať ID kategórie a údaje na aktualizáciu.",
          });
      return;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        updates,
        { new: true },
    );
    if (!updatedCategory) {
      res.status(404).json({ message: "Kategória nebola nájdená." });
      return;
    }

    res.status(200).json({
      message: "Kategória bola úspešne aktualizovaná",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa aktualizovať kategóriu", error });
  }
};

//Delete category
export const deleteCategory = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { categoryId } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      res.status(404).json({ message: "Kategória nebola nájdená" });
      return;
    }

    res
        .status(200)
        .json({
          message: "Kategória bola úspešne vymazaná",
          category: deletedCategory,
        });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Nepodarilo sa vymazať kategóriu", error });
  }
};

/** CONFERENCES **/
//Get all existing conferences
export const getAllConferences = async (
    _req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const conferences = await Conference.find();
    res.status(200).json(conferences);
  } catch (error) {
    console.error("Error fetching conferences:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa načítať konferencie", error });
  }
};

//Create a new conference
export const createConference = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const {
      year,
      date,
      location,
      university,
      start_date,
      end_date,
      deadline_submission,
      deadline_review,
    } = req.body;

    const newConference = new Conference({
      year,
      date,
      location,
      university,
      status: ConferenceStatus.Upcoming,
      start_date,
      end_date,
      deadline_submission,
      deadline_review,
      created_at: new Date(),
    });

    await newConference.save();

    // Create directory for the conference
    const uploadPath = path.resolve(
        __dirname,
        `../uploads/docs/${newConference._id}`,
    );
    await fs.mkdir(uploadPath, { recursive: true });

    res
        .status(201)
        .json({
          message: "Konferencia bola úspešne vytvorená",
          conference: newConference,
        });
  } catch (error) {
    console.error(error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa vytvoriť konferenciu", error });
  }
};

export const getConferenceById = async (
    req: Request,
    res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const conference = await Conference.findById(id);
    if (!conference) {
      res.status(404).json({ message: "Konferencia sa nenašla." });
      return;
    }
    res.status(200).json(conference);
  } catch (error) {
    console.error("Error fetching conference:", error);
    res.status(500).json({ error: "Nepodarilo sa načítať konferenciu." });
  }
};

// Update existing conference (dynamic update)
export const updateConference = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const updates = req.body;

    const updatedConference = await Conference.findByIdAndUpdate(
        conferenceId,
        updates,
        {
          new: true,
          runValidators: true,
        },
    );

    if (!updatedConference) {
      res.status(404).json({ message: "Konferencia nebola nájdená" });
      return;
    }

    res
        .status(200)
        .json({
          message: "Konferencia bola úspešne aktualizovaná",
          conference: updatedConference,
        });
  } catch (error) {
    console.error("Error updating conference:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa aktualizovať konferenciu", error });
  }
};

/*
//Delete conference
export const deleteConference = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conferenceId } = req.params;

        const deletedConference = await Conference.findByIdAndDelete(conferenceId);
        if (!deletedConference) {
            res.status(404).json({ message: 'Konferencia nebola nájdená' });
            return;
        }

        res.status(200).json({ message: 'Konferencia bola úspešne vymazaná', conference: deletedConference });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Nepodarilo sa vymazať konferenciu', error });
    }
};
 */

/** QUESTIONS **/
//Get all questions
export const getAllQuestions = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať otázky", error });
  }
};

//Get question by ID
export const getQuestionById = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      res.status(404).json({ message: "Question not found." });
      return;
    }

    res.status(200).json(question);
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    res.status(500).json({ message: "Failed to fetch question.", error });
  }
};

//Create new question
export const createQuestion = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { text, type, options, category } = req.body;

    if (!text || !type) {
      res.status(400).json({ message: "Text a typ sú povinné polia" });
      return;
    }

    const newQuestion = new Question({ text, type, options, category });
    await newQuestion.save();

    res.status(201).json({
      message: "Otázka bola úspešne vytvorená",
      question: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Nepodarilo sa vytvoriť otázku", error });
  }
};
//Delete existing question
export const deleteQuestion = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  const { questionId } = req.params;

  try {
    const result = await Question.findByIdAndDelete(questionId);
    if (!result) {
      res.status(404).json({ message: "Otázka sa nenašla." });
      return;
    }
    res.status(200).json({ message: "Otázka bola úspešne odstránená." });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Otázku sa nepodarilo odstrániť." });
  }
};

// Update question (dynamic update)
export const updateQuestion = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { questionId } = req.params;
    const updates = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
        questionId,
        updates,
        {
          new: true,
          runValidators: true,
        },
    );

    if (!updatedQuestion) {
      res.status(404).json({ message: "Nepodarilo sa nájsť otázku" });
      return;
    }

    res.status(200).json({
      message: "Otázka bola úspešne aktualizovaná",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa aktualizovať otázku", error });
  }
};

/** PAPERS **/
// Get all papers with associated conference details
export const getAllPapers = async (
    _req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const papers = await Paper.find()
        .populate({
          path: "conference",
          select: "year location date", // Include relevant fields from Conference
        })
        .populate({
          path: "user",
          select: "first_name last_name email", // Include relevant fields from User
        })
        .populate({
          path: "category",
          select: "name", // Include relevant fields from Category
        })
        .populate({
          path: "reviewer",
          select: "first_name last_name email university",
        })
        .select(
            "status title submission_date abstract keywords authors category conference file_link final_submission deadline_date ",
        );

    res.status(200).json(papers);
  } catch (error) {
    console.error("Error fetching all papers:", error);
    res.status(500).json({ message: "Failed to fetch papers.", error });
  }
};

export const getPaperById = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;
    const paper = await Paper.findById(paperId)
        .populate({
          path: "conference",
          select: "year location date",
        })
        .populate({
          path: "user",
          select: "first_name last_name email university",
        })
        .populate({
          path: "category",
          select: "name", // Include relevant fields from Category
        })
        .populate({
          path: "reviewer",
          select: "first_name last_name email university",
        })
        .select(
            "status title submission_date abstract keywords authors category conference file_link final_submission deadline_date",
        );

    if (!paper) {
      res.status(404).json({ message: "Nepodarilo sa nájsť prácu." });
      return;
    }

    res.status(200).json(paper);
  } catch (error) {
    console.error("Error fetching paper:", error);
    res.status(500).json({ message: "Failed to fetch paper.", error });
    return;
  }
};

// Change submission deadline of particular paper
export const changeSubmissionDeadline = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;
    const { newDeadline } = req.body;

    if (!newDeadline) {
      res.status(400).json({ message: "Je potrebný nový termín" });
      return;
    }
    const updatedPaper = await Paper.findByIdAndUpdate(
        paperId,
        { deadline_date: new Date(newDeadline) },
        { new: true },
    );
    if (!updatedPaper) {
      res.status(404).json({ message: "Nepodarilo sa nájsť prácu" });
      return;
    }

    res
        .status(200)
        .json({
          message: "Termín odovzdania bol úspešne aktualizovaný",
          paper: updatedPaper,
        });
  } catch (error) {
    console.error("Error updating submission deadline:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa aktualizovať termín odovzdania", error });
  }
};

export const getReviewers = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const reviewers = await User.find(
        { role: "reviewer" },
        "first_name last_name email _id university",
    );
    res.status(200).json(reviewers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Nepodarilo sa nájsť recenzenty" });
  }
};

//Assign reviewer to paper (dynamic update)
export const assignReviewer = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;
    const { reviewerId } = req.body;

    const updatedPaper = await Paper.findByIdAndUpdate(
        paperId,
        {
          reviewer: reviewerId,
          status: "Posudzovanie",
        },
        { new: true, runValidators: true },
    ).populate("reviewer", "first_name last_name email university"); // Populate the reviewer data

    if (!updatedPaper) {
      res.status(404).json({ message: "Nepodarilo sa nájsť prácu" });
      return;
    }

    const reviewer = updatedPaper.reviewer as IUser;
    const paper = updatedPaper;

    const currentDate = new Date().toLocaleDateString("sk-SK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (reviewer && paper) {
      const emailContent = `
        <p>Dobrý deň,</p>
        <p>Bola vám dňa ${currentDate} pridelená nová práca "<strong>${paper.title}</strong>" na recenziu.</p>
        <p>Prihláste sa do svojho účtu, aby ste získali prístup k podrobnostiam.</p>
      `;

      await sendEmail({
        to: reviewer.email,
        subject: "Nová práca na recenziu",
        html: emailContent,
      });
    }


    res.status(200).json({
      message: "Práca bola úspešne aktualizovaná",
      paper: updatedPaper,
    });
  } catch (error) {
    console.error("Error assigning reviewer:", error);
    res
        .status(500)
        .json({ message: "Nepodarilo sa aktualizovať prácu", error });
  }
};

//Paper download grouped by conference
export const downloadPapersByConference = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    if (!conferenceId) {
      res.status(400).json({ message: "Je potrebné zadať ID konferencie." });
    }

    //Path where papers are stored
    // Construct the correct path
    const conferenceUploadPath = path.join(config.uploads, "docs", conferenceId);

    // Check if the conference folder exists
    try {
      await fs.access(conferenceUploadPath, fs.constants.F_OK);
    } catch (err) {
      console.warn("Conference folder does not exist, attempting to create...");
      try {
        await fs.mkdir(conferenceUploadPath, { recursive: true });
        console.log(`Folder created: ${conferenceUploadPath}`);
        res
            .status(404)
            .json({ message: "No files available for this conference yet." });
        return;
      } catch (mkdirErr) {
        console.error("Error creating the folder:", mkdirErr);
        res
            .status(500)
            .json({
              message: "Nepodarilo sa vytvoriť priečinok pre túto konferenciu.",
              error: mkdirErr,
            });
        return;
      }
    }

    // Read all files in the directory
    const files = await fs.readdir(conferenceUploadPath);
    if (!files || files.length === 0) {
      res
          .status(404)
          .json({
            message: "Pre túto konferenciu neboli nájdené žiadne dokumenty.",
          });
      return;
    }

    // Create ZIP archive
    const zip = new AdmZip();
    for (const file of files) {
      const filePath = path.join(conferenceUploadPath, file);
      zip.addLocalFile(filePath, "", file);
    }

    // Headers for downloading the ZIP file
    const zipFileName = `conference-${conferenceId}-papers.zip`;
    res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);
    res.setHeader("Content-Type", "application/zip");

    // Send the ZIP buffer
    const data = zip.toBuffer();
    res.status(200).end(data);
  } catch (error) {
    console.error("Error downloading papers for conference:", error);
    res.status(500).json({ message: "Nepodarilo sa stiahnuť práce.", error });
  }
};

/** OTHER **/
//Admin Reports Controller
export const getAdminReports = async (
    _req: AuthRequest,
    res: Response,
): Promise<void> => {
  try {
    // Total Papers Count
    const totalPapers = await Paper.countDocuments();

    //Papers Grouped by Status
    const papersByStatus = await Paper.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    //Papers by Category
    const papersByCategory = await Paper.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      { $group: { _id: "$categoryInfo.name", count: { $sum: 1 } } },
    ]);

    //Active Reviewers Count
    const activeReviewers = await User.countDocuments({
      role: "reviewer",
      status: "active",
    });

    // Papers Under Review
    const papersUnderReview = await Paper.countDocuments({
      status: "under_review",
    });

    // Conferences with their Paper Counts
    const conferencesWithPaperCounts = await Conference.aggregate([
      {
        $lookup: {
          from: "papers",
          localField: "_id",
          foreignField: "conference",
          as: "papers",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          year: 1,
          paperCount: { $size: "$papers" },
        },
      },
    ]);

    // Send aggregated report data
    res.status(200).json({
      totalPapers,
      papersByStatus,
      papersByCategory,
      activeReviewers,
      papersUnderReview,
      conferencesWithPaperCounts,
    });
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    res.status(500).json({ message: "Failed to fetch admin reports.", error });
  }
};
