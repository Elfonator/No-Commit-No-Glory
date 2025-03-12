import { body, check, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import Role from "../models/Role";
import Question from "../models/Question";

//Validation rules for user registration
export const registerValidationRules = [
  body("first_name").notEmpty().withMessage("First name is required"),
  body("last_name").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
  body("university").notEmpty().withMessage("University is required"),
  body("role").notEmpty().withMessage("Role is required"),
];

export const loginValidationRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

//Validation rules for email verification
export const verifyEmailValidationRules = [
  check("token", "Verification token is required")
    .exists()
    .isString()
    .withMessage("Token must be a string")
    .bail()
    .trim()
    .escape(),
];

//Validation rules for profile update
export const updateProfileValidationRules = [
  body("first_name")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("last_name")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("university")
    .optional()
    .notEmpty()
    .withMessage("University cannot be empty"),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

//Validation rules for admin to edit user status and role
export const validateEditUserDetails = [
  body("status")
    .optional()
    .isIn(["Aktívny", "Neaktívny", "Pozastavený", "Čakajúci"])
    .withMessage("Invalid status value"),
  body("role")
    .optional()
    .custom(async (value) => {
      const roleExists = await Role.findById(value.name);
      if (!roleExists) {
        throw new Error("Invalid role value");
      }
      return true;
    }),
  body("email").optional().isEmail().withMessage("Invalid email address"),
];

export const validateSubmitPaper = [
  body("title")
    .notEmpty()
    .withMessage("Vyžaduje sa názov")
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters."),
  body("abstract")
    .notEmpty()
    .withMessage("Vyžaduje sa abstrakt")
    .custom((value) => {
      const wordCount = value.trim().split(/\s+/).length; // Count words in the abstract
      if (wordCount > 150) {
        throw new Error("Abstrakt nesmie presiahnuť 150 slov");
      }
      return true;
    }),
  body("keywords")
    .isArray({ min: 1 })
    .withMessage("Vyžaduje sa aspoň jedno kľúčové slovo")
    .custom((keywords: string[]) => keywords.every((k) => true))
    .withMessage("Kľúčové slová musia byť pole reťazcov"),
  body("file_link")
    .notEmpty()
    .withMessage("Vyžaduje sa odkaz na súbor")
    .isURL()
    .withMessage("File link must be a valid URL."),
  body("category").notEmpty().withMessage("Kategória je povinná"),
  body("conference").notEmpty().withMessage("Vyžaduje sa konferencia"),
  body("authors")
    .isArray({ min: 1 })
    .withMessage("Vyžaduje sa aspoň jeden autor")
    .custom((authors) =>
      authors.every((author: { firstName: string; lastName: string }) => true),
    )
    .withMessage("Každý autor musí mať platné meno a priezvisko"),
];

// Validation rules for review submission
export const validateReviewSubmission = [
  // Validate required fields
  body("responses")
    .notEmpty()
    .withMessage("Responses are required.")
    .isArray()
    .withMessage("Responses must be an array of { question, answer } objects.")
    .custom(async (responses) => {
      for (const response of responses) {
        if (!response.question || !response.answer) {
          throw new Error(
            "Each response must include a question ID and an answer.",
          );
        }

        // Validate question ID
        const question = await Question.findById(response.question);
        if (!question) {
          throw new Error(`Invalid question ID: ${response.question}`);
        }

        // Validate the answer based on the question type
        switch (question.type) {
          case "rating": // Rating
            if (
              typeof response.answer !== "number" ||
              response.answer < question.options!.min ||
              response.answer > question.options!.max
            ) {
              throw new Error(
                `Invalid rating for question ID: ${response.question}`,
              );
            }
            break;
          case "yes_no": // Yes/No
            if (response.answer !== "Áno" && response.answer !== "Nie") {
              throw new Error(
                `Invalid yes/no answer for question ID: ${response.question}`,
              );
            }
            break;
          case "text": // Text
            if (typeof response.answer !== "string") {
              throw new Error(
                `Invalid text answer for question ID: ${response.question}`,
              );
            }
            break;
          default:
            throw new Error(
              `Unknown question type for question ID: ${response.question}`,
            );
        }
      }
      return true;
    }),
  body("recommendation")
    .notEmpty()
    .withMessage("Recommendation is required.")
    .isIn(["Publikovať", "Publikovať so zmenami", "Odmietnuť"])
    .withMessage("Invalid recommendation value."),
  body("comments")
    .optional()
    .isString()
    .withMessage("Comments must be a string."),
];

// Validation rules for updating a review
export const validateReviewUpdate = [
  body("responses")
    .optional()
    .isArray()
    .withMessage("Responses must be an array of { question, answer } objects.")
    .custom(async (responses) => {
      for (const response of responses) {
        if (!response.question || !response.answer) {
          throw new Error(
            "Each response must include a question ID and an answer.",
          );
        }

        // Validate question ID
        const questionExists = await Question.findById(response.question);
        if (!questionExists) {
          throw new Error(`Invalid question ID: ${response.question}`);
        }
      }
      return true;
    }),
  body("comments")
    .optional()
    .isString()
    .withMessage("Comments must be a string."),
  body("recommendation")
    .optional()
    .isIn(["Publikovať", "Publikovať so zmenami", "Odmietnuť"])
    .withMessage(
      "Recommendation must be one of: 'Publikovať', 'Publikovať so zmenami', 'Odmietnuť'.",
    ),
];

//Middleware to check validation results
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};
