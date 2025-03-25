import app from "./app";
import cron from "node-cron";
import { updateConferenceStatus } from "./middleware/updateConferenceStatus";

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Schedule the cron job
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily job to update statuses");
  try {
    await updateConferenceStatus();
    console.log("All statuses updated successfully");
  } catch (error) {
    console.error("Error running daily job to update statuses:", error);
  }
});
