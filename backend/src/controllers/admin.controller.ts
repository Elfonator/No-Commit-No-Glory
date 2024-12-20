import { Request, Response } from 'express';
import Database from '../config/db';

const db = Database.getInstance();
const User = db.getConnection().model('User');
const Conference = db.getConnection().model('Conference');
const Category = db.getConnection().model('Category');

//Get all users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find().populate('role');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error });
    }
};

//Manage user roles
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, role } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        );

        if (!updatedUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json({ message: 'User role updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
};

//Create a new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        const newCategory = new Category({ name });
        await newCategory.save();
        res.status(201).json({ message: 'Category created successfully', category: newCategory });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create category', error });
    }
};

//Get all conferences
export const getAllConferences = async (_req: Request, res: Response): Promise<void> => {
    try {
        const conferences = await Conference.find().populate('categories').populate('user');
        res.status(200).json(conferences);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch conferences', error });
    }
};

//Create a new conference
export const createConference = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            year,
            location,
            university,
            status,
            start_date,
            end_date,
            categories,
            deadline_submission,
            deadline_review,
            user,
        } = req.body;

        const newConference = new Conference({
            year,
            location,
            university,
            status: status || 'upcoming', // Default to 'upcoming'
            start_date,
            end_date,
            categories,
            deadline_submission,
            deadline_review,
            created_at: new Date(),
            user, //admin user created the conference
        });

        await newConference.save();
        res.status(201).json({ message: 'Conference created successfully', conference: newConference });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create conference', error });
    }
};

//Update existing conference
export const updateConference = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conferenceId } = req.params;
        const updates = req.body;

        const updatedConference = await Conference.findByIdAndUpdate(conferenceId, updates, { new: true });
        if (!updatedConference) {
            res.status(404).json({ message: 'Conference not found' });
            return;
        }

        res.status(200).json({ message: 'Conference updated successfully', conference: updatedConference });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update conference', error });
    }
};

/*
//Delete conference
export const deleteConference = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conferenceId } = req.params;

        const deletedConference = await Conference.findByIdAndDelete(conferenceId);
        if (!deletedConference) {
            res.status(404).json({ message: 'Conference not found' });
            return;
        }

        res.status(200).json({ message: 'Conference deleted successfully', conference: deletedConference });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete conference', error });
    }
};
 */
