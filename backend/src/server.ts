import app from "./app";
import cron from "node-cron";
import { updateConferenceStatus } from "./middleware/updateConferenceStatus";
import { updatePaperStatus } from "./middleware/updatePaperStatus";
import { prepareDatabase } from "./seed";

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Run database seeding only if needed (non-blocking)
(async () => {
  try {
    console.log("Checking if database needs seeding...");
    //await prepareDatabase();
    console.log("Database ready.");
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
})();

// Schedule the cron job
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily job to update statuses");
  try {
    await updateConferenceStatus();
    await updatePaperStatus();
    console.log("All statuses updated successfully");
  } catch (error) {
    console.error("Error running daily job to update statuses:", error);
  }
});
