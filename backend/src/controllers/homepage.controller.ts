import { Request, Response } from "express";
import Homepage from "../models/Homepage";
import Conference, { ConferenceStatus, IConference } from '../models/Conference'
import Category from "../models/Category";

export const getHomepageData = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch the homepage data
    const homepage = await Homepage.findOne().select("program templates committees conferenceFiles");

    // Fetch the ongoing conference
    let ongoingConference = await Conference.findOne({
      status: ConferenceStatus.Ongoing,
    })
      .select("year location university date start_date end_date deadline_submission submission_confirmation deadline_review deadline_correction")
      .lean() as IConference | null;

    // If no ongoing conference, get the latest ended one (by date or year)
    if (!ongoingConference) {
      ongoingConference = await Conference.findOne({
        status: ConferenceStatus.Completed,
      })
        .sort({ end_date: -1 })
        .select("year location university date start_date end_date deadline_submission submission_confirmation deadline_review deadline_correction")
        .lean() as IConference | null;
    }

    // Fetch active categories
    const activeCategories = await Category.find({ isActive: true }).select("name").sort({ name: 1 });

    res.status(200).json({
      homepage,
      committees: homepage?.committees || [],
      ongoingConference,
      activeCategories,
    });
  } catch (error) {
    res.status(500).json({
      message: "Nepodarilo sa načítať údaje domovskej stránky",
      error,
    });
  }
};




