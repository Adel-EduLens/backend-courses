import { Request, Response, NextFunction } from 'express';
import { InitiativeCourse } from './initiative_course.model.js';
import { Initiative } from './initiative.model.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { createPaymentSession, calculateAmountWithFees } from '../../utils/kashier.service.js';
import { sendBulkMessage } from '../../utils/wapilot.service.js';
import { PromoCode } from '../promoCode/promoCode.model.js';
import { paginateModel } from '../../utils/pagination.util.js';

const initiativePopulate = [
  { path: 'tracks' },
  { path: 'packages.courses' }
];
const availableInitiativeFilter = { isAvailable: { $ne: false } };

type InitiativeCoursePayload = {
  _id?: string;
  title: string;
  description: string;
  img: string;
  price?: number;
};

type InitiativePackagePayload = {
  _id?: string;
  title: string;
  description?: string;
  type: 'custom' | 'full';
  price: number;
  isRecommended?: boolean;
  maxCourses?: number;
  features?: string[];
  courses: InitiativeCoursePayload[];
};

type InitiativePayload = {
  title: string;
  description: string;
  img: string;
  tracks: InitiativeCoursePayload[];
  packages: InitiativePackagePayload[];
  startDate: string;
  endDate: string;
  isAvailable?: boolean;
};

async function getAvailableInitiativeCourseIds() {
  const initiatives = await Initiative.find(availableInitiativeFilter)
    .select('tracks packages.courses')
    .lean();
  const courseIds = new Set<string>();

  for (const initiative of initiatives as any[]) {
    for (const trackId of initiative.tracks ?? []) {
      courseIds.add(trackId.toString());
    }

    for (const packageItem of initiative.packages ?? []) {
      for (const courseId of packageItem.courses ?? []) {
        courseIds.add(courseId.toString());
      }
    }
  }

  return [...courseIds];
}

