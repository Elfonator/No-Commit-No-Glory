import { Request, Response } from "express";
import AdmZip from "adm-zip";
import User, { IUser, UserStatus } from '../models/User'
import Conference, { ConferenceStatus } from "../models/Conference";
import { AuthRequest } from "../middleware/authenticateToken";
import Category from "../models/Category";
import Paper, { IPaper, PaperStatus } from '../models/Paper'
import Question from "../models/Question";
import path from "path";
import { promises as fs } from "fs";
import { sendEmail } from '../utils/emailService'
import argon2 from 'argon2'
import Review from '../models/Review'
import {config} from "../config";
import Homepage from '../models/Homepage'
import multer from 'multer'
import { setEndOfDay } from '../utils/dateUtils'

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

// Edit user details
export const editUserDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    console.log("Received update payload:", updates); // Debugging

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      res.status(404).json({ message: "Používateľ nebol nájdený." });
      return;
    }

    // Preserve faculty if not explicitly sent
    if (updates.faculty === undefined) {
      updates.faculty = existingUser.faculty;
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
      submission_confirmation,
      deadline_review,
      deadline_correction,
    } = req.body;

    const newConference = new Conference({
      year,
      date,
      location,
      university,
      status: ConferenceStatus.Upcoming,
      start_date,
      end_date: setEndOfDay(new Date(end_date)),
      deadline_submission: setEndOfDay(new Date(deadline_submission)),
      submission_confirmation: setEndOfDay(new Date(submission_confirmation)),
      deadline_review: setEndOfDay(new Date(deadline_review)),
      deadline_correction: setEndOfDay(new Date(deadline_correction)),
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

    ['end_date', 'deadline_submission', 'submission_confirmation', 'deadline_review', 'deadline_correction'].forEach(field => {
      if (updates[field]) {
        updates[field] = setEndOfDay(new Date(updates[field]));
      }
    });

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


//Delete conference
export const deleteConference = async (req: AuthRequest, res: Response): Promise<void> => {
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
        paperId, {
          deadline_date: new Date(newDeadline),
          status: PaperStatus.Draft
      },
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

export const adminUpdatePaper = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paperId } = req.params;
    const { authors, category } = req.body;

    const updates: Partial<IPaper> = {};
    if (authors) updates.authors = authors;
    if (category) updates.category = category;

    const updatedPaper = await Paper.findByIdAndUpdate(
      paperId,
      { $set: updates },
      { new: true },
    );

    if (!updatedPaper) {
      res.status(404).json({ message: 'Paper not found' });
      return;
    }

    res.status(200).json({ message: 'Paper updated successfully', paper: updatedPaper });
  } catch (error) {
    console.error('Error updating paper:', error);
    res.status(500).json({ message: 'Internal server error' });
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
          status: PaperStatus.UnderReview,
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

export const adminDeletePaper = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;

    // Check if the paper exists
    const paper = await Paper.findById(paperId);
    if (!paper) {
      res.status(404).json({ message: 'Práca sa nenašla' });
      return;
    }

    // Delete associated reviews
    await Review.deleteMany({ paper: paperId });

    // Delete the paper itself
    await Paper.findByIdAndDelete(paperId);
    res.status(200).json({ message: 'Práca bola úspešne odstránená' });
  } catch (error) {
    console.error('Error deleting paper:', error);
    res.status(500).json({ message: 'Chyba pri odstraňovaní práce' });
  }
};

