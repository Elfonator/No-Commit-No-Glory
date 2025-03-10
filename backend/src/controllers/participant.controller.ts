import { Response } from "express";
import Paper, { PaperStatus } from "../models/Paper";
import { AuthRequest } from "../middleware/authenticateToken";
import Category from "../models/Category";
import Conference, { ConferenceStatus } from '../models/Conference'
import { sendEmail } from "../utils/emailService";
import User from "../models/User";
import path from "path";
import fs from "fs";
import {config} from "../config";
import Review from '../models/Review'

// Submit a new paper
export const createPaper = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res
        .status(401)
        .json({ message: "Neautorizované. Používateľ nie je prihlásený." });
      return;
    }

    const {
      title,
      abstract,
      keywords,
      category,
      conference,
      authors,
      isFinal,
    } = req.body;

    console.log('Conference ->', conference);
    console.log('Body ->', req.body);

    //Validate conference
    const selectedConference = await Conference.findOne({
      _id: conference,
      status: ConferenceStatus.Ongoing,
    });

    console.log('SelectedConfernce id ->', selectedConference);

    if (!selectedConference) {
      res.status(400).json({ message: "Konferencia neexistuje alebo nie je aktuálna." });
      return;
    }

    //Validate submission deadline
    if (selectedConference.deadline_submission < new Date()) {
      res
        .status(400)
        .json({
          message:
            "Deadline na odoslanie prác pre túto konferenciu už vypršal.",
        });
      return;
    }

    //Ensure the uploaded file exists
    if (!req.file) {
      res.status(400).json({ message: "Chýba súbor na odoslanie." });
      return;
    }

    //Build file path
    //const filePath = path.join(config.uploads, "docs", conference.toString(), req.file.filename);
    const filePath = `/docs/${conference.toString()}/${req.file.filename}`;

    // Create a new paper record
    const paper = new Paper({
      user: userId,
      title,
      abstract,
      keywords,
      category,
      conference,
      authors: JSON.parse(authors),
      file_link: filePath,
      submission_date: new Date(),
      isFinal: isFinal === "true" || isFinal === true,
      deadline_date: selectedConference.deadline_submission,
    });

    const savedPaper = await paper.save();

    res.status(201).json({
      message: isFinal
        ? "Práca bola úspešne odoslaná"
        : "Práca bola uložená ako koncept.",
      paper: savedPaper,
    });
  } catch (error) {
    console.error("Error submitting paper:", error);
    res.status(500).json({ message: "Nepodarilo sa odoslať prácu.", error });
  }
};

//View all papers submitted by the user
export const viewMyPapers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res
        .status(401)
        .json({ message: "Neautorizované. Používateľ nie je prihlásený." });
      return;
    }

    const papers = await Paper.find({ user: userId })
      .populate("category", "name")
      .populate("conference", "year location date")
      .sort({ submission_date: -1 });

    res.status(200).json(papers);
  } catch (error) {
    console.error("Error fetching user papers:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať práce.", error });
  }
};

//Get paper by ID
export const getPaperById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;
    const paper = await Paper.findById(paperId)
      .populate("category", "name")
      .populate("conference", "year location date")
      .populate({
      path: "review",
      select: "recommendation comments responses"
    });

    if (!paper) {
      res.status(404).json({ message: "Práca nebola nájdená." });
      return;
    }

    res.status(200).json(paper);
  } catch (error) {
    console.error("Error fetching paper by ID:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať prácu.", error });
  }
};

