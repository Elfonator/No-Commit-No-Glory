import { Response } from "express";
import Review from "../models/Review";
import Paper, { IPaper, PaperStatus } from '../models/Paper'
import { AuthRequest } from "../middleware/authenticateToken";
import { sendEmail } from "../utils/emailService";
import User from "../models/User";
import Question from "../models/Question";
import path from "path";
import {config} from "../config";
import { setEndOfDay } from '../utils/dateUtils'
import { IConference } from '../models/Conference'

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
    const submittedPaperIds = await Review.find({
      reviewer: reviewerId,
      isDraft: false
    }).distinct('paper');

    // Find papers that have NOT been reviewed (no drafts or submitted reviews)
    const pendingPapers = await Paper.find({
      reviewer: reviewerId,
      _id: { $nin: submittedPaperIds }
    })
      .populate('category', 'name')
      .populate('conference', 'year location date end_date deadline_review');

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
          { path: 'conference', select: 'year location date deadline_review' },
        ],
      })
      .populate('responses.question', 'text') // Populate question text
      .sort({ created_at: -1 }); // Sort by most recent

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Nepodarilo sa načítať recenzie' });
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
    if (!paper || !reviewer || (!responses || responses.length === 0) && !isDraft || !recommendation) {
      res.status(400).json({ message: "Chýbajú povinné polia" });
      return;
    }

    // Deadline check
    const paperDoc = await Paper.findById(paper).populate('conference');
    if (!paperDoc || !paperDoc.conference) {
      res.status(400).json({ message: 'Práca alebo konferencia sa nenašli' });
      return;
    }
    const conference = paperDoc?.conference as unknown as IConference;
    const deadline = setEndOfDay(new Date(conference.deadline_review));

    if (new Date() > deadline) {
      res.status(403).json({ message: 'Termín na vytvorenie recenzie už vypršal' });
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

    res.status(201).json({ message: "Recenzia bola úspešne vytvorená", review: newReview });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Vytvorenie recenzie zlyhalo" });
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

    // Populate paper and conference with review
    const review = await Review.findById(reviewId).populate({
      path: 'paper',
      populate: { path: 'conference' }
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    // Already submitted
    if (review.isDraft === false) {
      res.status(403).json({ message: 'Odoslanú recenziu nie je možné upravovať.' });
    }

    // Deadline check
    const paper = review.paper as unknown as IPaper;
    if (!paper || !paper.conference) {
      res.status(400).json({ message: 'Práca alebo konferencia sa nenašli' });
    }

    const conference = paper.conference as unknown as IConference;
    const deadline = setEndOfDay(new Date(conference.deadline_review));
    if (new Date() > deadline) {
      res.status(403).json({ message: 'Termín na úpravu recenzie už vypršal' });
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
const appendReviewToPaper = async (paperId: string, reviewId: string): Promise<boolean> => {
  try {
    console.log("Setting review for paper - Paper ID:", paperId, "Review ID:", reviewId);

    // Get the reviewer ID from the current review
    const currentReview = await Review.findById(reviewId);
    if (!currentReview) {
      console.error('Review not found');
      return false;
    }

    // Simply update the paper with the new review ID
    const result = await Paper.findByIdAndUpdate(
        paperId,
        { review: reviewId },
        { new: true }
    );

    if (!result) {
      console.error('Paper not found');
      return false;
    }

    console.log("Review successfully set for paper");
    return true;
  } catch (error) {
    console.error('Error setting review for paper:', error);
    return false;
  }
};

// The original appendReview function for direct API calls
export const appendReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const { paperId } = req.params;
  const { reviewId } = req.body;

  try {
    const success = await appendReviewToPaper(paperId, reviewId);

    if (!success) {
      res.status(404).json({ message: 'Paper not found' });
      return;
    }

    res.status(200).json({ message: 'Recenzia pripojená k práci' });
  } catch (error) {
    //console.error('Error appending review to paper:', error);
    res.status(500).json({ message: 'Nepodarilo sa pripojiť recenziu k práci' });
  }
};

// Updated sendReview function
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

    review.isDraft = false;

    await review.save();

    // Update paper status based on recommendation
    const paperStatus = getPaperStatusFromRecommendation(review.recommendation);
    const paper = await Paper.findByIdAndUpdate(review.paper, { status: paperStatus });

    if (paper) {
      // Get the participant/author
      const participant = await User.findById(paper.user);

      if (participant) {
        // Copy-pasted email notification code
        let emailContent = `
          <p>Dobrý deň, ${participant.first_name},</p>
          <p>Stav váše práce "<strong>${paper.title}</strong>" bol aktualizovaný na "<strong>${paperStatus}</strong>".</p>
        `;

        if (paperStatus === PaperStatus.AcceptedWithChanges) {
          emailContent += `
            <p>Prosím, prihláste sa do svojho účtu a aktualizujte svoju prácu podľa požadovaných zmien.</p>
          `;
        } else if (paperStatus === PaperStatus.Rejected) {
          emailContent += `<p>S ľútosťou vám oznamujeme, že váša práca nebola prijatá.</p>`;
        }

        // Add the website link
        emailContent += `
          <p>Pre viac informácií navštívte <a href="https://svk-ukf.sk/">svk-ukf.sk</a>.</p>
          <p>S pozdravom,<br />tím SciSubmit</p>
        `;

        await sendEmail({
          to: participant.email,
          subject: `Aktualizácia stavu práce: ${paperStatus}`,
          html: emailContent,
        });
      }
    }

    // Append review to paper using the helper function
    const success = await appendReviewToPaper(review.paper.toString(), reviewId);
    if (!success) {
      console.warn("Warning: Failed to append review to paper");
    }

    res.status(200).json({ message: 'Recenzia bola odoslaná.', review });
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
    case "Publikovať so zmenami":
      return PaperStatus.AcceptedWithChanges;
    default:
      return PaperStatus.UnderReview;
  }
};

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