export const downloadSinglePaper = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;

    // Find the paper in the database
    const paper = await Paper.findById(paperId);
    if (!paper || !paper.file_link) {
      res.status(404).json({ message: "Soubor nebyl nalezen." });
      return;
    }

    // Ensure the file path is relative to the /docs route
    let filePath = paper.file_link;
    if (!filePath.startsWith("/docs/")) {
      filePath = `/docs/${filePath.split("/docs/").pop()}`;
    }

    // Construct absolute file path
    const absolutePath = path.join(config.uploads, filePath.replace("/docs/", "docs/"));

    // Extract the first author from the authors array
    const firstAuthor = paper.authors?.length
      ? `${paper.authors[0].firstName}_${paper.authors[0].lastName}`
      : "Unknown_Author";

    // Generate a safe filename based on the first author's name + paper title
    const safeTitle = paper.title.trim().replace(/[^a-zA-Z0-9-_]/g, "_"); // Remove special characters
    const fileExtension = path.extname(absolutePath);
    const downloadFilename = `${firstAuthor}_${safeTitle}${fileExtension}`;


    // Debugging: Log filename & path
    console.log("File Path:", absolutePath);
    console.log("Download Filename:", downloadFilename);

    // Check if the file exists
    if (!absolutePath) {
      res.status(404).json({ message: "Soubor nebyl na serveru nalezen." });
      return;
    }

    // Set proper headers to enforce the filename
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    res.setHeader("Content-Type", "application/pdf");

    console.log("Final Response Headers:");
    console.log(`Content-Disposition: attachment; filename="${downloadFilename}"`);
    console.log("Absolute Path:", absolutePath);

    // Send the file for download
    res.download(absolutePath, downloadFilename);
  } catch (error) {
    console.error("Chyba při stahování papíru:", error);
    res.status(500).json({ message: "Papír se nepodařilo stáhnout.", error });
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

/** HOMEPAGE MANAGEMENT **/
/** Committees **/
//Fetch committees
export const getCommittees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homepage = await Homepage.findOne().select("committees");
    res.status(200).json({ committees: homepage?.committees || [] });
  } catch (error) {
    console.error("Error fetching committee members:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať organizačný výbor", error });
  }
}

// Add a new committee member
export const addCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, university } = req.body;

    if (!fullName || !university) {
      res.status(400).json({ message: "Chýbajúce údaje" });
    }

    const homepage = await Homepage.findOneAndUpdate(
      {},
      { $push: { committees: { fullName, university } } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      message: "Člen výboru bol úspešne pridaný",
      committees: homepage?.committees || [],
    });
  } catch (error) {
    console.error("Error adding committee member:", error);
    res.status(500).json({ message: "Nepodarilo sa pridať člena výboru", error });
  }
};

// Update an existing committee member
export const updateCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { committeeId } = req.params;
    const updates = req.body;

    const homepage = await Homepage.findOneAndUpdate(
      { "committees._id": committeeId },
      { $set: { "committees.$": updates } },
      { new: true }
    );

    if (!homepage) {
      res.status(404).json({ message: "Člen výboru nebol nájdený" });
    }

    res.status(200).json({
      message: "Člen výboru bol úspešne aktualizovaný",
      committees: homepage?.committees || [],
    });
  } catch (error) {
    console.error("Error updating committee member:", error);
    res.status(500).json({ message: "Nepodarilo sa aktualizovať člena výboru", error });
  }
};

// Delete a committee member
export const deleteCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { committeeId } = req.params;

    const homepage = await Homepage.findOneAndUpdate(
      {},
      { $pull: { committees: { _id: committeeId } } },
      { new: true }
    );

    if (!homepage) {
      res.status(404).json({ message: "Člen výboru nebol nájdený" });
    }

    res.status(200).json({
      message: "Člen výboru bol úspešne odstránený",
      committees: homepage?.committees || [],
    });
  } catch (error) {
    console.error("Error deleting committee member:", error);
    res.status(500).json({ message: "Nepodarilo sa odstrániť člena výboru", error });
  }
};

/** Program **/
// Fetch program
export const getProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const homepage = await Homepage.findOne().select("program");
    res.status(200).json({ program: homepage?.program || { fileLink: "", items: [] } });
  } catch (error) {
    console.error("Error fetching program:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať program", error });
  }
};

export const updateProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { programItems, fileLink } = req.body;

    if (!programItems && !fileLink) {
      res.status(400).json({ message: "No program data to update" });
    }

    const updateFields: any = {};

    if (programItems) {
      updateFields["program.items"] = programItems;
    }
    if (fileLink) {
      updateFields["program.fileLink"] = fileLink;
    }

    const homepage = await Homepage.findOneAndUpdate(
        {},
        { $set: updateFields },
        { new: true }
    );

    if (!homepage) {
      res.status(404).json({ message: "Homepage not found" });
    }
    res.status(200).json({
      message: "Program updated successfully",
    });
  } catch (error) {
    console.error("Error updating program:", error);
    res.status(500).json({ message: "Failed to update program", error });
  }
};