export const editPaper = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { paperId } = req.params;
    const updates = req.body;

    //Ensure the paper belongs to the user
    const paper = await Paper.findOne({ _id: paperId, user: userId });
    if (!paper) {
      res
        .status(404)
        .json({
          message:
            "Práca nebola nájdená alebo nemáte oprávnenie na jej úpravu.",
        });
      return;
    }

    // Remove restricted fields from updates
    delete updates.user;
    delete updates.deadline_date;
    delete updates.reviewer;
    delete updates.awarded;

    if (typeof updates.authors === 'string') {
      try {
        updates.authors = JSON.parse(updates.authors);
      } catch (error) {
        console.error("Invalid authors format:", updates.authors);
        res.status(400).json({ message: "Invalid authors format." });
        return;
      }
    }

    //Handle file upload if a new file is provided
    if (req.file) {
      //const newFilePath = path.join(config.uploads, "docs", paper.conference.toString(), req.file.filename);
      const newFilePath = `/docs/${paper.conference.toString()}/${req.file.filename}`;

      //Delete the old file if it exists
      if (paper.file_link) {
        try {
          const oldFilePath = path.join(config.uploads, paper.file_link.replace('/docs/', 'docs/'));
          await fs.promises.access(oldFilePath, fs.constants.F_OK);
          await fs.promises.unlink(oldFilePath);
          console.log(`Old document deleted: ${oldFilePath}`);
        } catch (err) {
          console.warn("Failed to delete old file!", err);
        }
      }
      paper.file_link = newFilePath;
    }

    Object.assign(paper, updates);

    if (!paper.deadline_date) {
      const conference = await Conference.findById(paper.conference);
      if (conference) {
        paper.deadline_date = conference.deadline_submission;
      }
    }

    const updatedPaper = await paper.save();

    res.status(200).json({
      message: "Práca bola úspešne aktualizovaná.",
      paper: {
        ...updatedPaper.toObject(),
        file_link: updatedPaper.file_link, // Ensure file_link is always returned
      },
    });
  } catch (error) {
    console.error("Error editing paper:", error);
    res
      .status(500)
      .json({ message: "Nepodarilo sa aktualizovať prácu.", error });
  }
};

export const getReviewByPaperId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paperId } = req.params;
    const review = await Review.findOne({ paper: paperId })
      .populate("responses.question")
      .select("recommendation comments responses");

    if (!review) {
      res.status(404).json({ message: "Recenzia pre túto prácu nebola nájdená." });
      return;
    }

    res.status(200).json(review);
  } catch (error) {
    console.error("Error fetching review by paper ID:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať recenziu.", error });
  }
};

//Get Conferences (only with status Aktuálna)
export const getConferences = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentDate = new Date();
    const conferences = await Conference.find({
      status: "Aktuálna",
    }).select(
      "_id year date location university start_date end_date deadline_submission",
    );

    res.status(200).json(conferences);
  } catch (error) {
    console.error("Error fetching conferences:", error);
    res
      .status(500)
      .json({ message: "Nepodarilo sa načítať konferencie", error });
  }
};

export const deletePaper = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { paperId } = req.params;
    const paper = await Paper.findById(paperId);

    if (!paper) {
      res.status(404).json({ message: "Práca nebola nájdená." });
      return;
    }

    if (paper.status !== "Draft") {
      res.status(400).json({ message: "Len koncepty môžu byť vymazané." });
      return;
    }

    await Paper.findByIdAndDelete(paperId);
    res.status(200).json({ message: "Práca bola úspešne vymazaná." });
  } catch (error) {
    console.error("Error deleting paper:", error);
    res.status(500).json({ message: "Nepodarilo sa vymazať prácu." });
  }
};

//Get Categories (only active)
export const getCategories = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).select(
      "_id name",
    );
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať sekcie.", error });
  }
};

//Notify participant about status or review
export const notifyParticipant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId, paperId, newStatus } = req.body;

    const participant = await User.findById(userId);
    const paper = await Paper.findById(paperId);

    if (!participant || !paper) {
      res.status(404).json({ message: "Účastník alebo práca sa nenašli." });
      return;
    }

    let emailContent = `
            <p>Dobrý deň, ${participant.first_name},</p>
            <p>Stav vášho príspevku "<strong>${paper.title}</strong>" bol aktualizovaný na "<strong>${newStatus}</strong>".</p>
        `;

    if (newStatus === PaperStatus.AcceptedWithChanges) {
      emailContent += `
                <p>Prosím, prihláste sa do svojho účtu a aktualizujte svoj príspevok podľa požadovaných zmien.</p>
            `;
    } else if (newStatus === PaperStatus.Rejected) {
      emailContent += `<p>S ľútosťou vám oznamujeme, že váš príspevok nebol prijatý.</p>`;
    }

    emailContent += `<p>S pozdravom,<br />tím SciSubmit</p>`;

    await sendEmail({
      to: participant.email,
      subject: `Aktualizácia stavu práce: ${newStatus}`,
      html: emailContent,
    });

    res
      .status(200)
      .json({ message: "Účastník bol upozornený na zmenu stavu práce." });
  } catch (error) {
    console.error("Error notifying participant:", error);
    res
      .status(500)
      .json({ message: "Nepodarilo sa upozorniť účastníka.", error });
  }
};
