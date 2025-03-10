"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConferenceStatus = void 0;
var mongoose_1 = require("mongoose");
var ConferenceStatus;
(function (ConferenceStatus) {
  ConferenceStatus["Upcoming"] = "Nadch\u00E1dzaj\u00FAca";
  ConferenceStatus["Ongoing"] = "Aktu\u00E1lna";
  ConferenceStatus["Completed"] = "Ukon\u010Den\u00E1";
  ConferenceStatus["Canceled"] = "Zru\u0161en\u00E1";
})(ConferenceStatus || (exports.ConferenceStatus = ConferenceStatus = {}));
var ConferenceSchema = new mongoose_1.Schema(
  {
    year: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          //Validate that the year is a four-digit number between 2010 and the current year
          var currentYear = new Date().getFullYear();
          return value >= 2010 && value <= currentYear + 5;
        },
        message: "Year must be a valid four-digit year.",
      },
    },
    location: { type: String, required: true },
    university: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(ConferenceStatus),
      default: ConferenceStatus.Upcoming,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    deadline_submission: { type: Date, required: true },
    submission_confirmation: { type: Date, required: false },
    deadline_review: { type: Date, required: false },
    deadline_correction: { type: Date, required: false },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "conferences" },
);
exports.default = mongoose_1.default.model("Conference", ConferenceSchema);
