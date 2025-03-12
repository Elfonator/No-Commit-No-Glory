import nodemailer from "nodemailer";
import { config } from "../config";
import path from "path";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    cid?: string;
  }>;
}

const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: Number(config.emailPort) || 587,
  secure: false, // Use TLS
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
} as nodemailer.TransportOptions);

//Sends an email with the given options.
export const sendEmail = async (options: EmailOptions) => {
  try {
    const emailOptions = {
      from: `"SciSubmit" <${config.emailUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
      attachments: [],
    };

    await transporter.sendMail(emailOptions);
    //console.log(`Email sent to ${options.to}`);
  } catch (error) {
    //console.error(`Failed to send email to ${options.to}:`, error);
    throw new Error("Failed to send email");
  }
};

//Generates a verification email template
export const generateVerificationEmail = (verificationUrl: string): string => `
    <div style="position: relative; font-family: Arial, sans-serif; line-height: 1.6; color: #2C3531; background-color: #F7F7F7; padding: 20px; border: 1px solid #DDD; border-radius: 8px; max-width: 600px; margin: auto;">
        <div style="text-align: center; margin: 0; padding: 0;">
            <img src="cid:scisubmit-logo" alt="SciSubmit Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
        </div>
        <h2 style="color: #116466; font-size: 24px; text-align: center;">Overte svoju e-mailovú adresu</h2>
        <p style="color: #2C3531; margin: 10px 0;">Dobrý deň,</p>
        <p style="color: #2C3531; margin: 10px 0;">Ďakujeme za registráciu! Kliknite na tlačidlo nižšie a overte svoju e-mailovú adresu:</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background-color: #BC4639; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px;">Verify Email</a>
        </div>
        <p style="color: #2C3531; margin: 10px 0;">Ak tlačidlo nefunguje, skopírujte a vložte nasledujúci odkaz do svojho prehliadača:</p>
        <p style="font-size: 10px; word-wrap: break-word; color: #116466;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #DDD; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">Ak ste si účet nevytvorili, môžete tento e-mail ignorovať.</p>
    </div>`;
