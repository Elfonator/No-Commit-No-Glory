import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import * as argon2 from "argon2";
import { config } from "../config";
import User, { UserStatus } from "../models/User";
import { AuthRequest } from "../middleware/authenticateToken";
import { sendEmail } from '../utils/emailService'
import { randomBytes } from 'node:crypto'

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    //Validate input
    if (!email || !password) {
      res.status(400).json({ message: "Email a heslo sú povinné" });
      return;
    }

    //Find user and validate credentials
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "Používateľ nebol nájdený" });
      return;
    }

    //Verify password
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Neplatné prihlasovacie údaje" });
      return;
    }

    //Check if the user is verified
    if (!user.isVerified) {
      res
        .status(403)
        .json({ message: "Prosím overte svoj email pred prihlásením" });
      return;
    }

    //Check user account status
    if (
      user.status === UserStatus.Pending ||
      user.status === UserStatus.Inactive ||
      user.status === UserStatus.Suspended
    ) {
      res.status(403).json({
        message: "Nemôžete sa prihlásiť, váš účet nie je aktívny",
      });
      return;
    }

    //Generate JWT (access token)
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "1h" }, // Short-lived access token
    );

    //Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: "7d" }, // Longer expiration for refresh token
    );

    //Save the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    //Send tokens and user data in response
    res.status(200).json({
      token,
      refreshToken, // Include the refresh token in the response
      role: user.role,
      message: "Prihlásenie bolo úspešne",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Prihlásenie zlyhalo", error });
  }
};

export const logoutUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;

    // Clear the refresh token
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.status(200).json({ message: "Odhlásenie bolo úspešné" });
  } catch (error) {
    res.status(500).json({ message: "Odhlásenie zlyhalo", error });
  }
};

export const refreshToken = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    console.log("Request Body:", req.body);
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      res.status(400).json({ message: "No refresh token provided" });
      return;
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
      userId: string;
    };

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    // Generate a new access token
    const newToken = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: "1h" },
    );

    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res
      .status(401)
      .json({ message: "Invalid or expired refresh token", error: error });
  }
};

// Request for password reset
export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email je povinný." });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "Používateľ s týmto emailom neexistuje." });
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');

    // Store token in verificationToken field
    user.verificationToken = resetToken;
    await user.save();
    // Construct password reset URL
    const resetUrl = `${config.baseFrontendUrl}/reset-password?token=${resetToken}`;

    // Send reset email
    await sendEmail({
      to: user.email,
      subject: "Obnova hesla",
      html: `<p>Kliknite na odkaz nižšie na resetovanie hesla:</p>
             <a href="${resetUrl}">Obnoviť heslo</a>
             <p>Ak ste túto žiadosť neodoslali, ignorujte tento e-mail.</p>`,
    });

    res.status(200).json({ message: "Odkaz na obnovu hesla bol odoslaný na váš email." });

  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ message: "Nepodarilo sa odoslať odkaz na resetovanie hesla." });
  }
};

// Password reset
export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: "Token a nové heslo sú povinné." });
      return;
    }

    // Find user by token
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      res.status(400).json({ message: "Neplatný alebo expirovaný token." });
      return;
    }

    // Hash the new password
    user.password = await argon2.hash(newPassword);

    // Clear the `verificationToken` after successful password reset
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: "Vaše heslo bolo úspešne zmenené." });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Nepodarilo sa obnoviť heslo." });
  }
};