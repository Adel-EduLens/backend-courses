import { Request, Response, NextFunction } from 'express';
import Course from './course.model.js';
import Enrollment from './enrollment.model.js';

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await Course.find();
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in a course (Public)
 * @route   POST /api/courses/enroll
 * @access  Public
 */
export const enrollInCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, fullName, email, phone, additionalInfo } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      courseId,
      fullName,
      email,
      phone,
      additionalInfo
    });

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in the course!',
      data: enrollment
    });
  } catch (error: any) {
    // Handle duplicate enrollment
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this course with this email.'
      });
    }
    next(error);
  }
};
/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private/Admin
 */
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a course
 * @route   PATCH /api/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a course
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all enrollments
 * @route   GET /api/courses/enrollments
 * @access  Private/Admin
 */
export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await Enrollment.find().populate('courseId', 'title');
    res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
};
