import { Response } from "express";
import Review from "../models/Review";
import Paper, { IPaper, PaperStatus } from '../models/Paper'
import { AuthRequest } from "../middleware/authenticateToken";
import { sendEmail } from "../utils/emailService";
import User from "../models/User";
import Question from "../models/Question";
import path from "path";
import {config} from "../config";

//Assigned papers
export const getAssignedPapers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const reviewerId = req.user?.userId;
    if (!reviewerId) {
      res.status(401).json({ message: "Neautorizované. Recenzent nie je prihlásený." });
      return;
    }

    // Get all reviewed paper IDs (both drafts & submitted)
    const reviewedPaperIds = await Review.find({ reviewer: reviewerId })
      .distinct('paper');

    // Find papers that have NOT been reviewed (no drafts or submitted reviews)
    const pendingPapers = await Paper.find({
      reviewer: reviewerId,
      _id: { $nin: reviewedPaperIds }
    })
      .populate('category', 'name')
      .populate('conference', 'year location date');

    if (!pendingPapers.length) {
      res.status(404).json({ message: "Žiadne práce pridelené tomuto recenzentovi." });
      return;
    }

    res.status(200).json(pendingPapers);
  } catch (error) {
    console.error("Error fetching assigned papers:", error);
    res.status(500).json({ error: "Nepodarilo sa načítať pridelené práce." });
  }
};

//Get all reviews for a specific reviewer
export const getAllReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      res.status(400).json({ message: 'Reviewer ID is required.' });
      return;
    }

    // Fetch all reviews by this reviewer
    const reviews = await Review.find({ reviewer: reviewerId })
      .populate({
        path: 'paper',
        select: 'title category conference abstract keywords authors',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'conference', select: 'year location date' },
        ],
      })
      .populate('responses.question', 'text') // Populate question text
      .sort({ created_at: -1 }); // Sort by most recent

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
};

//Get all questions
export const getQuestions = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const questions = await Question.find().select("text type options");

    if (!questions.length) {
      res.status(404).json({ message: "Neboli nájdené žiadne otázky." });
      return;
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions for reviewer:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať otázky.", error });
  }
};

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paper, reviewer, responses, recommendation, comments, isDraft } = req.body;

    // Validate required fields
    if (!paper || !reviewer || !responses || !recommendation) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    // Create a new review
    const newReview = new Review({
      paper,
      reviewer,
      responses,
      recommendation,
      comments,
      isDraft: isDraft ?? true, // Default to draft if not provided
      created_at: new Date(),
    });

    // Save to DB
    await newReview.save();

    res.status(201).json({ message: "Review created successfully", review: newReview });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Failed to create review." });
  }
};

// Function to update an existing review
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const { responses, recommendation, comments, isDraft } = req.body;

    if (!reviewId) {
      res.status(400).json({ message: 'Review ID is required.' });
      return;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    // Update review fields
    review.responses = responses;
    review.recommendation = recommendation;
    review.comments = comments;
    review.isDraft = isDraft;
    await review.save();

    res.status(200).json({ message: 'Recenzia bola aktualizovaná.', review });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Nepodarilo sa aktualizovať recenziu." });
  }
};

// Function to submit a review (change draft to final submission)
export const sendReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      res.status(400).json({ message: 'Review ID is required.' });
      return;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    if (!review.isDraft) {
      res.status(400).json({ message: 'Review has already been submitted.' });
      return;
    }

    review.isDraft = false; // Mark as final submission
    await review.save();

    res.status(200).json({ message: 'Recenzia bola odoslaná.', review });

    appendReview(
      Object.assign(req, { params: { paperId: review.paper }, body: { reviewId: review._id } }),
      res
    ).catch(error => console.error("Error appending review:", error));

    // Update paper status based on recommendation
    const paperStatus = getPaperStatusFromRecommendation(review.recommendation);
    await Paper.findByIdAndUpdate(review.paper, { status: paperStatus });

  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ message: "Nepodarilo sa odoslať recenziu." });
  }
};

// Function to delete a draft review
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      res.status(400).json({ message: 'Review ID is required.' });
      return;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    if (!review.isDraft) {
      res.status(400).json({ message: 'Only draft reviews can be deleted.' });
      return;
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Recenzia bola vymazaná.' });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Nepodarilo sa vymazať recenziu." });
  }
};

// Set status on paper based on recommendation
const getPaperStatusFromRecommendation = (
  recommendation: string,
): PaperStatus => {
  switch (recommendation) {
    case "Publikovať":
      return PaperStatus.Accepted;
    case "Odmietnuť":
      return PaperStatus.Rejected;
    case "Publikovať_so_zmenami":
      return PaperStatus.AcceptedWithChanges;
    default:
      return PaperStatus.UnderReview;
  }
};

