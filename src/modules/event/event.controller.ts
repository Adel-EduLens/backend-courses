import { Request, Response, NextFunction } from 'express';
import Event from './event.model.js';

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Public
 */
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get past events
 * @route   GET /api/events/past
 * @access  Public
 */
export const getPastEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ status: 'past' }).sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get upcoming events
 * @route   GET /api/events/upcoming
 * @access  Public
 */
export const getUpcomingEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ status: 'upcoming' }).sort({ date: 1 });
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private/Admin
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an event
 * @route   PATCH /api/events/:id
 * @access  Private/Admin
 */
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private/Admin
 */
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