const listInitiatives = async (
  req: Request,
  res: Response,
  next: NextFunction,
  baseFilter: Record<string, unknown> = {}
) => {
  try {
    const { search } = req.query;
    const hasPagination = Boolean(req.query.page || req.query.limit || search);
    const filter: Record<string, unknown> = { ...baseFilter };

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (!hasPagination) {
      const initiatives = await Initiative.find(filter).populate(initiativePopulate);
      return res.status(200).json({
        success: true,
        data: initiatives
      });
    }

    const { items: initiatives, pagination } = await paginateModel(Initiative, {
      query: req.query as Record<string, unknown>,
      filter,
      populate: initiativePopulate,
      defaultLimit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        initiatives,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

async function upsertInitiativeCourse(coursePayload: InitiativeCoursePayload) {
  if (coursePayload._id) {
    const updatedCourse = await InitiativeCourse.findByIdAndUpdate(
      coursePayload._id,
      {
        title: coursePayload.title,
        description: coursePayload.description,
        img: coursePayload.img,
        ...(coursePayload.price !== undefined ? { price: coursePayload.price } : {}),
      },
      {
        returnDocument: 'after',
        runValidators: true
      }
    );

    if (updatedCourse) {
      return updatedCourse._id;
    }
  }

  const createdCourse = await InitiativeCourse.create({
    title: coursePayload.title,
    description: coursePayload.description,
    img: coursePayload.img,
    price: coursePayload.price ?? 0,
  });

  return createdCourse._id;
}

async function buildInitiativeReferences(
  payload: InitiativePayload,
  previousInitiative?: {
    tracks?: Array<{ toString: () => string }>;
    packages?: Array<{ courses?: Array<{ toString: () => string }> }>;
  } | null
) {
  const retainedCourseIds = new Set<string>();
  const trackIdByPayloadId = new Map<string, string>();
  const trackIdByTitle = new Map<string, string>();
  const tracksIds = [];

  for (const trackPayload of payload.tracks ?? []) {
    const trackId = (await upsertInitiativeCourse(trackPayload)).toString();
    retainedCourseIds.add(trackId);
    tracksIds.push(trackId);
    if (trackPayload._id) {
      trackIdByPayloadId.set(trackPayload._id.toString(), trackId);
    }
    trackIdByTitle.set(trackPayload.title, trackId);
  }

  const packages = [];

  for (const packagePayload of payload.packages ?? []) {
    const courseIds: string[] = [];

    for (const coursePayload of packagePayload.courses ?? []) {
      const existingTrackId =
        (coursePayload._id ? trackIdByPayloadId.get(coursePayload._id.toString()) : undefined) ??
        trackIdByTitle.get(coursePayload.title);

      if (existingTrackId) {
        retainedCourseIds.add(existingTrackId);
        courseIds.push(existingTrackId);
        continue;
      }

      const courseId = (await upsertInitiativeCourse(coursePayload)).toString();
      retainedCourseIds.add(courseId);
      courseIds.push(courseId);
    }

    packages.push({
      ...(packagePayload._id ? { _id: packagePayload._id } : {}),
      title: packagePayload.title,
      description: packagePayload.description ?? '',
      type: packagePayload.type,
      price: packagePayload.price,
      isRecommended: packagePayload.isRecommended ?? false,
      ...(packagePayload.type === 'custom' ? { maxCourses: packagePayload.maxCourses } : {}),
      features: packagePayload.features ?? [],
      courses: courseIds
    });
  }

  if (previousInitiative) {
    const previousCourseIds = new Set<string>();

    for (const trackId of previousInitiative.tracks ?? []) {
      previousCourseIds.add(trackId.toString());
    }

    for (const packageItem of previousInitiative.packages ?? []) {
      for (const courseId of packageItem.courses ?? []) {
        previousCourseIds.add(courseId.toString());
      }
    }

    const courseIdsToDelete = [...previousCourseIds].filter((courseId) => !retainedCourseIds.has(courseId));

    if (courseIdsToDelete.length > 0) {
      await InitiativeCourse.deleteMany({ _id: { $in: courseIdsToDelete } });
    }
  }

  return {
    tracks: tracksIds,
    packages
  };
}

/**
 * @desc    Get all initiative courses
 * @route   GET /api/initiatives
 * @access  Public
 */
export const getInitiativeCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const availableCourseIds = await getAvailableInitiativeCourseIds();
    const courses = await InitiativeCourse.find({ _id: { $in: availableCourseIds } }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single initiative course by ID
 * @route   GET /api/initiatives/:id
 * @access  Public
 */
export const getInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    if (typeof courseId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid initiative course id'
      });
    }

    const availableInitiative = await Initiative.findOne({
      ...availableInitiativeFilter,
      $or: [
        { tracks: courseId },
        { 'packages.courses': courseId }
      ]
    } as any);

    if (!availableInitiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
      });
    }

    const course = await InitiativeCourse.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
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
 * @desc    Get all initiative courses for admin (including unavailable parent initiatives)
 * @route   GET /api/admin/initiatives
 * @access  Private/Admin
 */
export const getAdminInitiativeCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await InitiativeCourse.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single initiative course by ID for admin
 * @route   GET /api/admin/initiatives/:id
 * @access  Private/Admin
 */
export const getAdminInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
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
 * @desc    Create a new initiative course
 * @route   POST /api/admin/initiatives
 * @access  Private/Admin
 */
export const createInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.create(req.body);
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an initiative course
 * @route   PATCH /api/admin/initiatives/:id
 * @access  Private/Admin
 */
export const updateInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
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
 * @desc    Delete an initiative course
 * @route   DELETE /api/admin/initiatives/:id
 * @access  Private/Admin
 */
export const deleteInitiativeCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Initiative course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Initiative course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ── Initiative Course Lectures ──────────────────────────────────────

const lectureDateTimeFormatter = new Intl.DateTimeFormat('en-EG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Cairo'
});

const formatLectureStartTime = (date: Date) => lectureDateTimeFormatter.format(date);

const normalizePhoneForWapilot = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return '2' + digits;
  return '20' + digits;
};

/**
 * @desc    Add a lecture to an initiative course
 * @route   POST /api/admin/initiatives/:id/lectures
 * @access  Private/Admin
 */
export const addInitiativeCourseLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Initiative course not found' });
    }

    course.lectures.push(req.body);
    await course.save();

    const addedLecture = course.lectures[course.lectures.length - 1];
    res.status(201).json({ success: true, data: addedLecture });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a lecture in an initiative course
 * @route   PATCH /api/admin/initiatives/:id/lectures/:lectureId
 * @access  Private/Admin
 */
export const updateInitiativeCourseLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Initiative course not found' });
    }

    const lecture = course.lectures.id(req.params.lectureId as string);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    lecture.set(req.body);
    await course.save();

    res.status(200).json({ success: true, data: lecture });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a lecture from an initiative course
 * @route   DELETE /api/admin/initiatives/:id/lectures/:lectureId
 * @access  Private/Admin
 */
