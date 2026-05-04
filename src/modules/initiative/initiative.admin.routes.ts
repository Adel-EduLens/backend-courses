import express, { Request, Response, NextFunction } from 'express';
import { createInitiativeCourse, updateInitiativeCourse, deleteInitiativeCourse, createInitiative, updateInitiative, deleteInitiative, addInitiativeCourseLecture, updateInitiativeCourseLecture, deleteInitiativeCourseLecture, notifyInitiativeLectureStudents, getInitiativeCourseEnrollments, getInitiativePackageEnrollments } from './initiative.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createInitiativeCourseSchema, updateInitiativeCourseSchema, createInitiativeSchema, updateInitiativeSchema } from './initiative.validation.js';
import { multerMiddleware } from '../../middlewares/middleware.js';

const router = express.Router();

const initiativeUpload = multerMiddleware({
  getPath: (req) => {
    return ['initiatives'];
  }
});

const normalizeInitiativePayload = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body.payload === 'string') {
    try {
      const parsed = JSON.parse(req.body.payload);
      Object.assign(req.body, parsed);
      delete req.body.payload;
    } catch (e) {
      //
    }
  }

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const path = '/' + file.path.split('/public/')[1];
      if (file.fieldname === 'img') {
        req.body.img = path;
      } else if (file.fieldname.startsWith('trackImage_')) {
        // fieldname format: trackImage_<index>
        const tIdx = Number(file.fieldname.split('trackImage_')[1]);
        if (
          !isNaN(tIdx) && 
          req.body.tracks?.[tIdx]
        ) {
          req.body.tracks[tIdx].img = path;
        }
      } else if (file.fieldname === 'packageCourseImage') {
        const pIdx = Number(req.body.targetPackageIndex);
        const cIdx = Number(req.body.targetCourseIndex);
        if (
          !isNaN(pIdx) && 
          !isNaN(cIdx) && 
          req.body.packages?.[pIdx]?.courses?.[cIdx]
        ) {
          req.body.packages[pIdx].courses[cIdx].img = path;
        }
      }
    }
  }

  next();
};

/**
 * All routes in this file are protected and restricted to admins
 */
router.use(protect);
router.use(restrictTo('admin'));

router.post('/all', initiativeUpload.any(), normalizeInitiativePayload, validateRequest(createInitiativeSchema), createInitiative);
router.patch('/all/:id', initiativeUpload.any(), normalizeInitiativePayload, validateRequest(updateInitiativeSchema), updateInitiative);
router.delete('/all/:id', deleteInitiative);
router.post('/', validateRequest(createInitiativeCourseSchema), createInitiativeCourse);
router.patch('/:id', validateRequest(updateInitiativeCourseSchema), updateInitiativeCourse);
router.delete('/:id', deleteInitiativeCourse);

// Initiative course lectures
router.post('/:id/lectures', addInitiativeCourseLecture);
router.patch('/:id/lectures/:lectureId', updateInitiativeCourseLecture);
router.delete('/:id/lectures/:lectureId', deleteInitiativeCourseLecture);
router.post('/:id/lectures/:lectureId/notify-students', notifyInitiativeLectureStudents);
router.get('/courses/:id/enrollments', getInitiativeCourseEnrollments);
router.get('/packages/:id/enrollments', getInitiativePackageEnrollments);

export default router;