export const appendReview = async (req: AuthRequest,
                                   res: Response,): Promise<void> => {
  const { paperId } = req.params;
  const { reviewId } = req.body;

  try {
    const paper = await Paper.findByIdAndUpdate(
      paperId,
      { $push: { review: reviewId } },
      { new: true }
    );

    if (!paper) {
      res.status(404).json({ message: 'Paper not found' });
      return
    }

    res.status(200).json({ message: 'Review appended to paper', paper });
  } catch (error) {
    console.error('Error appending review to paper:', error);
    res.status(500).json({ message: 'Failed to append review to paper' });
  }
}

//Get review by ID
export const getReviewById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      res.status(400).json({ message: 'Review ID is required.' });
      return;
    }

    const review = await Review.findById(reviewId).populate('paper', 'title category conference').populate('responses.question', 'text');
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    res.status(200).json(review);
  } catch (err) {
    console.error('Error fetching review by ID:', err);
    res.status(500).json({ message: 'Failed to fetch review.' });
  }
};

// Notify reviewer about assigned paper
export const notifyReviewer = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { reviewerId, paperId } = req.body;

    const reviewer = await User.findById(reviewerId);
    const paper = await Paper.findById(paperId);

    if (!reviewer || !paper) {
      res
        .status(404)
        .json({ message: "Recenzent alebo práca nebola nájdená." });
      return;
    }

    const emailContent = `
            <p>Dobrý deň, ${reviewer.first_name},</p>
            <p>Bola vám pridelená práca "<strong>${paper.title}</strong>" na recenziu.</p>
            <p>Prihláste sa do svojho účtu, aby ste získali prístup k podrobnostiam.</p>
        `;

    await sendEmail({
      to: reviewer.email,
      subject: "Nová práca na recenziu",
      html: emailContent,
    });

    res.status(200).json({ message: "Recenzent bol úspešne upozornený." });
  } catch (error) {
    console.error("Error notifying reviewer:", error);
    res.status(500).json({ error: "Nepodarilo sa upozorniť recenzenta." });
  }
};

//Download assigned paper
export const downloadPaperForReview = async (
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

    // Generate a safe filename based on ONLY the paper title (no author)
    const safeTitle = paper.title.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileExtension = path.extname(absolutePath);
    const downloadFilename = `SVK_${safeTitle}${fileExtension}`;

    // Debugging: Log filename & path
    console.log("File Path:", absolutePath);

    // Check if the file exists
    if (!absolutePath) {
      res.status(404).json({ message: "Soubor nebyl na serveru nalezen." });
      return;
    }

    // Set proper headers to enforce the filename
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    res.setHeader("Content-Type", "application/pdf");

    // Send the file for download - using the custom filename
    res.download(absolutePath, downloadFilename);
  } catch (error) {
    console.error("Chyba při stahování papíru:", error);
    res.status(500).json({ message: "Papír se nepodařilo stáhnout.", error });
  }
};

//Contact admin
export const contactAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, message, adminId } = req.body;

    // Ensure the user is authenticated (req.user should contain logged-in user data)
    const reviewerId = req.user?.userId;
    if (!reviewerId) {
      res.status(401).json({ message: "Neautorizovaný prístup." });
      return;
    }

    // Fetch the reviewer's details
    const reviewer = await User.findById(reviewerId).select("first_name last_name email");
    if (!reviewer) {
      res.status(404).json({ message: "Recenzent nebol nájdený." });
      return;
    }

    if (!subject || !message) {
      res.status(400).json({ message: "Predmet a správa sú povinné." });
      return;
    }

    // Fetch the target admin (or all admins if no adminId is specified)
    let admins;
    if (adminId) {
      admins = await User.find({ _id: adminId, role: "admin" }).select("email");
    } else {
      admins = await User.find({ role: "admin" }).select("email");
    }

    if (!admins.length) {
      res.status(404).json({ message: "Neboli nájdení žiadni administrátori." });
      return;
    }

    // Construct the email content
    const emailContent = `
      <p><strong>Od recenzenta:</strong> ${reviewer.first_name} ${reviewer.last_name} (${reviewer.email})</p>
      <p><strong>Predmet:</strong> ${subject}</p>
      <p><strong>Správa:</strong></p>
      <p>${message}</p>
    `;

    // Send email to selected admins
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `Dotaz recenzenta: ${subject}`,
        html: emailContent,
      });
    }

    res.status(200).json({ message: "Správa bola úspešne odoslaná." });

  } catch (error) {
    console.error("Error contacting admins:", error);
    res.status(500).json({ error: "Nepodarilo sa kontaktovať administrátorov." });
  }
};


// Get all admins in the system except default one
export const getAdmins = async (_req: AuthRequest, res: Response) => {
  try {
    const admins = await User.find({role: "admin"}).select("_id email");
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({message: "Nepodarilo sa načítať adminov."});
  }
};