export const deleteInitiativeCourseLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Initiative course not found' });
    }

    const lecture = course.lectures.id(req.params.lectureId as string);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    course.lectures.pull({ _id: req.params.lectureId });
    await course.save();

    res.status(200).json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Notify enrolled students about an initiative lecture via WhatsApp
 * @route   POST /api/admin/initiatives/:id/lectures/:lectureId/notify-students
 * @access  Private/Admin
 */
export const notifyInitiativeLectureStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await InitiativeCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Initiative course not found' });
    }

    const lecture = course.lectures.id(req.params.lectureId as string);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (!lecture.meetingUrl) {
      return res.status(400).json({ success: false, message: 'Add a meeting URL before notifying students' });
    }

    // Find all initiatives that reference this course (in packages or track)
    const initiatives = await Initiative.find({
      $or: [
        { track: course._id },
        { 'packages.courses': course._id }
      ]
    });

    const initiativeIds = initiatives.map((i) => i._id);

    // Find enrollments for those initiatives that include this course
    const enrollments = await Enrollment.find({
      referenceId: { $in: initiativeIds },
      referenceModel: 'Initiative',
      selectedCourses: course._id
    }).select('phone');

    if (enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled students found for this course' });
    }

    const phones = Array.from(
      new Set(
        enrollments
          .map((enrollment) => normalizePhoneForWapilot(enrollment.phone))
          .filter(Boolean)
      )
    );

    if (phones.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid student phone numbers found' });
    }

    const message = `Lecture reminder: "${lecture.title}" for ${course.title} starts at ${formatLectureStartTime(new Date(lecture.startDate))}. Meeting URL: ${lecture.meetingUrl}`;

    const results = await sendBulkMessage(phones, message);
    const sentCount = results.filter((result: any) => result.success).length;
    const failedCount = results.length - sentCount;

    res.status(200).json({
      success: failedCount === 0,
      message: failedCount === 0 ? 'Students notified successfully' : 'Some notifications failed to send',
      data: {
        totalStudents: phones.length,
        sentCount,
        failedCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all initiatives
 * @route   GET /api/initiatives/all
 * @access  Public
 */
export const getInitiatives = async (req: Request, res: Response, next: NextFunction) => {
  return listInitiatives(req, res, next, availableInitiativeFilter);
};

/**
 * @desc    Get all initiatives for admin (including unavailable)
 * @route   GET /api/admin/initiatives/all
 * @access  Private/Admin
 */
export const getAdminInitiatives = async (req: Request, res: Response, next: NextFunction) => {
  return listInitiatives(req, res, next);
};

/**
 * @desc    Get single initiative by ID
 * @route   GET /api/initiatives/all/:id
 * @access  Public
 */
export const getInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiativeId = req.params.id;
    if (typeof initiativeId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid initiative id'
      });
    }

    const initiative = await Initiative.findById(initiativeId).populate(initiativePopulate);
    if (!initiative || initiative.isAvailable === false) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }
    res.status(200).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single initiative by ID for admin
 * @route   GET /api/admin/initiatives/all/:id
 * @access  Private/Admin
 */
export const getAdminInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiative = await Initiative.findById(req.params.id).populate(initiativePopulate);
    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }
    res.status(200).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new initiative
 * @route   POST /api/admin/initiatives/all
 * @access  Private/Admin
 */
