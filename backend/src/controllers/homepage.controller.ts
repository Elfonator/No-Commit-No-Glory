import { Request, Response } from "express";
import Homepage from "../models/Homepage";
import Conference, { ConferenceStatus } from "../models/Conference";
import Category from "../models/Category";
import { AuthRequest } from '../middleware/authenticateToken'

export const getHomepageData = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch the homepage data
    const homepage = await Homepage.findOne().select("program templates committees conferenceFiles");
    //console.log(homepage)
    // Fetch the ongoing conference
    const ongoingConference = await Conference.findOne({
      status: ConferenceStatus.Ongoing,
    }).select(
      "year location university date start_date end_date deadline_submission submission_confirmation deadline_review deadline_correction"
    );

    //console.log(ongoingConference)

    // Fetch active categories
    const activeCategories = await Category.find({ isActive: true }).select("name").sort({ name: 1 });
    //console.log(activeCategories)

    res.status(200).json({
      homepage,
      ongoingConference,
      activeCategories,
    });
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    res.status(500).json({
      message: "Nepodarilo sa načítať údaje domovskej stránky",
      error,
    });
  }
};

// Update Program in Homepage
export const updateProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { program } = req.body;
    let programDocumentUrl = "";

    // Check if a file is uploaded
    if (req.file) {
      programDocumentUrl = `/uploads/${req.file.filename}`;
    }

    const homepage = await Homepage.findOneAndUpdate(
      {},
      { program, ...(programDocumentUrl && { programDocumentUrl }) },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Program successfully updated",
      homepage,
    });
  } catch (error) {
    console.error("Error updating program:", error);
    res.status(500).json({ message: "Nepodarilo sa aktualizovať program", error });
  }
};



