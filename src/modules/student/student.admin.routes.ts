import express from 'express';
import { getAllStudents, getStudentDetails } from './student.admin.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// All routes are protected (Admin only via global middleware in index.ts or local)
router.use(protect);

router.get('/', getAllStudents);
router.get('/:id', getStudentDetails);

export default router;