export const createInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as InitiativePayload;
    const courseReferences = await buildInitiativeReferences(payload);
    const initiative = await Initiative.create({
      title: payload.title,
      description: payload.description,
      img: payload.img,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isAvailable: payload.isAvailable ?? true,
      ...courseReferences
    } as any);
    const populatedInitiative = await Initiative.findById((initiative as any)._id).populate(initiativePopulate);

    res.status(201).json({
      success: true,
      data: populatedInitiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an initiative
 * @route   PATCH /api/admin/initiatives/all/:id
 * @access  Private/Admin
 */
export const updateInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingInitiative = await Initiative.findById(req.params.id);

    if (!existingInitiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    const payload = req.body as InitiativePayload;
    const courseReferences = await buildInitiativeReferences(payload, existingInitiative);

    const initiative = await Initiative.findByIdAndUpdate(req.params.id, {
      title: payload.title,
      description: payload.description,
      img: payload.img,
      startDate: payload.startDate,
      endDate: payload.endDate,
      ...(payload.isAvailable !== undefined ? { isAvailable: payload.isAvailable } : {}),
      ...courseReferences
    } as any, {
      returnDocument: 'after',
      runValidators: true
    }).populate(initiativePopulate);

    res.status(200).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update initiative availability
 * @route   PATCH /api/admin/initiatives/all/:id/availability
 * @access  Private/Admin
 */
export const updateInitiativeAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nextIsAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';
    const initiative = await Initiative.findByIdAndUpdate(
      req.params.id,
      { isAvailable: nextIsAvailable },
      {
        returnDocument: 'after',
        runValidators: true
      }
    ).populate(initiativePopulate);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    res.status(200).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an initiative
 * @route   DELETE /api/admin/initiatives/all/:id
 * @access  Private/Admin
 */
export const deleteInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initiative = await Initiative.findById(req.params.id);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    const courseIds = new Set<string>();
    for (const trackId of initiative.tracks ?? []) {
      courseIds.add(trackId.toString());
    }

    for (const packageItem of initiative.packages ?? []) {
      for (const courseId of packageItem.courses ?? []) {
        courseIds.add(courseId.toString());
      }
    }

    await Initiative.findByIdAndDelete(req.params.id);

    if (courseIds.size > 0) {
      await InitiativeCourse.deleteMany({ _id: { $in: [...courseIds] } });
    }

    res.status(200).json({
      success: true,
      message: 'Initiative deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in an initiative track or package — initiates Kashier payment
 * @route   POST /api/initiatives/enroll
 * @access  Private/Student
 */
export const enrollInInitiative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      initiativeId,
      enrollmentTarget,
      packageId,
      trackId,
      selectedCourseIds = [],
      additionalInfo,
      promoCode: promoCodeInput
    } = req.body;
    const { _id: studentId, name: fullName, email, phone } = (req as any).user;

    if (!studentId || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Your student profile is missing required contact information. Please update your account before enrolling.'
      });
    }

    const initiative = await Initiative.findById(initiativeId).populate(initiativePopulate);
    if (!initiative || initiative.isAvailable === false) {
      return res.status(404).json({ success: false, message: 'Initiative not found' });
    }

    const duplicateQuery: Record<string, unknown> = {
      referenceId: initiativeId,
      referenceModel: 'Initiative',
      studentId,
      enrollmentTarget
    };

    if (enrollmentTarget === 'package' && packageId) {
      duplicateQuery.initiativePackageId = packageId;
    } else if (enrollmentTarget === 'track' && trackId) {
      duplicateQuery.initiativePackageId = trackId;
    }

    const existing = await Enrollment.findOne(duplicateQuery);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this initiative selection.'
      });
    }

    let amount = 0;
    let selectedCourses: string[] = [];
    let packageIdentifier: string | undefined;

    if (enrollmentTarget === 'track') {
      const trackDoc = initiative.tracks.find((t: any) => t._id.toString() === trackId) as any;
      if (!trackDoc) {
        return res.status(400).json({ success: false, message: 'Track not found in this initiative.' });
      }

      amount = trackDoc.price ?? 0;
      selectedCourses = [trackId];
      packageIdentifier = trackId;
    } else {
      const initiativePackage = initiative.packages.find(
        (item: any) => item._id?.toString() === packageId
      ) as any;

      if (!initiativePackage) {
        return res.status(404).json({ success: false, message: 'Initiative package not found' });
      }

      packageIdentifier = initiativePackage._id.toString();
      const packageCourseIds = initiativePackage.courses.map((course: any) => course._id.toString());

      if (initiativePackage.type === 'full') {
        selectedCourses = packageCourseIds;
      } else {
        const uniqueSelectedCourseIds = Array.from(
          new Set(selectedCourseIds as string[])
        ) as string[];

        if (uniqueSelectedCourseIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Select at least one course for a custom package.'
          });
        }

        if (uniqueSelectedCourseIds.length > initiativePackage.maxCourses) {
          return res.status(400).json({
            success: false,
            message: `You can select up to ${initiativePackage.maxCourses} courses in this custom package.`
          });
        }

        const hasInvalidCourse = uniqueSelectedCourseIds.some((courseId) => !packageCourseIds.includes(courseId));
        if (hasInvalidCourse) {
          return res.status(400).json({
            success: false,
            message: 'One or more selected courses do not belong to this package.'
          });
        }

        selectedCourses = uniqueSelectedCourseIds;
      }

      amount = initiativePackage.price ?? 0;
    }

    // Validate and apply promo code
    let appliedPromoCode: string | undefined;
    if (promoCodeInput && amount > 0) {
      const promo = await PromoCode.findOneAndUpdate(
        {
          code: promoCodeInput.toUpperCase(),
          isActive: true,
          $expr: { $lt: ['$currentUses', '$maxUses'] }
        },
        {},
        { new: true }
      );

      if (!promo) {
        return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
      }

      if (promo.applicableTo.type === 'specific') {
        const isApplicable = promo.applicableTo.initiativePackages.some(
          (pkg) => pkg.initiativeId.toString() === initiativeId && pkg.packageId === packageIdentifier
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this package.' });
        }
      }

      amount = Math.round(amount * (1 - promo.discountPercentage / 100));
      appliedPromoCode = promo.code;
    }

    if (amount === 0) {
      if (appliedPromoCode) {
        await PromoCode.findOneAndUpdate(
          { code: appliedPromoCode, $expr: { $lt: ['$currentUses', '$maxUses'] } },
          { $inc: { currentUses: 1 } }
        );
      }

      const enrollmentData: Record<string, unknown> = {
        referenceId: initiativeId,
        referenceModel: 'Initiative',
        studentId,
        enrollmentTarget,
        selectedCourses,
        fullName,
        email,
        phone,
        additionalInfo,
        promoCode: appliedPromoCode
      };

      if (packageIdentifier) {
        enrollmentData.initiativePackageId = packageIdentifier;
      } else if (enrollmentTarget === 'track' && trackId) {
        enrollmentData.initiativePackageId = trackId;
      }

      const enrollment = await Enrollment.create(enrollmentData);

      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in the initiative!',
        data: enrollment
      });
    }

    await Payment.updateMany(
      {
        referenceId: initiativeId,
        referenceModel: 'Initiative',
        'customer.email': email,
        status: 'pending',
        'paymentDetails.enrollmentTarget': enrollmentTarget,
        ...(packageIdentifier ? { 'paymentDetails.initiativePackageId': packageIdentifier } : {})
      },
      { status: 'cancelled' }
    );

    const orderId = `Initiative_${initiativeId}_${Date.now()}`;
    const amountWithFees = calculateAmountWithFees(amount);

    await Payment.create({
      orderId,
      referenceId: initiativeId,
      referenceModel: 'Initiative',
      amount,
      status: 'pending',
      customer: { name: fullName, email, phone },
      paymentDetails: {
        additionalInfo,
        studentId,
        enrollmentTarget,
        initiativePackageId: packageIdentifier || (enrollmentTarget === 'track' ? trackId : undefined),
        selectedCourses,
        promoCode: appliedPromoCode
      }
    });

    const sessionResponse = await createPaymentSession({
      amount: amountWithFees,
      merchantOrderId: orderId,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone
    });

    return res.status(200).json({
      success: true,
      data: {
        requiresPayment: true,
        orderId,
        sessionUrl: sessionResponse.sessionUrl
      }
    });
  } catch (error) {
    if ((error as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already enrolled in this initiative selection.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Get enrollments for a specific initiative course
 * @route   GET /api/admin/initiatives/courses/:id/enrollments
 * @access  Private (Admin)
 */
export const getInitiativeCourseEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId } = req.params;

    // 1. Find the initiative that contains this course in its tracks or packages
    const initiative = await Initiative.findOne({
      $or: [
        { tracks: courseId },
        { 'packages.courses': courseId }
      ]
    } as any);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in any initiative'
      });
    }

    // 2. Identify packages that include this course
    const packageIds = initiative.packages
      .filter(pkg => pkg.courses.some(cId => cId.toString() === courseId))
      .map(pkg => pkg._id.toString());

    // 3. Find all relevant enrollments
    const enrollments = await Enrollment.find({
      referenceId: initiative._id,
      referenceModel: 'Initiative',
      $or: [
        // Enrolled in "Track" (has access to all tracks)
        { enrollmentTarget: 'track' },
        // Enrolled in a "Full" package that includes this course
        { 
          enrollmentTarget: 'package', 
          initiativePackageId: { $in: packageIds },
          $or: [
            { selectedCourses: { $exists: false } },
            { selectedCourses: { $size: 0 } }
          ]
        },
        // Enrolled in a "Custom" package and selected this course
        { 
          enrollmentTarget: 'package', 
          selectedCourses: courseId 
        }
      ]
    } as any).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get enrollments for a specific initiative package
 * @route   GET /api/admin/initiatives/packages/:id/enrollments
 * @access  Private (Admin)
 */
export const getInitiativePackageEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: packageId } = req.params;

    const enrollments = await Enrollment.find({
      referenceModel: 'Initiative',
      enrollmentTarget: 'package',
      initiativePackageId: packageId
    } as any).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
};
