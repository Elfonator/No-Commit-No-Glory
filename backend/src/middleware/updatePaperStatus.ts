
/*
import Conference, { ConferenceStatus } from "../models/Conference";
import Paper, { PaperStatus } from "../models/Paper";

export const updatePaperStatus = async (): Promise<void> => {
  try {
    const currentDate = new Date();

    // Get all ongoing conferences
    const ongoingConferences = await Conference.find({
      status: ConferenceStatus.Ongoing,
    });

    for (const conference of ongoingConferences) {
      if (conference.deadline_submission < currentDate) {
        // Update papers to Submitted after the deadline
        const result = await Paper.updateMany(
          { conference: conference._id, status: PaperStatus.Draft },
          { $set: { status: PaperStatus.Submitted } },
        );
        console.log(
          `Updated ${result.modifiedCount} papers for conference: ${conference._id}`,
        );
      }
    }

    console.log(`Resubmission enabled for papers.`);
  } catch (error) {
    console.error("Error updating paper statuses:", error);
  }
};
*/