// Delete a program schedule item
export const deleteProgramItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    const homepage = await Homepage.findOneAndUpdate(
      {},
      { $pull: { "program.items": { _id: itemId } } },
      { new: true }
    );

    if (!homepage) {
      res.status(404).json({ message: "Bod programu nebol nájdený" });
      return;
    }

    res.status(200).json({
      message: "Bod programu bol úspešne odstránený",
      program: homepage?.program || { fileLink: "", items: [] },
    });
  } catch (error) {
    console.error("Error deleting program item:", error);
    res.status(500).json({ message: "Nepodarilo sa odstrániť bod programu", error });
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(config.uploads, "programs");
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error instanceof Error ? error : new Error(String(error)), "");
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Neplatný typ súboru. Povolené sú iba PDF"));
  }
};

export const upload = multer({ storage, fileFilter });

// Upload Program File
export const uploadProgramFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Súbor nebol nahraný" });
      return;
    }

    // Find existing homepage
    const homepage = await Homepage.findOne();

    if (!homepage) {
      res.status(404).json({ message: "Nepodarilo sa nájsť domovskú stránku" });
      return;
    }

    // Define the new file path
    const newFilePath = `/programs/${req.file.filename}`;

    // Delete old file if it exists
    if (homepage.program?.fileLink) {
      try {
        const oldFilePath = path.join(config.uploads, homepage.program.fileLink.replace("/uploads/", ""));
        await fs.access(oldFilePath, fs.constants.F_OK);
        await fs.unlink(oldFilePath);
        console.log(`Old program file deleted: ${oldFilePath}`);
      } catch (err) {
        console.warn("Failed to delete old file!", err);
      }
    }

    // Update database with new file link
    homepage.program.fileLink = newFilePath;
    await homepage.save();

    res.status(200).json({
      message: "Súbor programu bol úspešne nahraný",
      program: homepage.program,
    });
  } catch (error) {
    console.error("Error uploading program file:", error);
    res.status(500).json({ message: "Nepodarilo sa nahrať programový súbor", error });
  }
};

/** Excel output **/
// Generate Excel for all papers in a specific conference
export const exportPapersToExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    if (!conferenceId) {
      res.status(400).json({ message: "Chýba ID konferencie" });
      return;
    }

    const papers = await Paper.find({ conference: conferenceId })
      .populate("user", "first_name last_name email university")
      .populate("category", "name")
      .populate("reviewer", "first_name last_name email")
      .populate("review")
      .populate("conference", "year location");

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const conference = papers[0]?.conference as any;
    const sheetName = `SVK ${conference.year}`;
    const sheet = workbook.addWorksheet(sheetName);

    // Define all requested headers
    sheet.addRow([
      "Názov",
      "Výsledok",
      "Krstné meno (Autor 1)",
      "Priezvisko  (Autor 1)",
      "Školiteľ/ka",
      "Pracovisko (Autor 1)",
      "Stupeň štúdia",
      "Email (Autor 1)",
      "Súčasná sekcia",
      "Finálna sekcia",
      "Hľadá recenzenta (člen org. výboru)",
      "Meno Recenzenta",
      "Email recenzenta",
      "Komentáre po recenzií",
      "Poslané na recenziu"
    ]);

    // Add paper data rows
    for (const paper of papers) {
      const user = paper.user as any;
      const category = paper.category as any;
      const reviewer = paper.reviewer as any;
      const review = paper.review as any;

      sheet.addRow([
        paper.title || '',
        '', // Výsledok
        user?.first_name || '',
        user?.last_name || '',
        '', // Školiteľ/ka
        user?.university || '',
        '', // Stupeň štúdia
        user?.email || '',
        category?.name || '',
        '', // Finálna sekcia
        '', // Hľadá recenzenta
        reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : '',
        reviewer?.email || '',
        review?.comments || '', // Assuming review schema has "comments"
        reviewer ? 'Áno' : 'Nie',
      ]);
    }

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="papers_${conferenceId}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting papers to Excel:", error);
    res.status(500).json({ message: "Nepodarilo sa exportovať do Excelu.", error });
  }
};

/** OTHER **/
//Admin Reports Controller
  /*
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
 */
