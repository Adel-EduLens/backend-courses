import express from 'express';
import { createCourse, updateCourse, deleteCourse, getAdminCourses, getAdminCourse, getEnrollments, createRound, updateRound, deleteRound, createLecture, updateLecture, deleteLecture, notifyLectureStudents } from './course.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createCourseSchema, updateCourseSchema, createRoundSchema, updateRoundSchema, createLectureSchema, updateLectureSchema } from './course.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { upload } from '../../utils/upload.js';
import { normalizeCourseFormData } from '../../middlewares/normalization.middleware.js';

const router = express.Router();

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getAdminCourses);
router.post('/', upload.single('img'), normalizeCourseFormData, validateRequest(createCourseSchema), createCourse);
router.get('/enrollments', getEnrollments);
router.get('/:id', getAdminCourse);
router.patch('/:id', upload.single('img'), normalizeCourseFormData, validateRequest(updateCourseSchema), updateCourse);
router.delete('/:id', deleteCourse);

// Round management
router.post('/rounds', validateRequest(createRoundSchema), createRound);
router.patch('/rounds/:id', validateRequest(updateRoundSchema), updateRound);
router.delete('/rounds/:id', deleteRound);

// Lecture management
router.post('/lectures', validateRequest(createLectureSchema), createLecture);
router.post('/lectures/:id/notify-students', notifyLectureStudents);
router.patch('/lectures/:id', validateRequest(updateLectureSchema), updateLecture);
router.delete('/lectures/:id', deleteLecture);

export default router;
