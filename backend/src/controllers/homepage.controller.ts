import { Request, Response } from "express";
import Homepage from "../models/Homepage";
import Conference, { ConferenceStatus, IConference } from '../models/Conference'
import Category from "../models/Category";
import Paper, { PaperStatus } from '../models/Paper'

export const getHomepageData = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch homepage data
    const homepage = await Homepage.findOne().select("program templates committees conferenceFiles");

    // Fetch the ongoing or last completed conference
    let ongoingConference = await Conference.findOne({
      status: ConferenceStatus.Ongoing,
    })
      .select("year location university date start_date end_date deadline_submission submission_confirmation deadline_review deadline_correction")
      .lean() as IConference | null;

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

    // Fetch accepted papers from the latest conference
    const latestConf = await Conference.findOne({}, {}, { sort: { startDate: -1 } });
    let acceptedPapers: Record<string, { title: string; authors: string[] }[]> = {};

    if (latestConf) {
      const acceptedStatuses = [
        PaperStatus.Accepted,
        PaperStatus.AcceptedWithChanges,
        PaperStatus.SubmittedAfterReview,
      ];

      const papers = await Paper.find({
        conference: latestConf._id,
        status: { $in: acceptedStatuses },
      }).populate('category', 'name');

      acceptedPapers = papers.reduce((acc, paper) => {
        const categoryName = ((paper.category as unknown) as { name: string })?.name || 'Nezaradené';
        const authorNames = paper.authors.map((a) => `${a.firstName} ${a.lastName}`);

        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push({ title: paper.title, authors: authorNames });

        return acc;
      }, {} as Record<string, { title: string; authors: string[] }[]>);
    }

    //Fetch awarded papers from the lates conference
    let awardedPapers: Record<string, { title: string; authors: string[] }[]> = {};

    if (latestConf) {
      const papers = await Paper.find({
        conference: latestConf._id,
        awarded: true,
      }).populate('category', 'name');

      awardedPapers = papers.reduce((acc, paper) => {
        const categoryName = ((paper.category as unknown) as { name: string })?.name || 'Nezaradené';
        const authorNames = paper.authors.map((a) => `${a.firstName} ${a.lastName}`);

        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push({ title: paper.title, authors: authorNames });

        return acc;
      }, {} as Record<string, { title: string; authors: string[] }[]>);
    }

    // Filter past conference documents
    const pastConferenceFiles = (homepage?.conferenceFiles || []).filter(file => typeof file.conference === 'string');


    res.status(200).json({
      homepage,
      committees: homepage?.committees || [],
      ongoingConference,
      activeCategories,
      acceptedPapers,
      awardedPapers,
      pastConferenceFiles: homepage?.conferenceFiles || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Nepodarilo sa načítať údaje domovskej stránky",
      error,
    });
  }
};



