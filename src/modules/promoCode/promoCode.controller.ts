import type { Request, Response, NextFunction } from 'express';
import { PromoCode } from './promoCode.model.js';
import { successResponse } from '../../utils/response.util.js';
import Enrollment from '../course/enrollment.model.js';
import { Payment } from '../payment/payment.model.js';
import { Round } from '../course/round.model.js';
import { Course } from '../course/course.model.js';
import { Initiative } from '../initiative/initiative.model.js';
import { InitiativeCourse } from '../initiative/initiative_course.model.js';
import { paginateModel } from '../../utils/pagination.util.js';

type PromoUsageRecord = {
  _id: unknown;
  fullName: string;
  email: string;
  phone: string;
  referenceModel: string;
  enrollmentTarget?: 'track' | 'package';
  referenceId?: unknown;
  initiativePackageId?: string;
  createdAt: Date;
  usedOnLabel: string;
};

async function buildUsageLabelMaps(usages: Array<{
  referenceModel?: string;
  referenceId?: unknown;
  initiativePackageId?: string;
  enrollmentTarget?: 'track' | 'package';
}>) {
  const roundIds = new Set<string>();
  const courseIds = new Set<string>();
  const initiativeIds = new Set<string>();
  const initiativeCourseIds = new Set<string>();

  usages.forEach((usage) => {
    const referenceId = usage.referenceId?.toString();
    if (!referenceId) return;

    if (usage.referenceModel === 'Round') {
      roundIds.add(referenceId);
    } else if (usage.referenceModel === 'Initiative') {
      initiativeIds.add(referenceId);
      if (usage.enrollmentTarget === 'track' && usage.initiativePackageId) {
        initiativeCourseIds.add(usage.initiativePackageId);
      }
    } else if (usage.referenceModel === 'InitiativeCourse') {
      initiativeCourseIds.add(referenceId);
    }
  });

  const [rounds, courses, initiatives, initiativeCourses] = await Promise.all([
    roundIds.size > 0
      ? Round.find({ _id: { $in: [...roundIds] } }).populate('course', 'title').select('title course')
      : Promise.resolve([]),
    courseIds.size > 0
      ? Course.find({ _id: { $in: [...courseIds] } }).select('title')
      : Promise.resolve([]),
    initiativeIds.size > 0
      ? Initiative.find({ _id: { $in: [...initiativeIds] } }).populate('tracks', 'title').select('title packages tracks')
      : Promise.resolve([]),
    initiativeCourseIds.size > 0
      ? InitiativeCourse.find({ _id: { $in: [...initiativeCourseIds] } }).select('title')
      : Promise.resolve([]),
  ]);

  const roundMap = new Map(
    rounds.map((round: any) => [
      round._id.toString(),
      {
        roundTitle: round.title,
        courseTitle: round.course?.title ?? '',
      },
    ])
  );

  const courseMap = new Map(courses.map((course) => [course._id.toString(), course.title]));
  const initiativeCourseMap = new Map(initiativeCourses.map((track) => [track._id.toString(), track.title]));
  const initiativeMap = new Map(
    initiatives.map((initiative: any) => [
      initiative._id.toString(),
      {
        title: initiative.title,
        packageTitles: new Map(initiative.packages.map((pkg: any) => [pkg._id.toString(), pkg.title])),
      },
    ])
  );

  return { roundMap, courseMap, initiativeMap, initiativeCourseMap };
}

function formatUsedOnLabel(
  usage: {
    referenceModel?: string;
    referenceId?: unknown;
    initiativePackageId?: string;
    enrollmentTarget?: 'track' | 'package';
  },
  maps: Awaited<ReturnType<typeof buildUsageLabelMaps>>
) {
  const referenceId = usage.referenceId?.toString();
  if (!referenceId) return usage.referenceModel || 'Unknown';

  if (usage.referenceModel === 'Round') {
    const round = maps.roundMap.get(referenceId);
    if (round?.courseTitle && round?.roundTitle) {
      return `Course: ${round.courseTitle} / ${round.roundTitle}`;
    }
    if (round?.roundTitle) {
      return `Round: ${round.roundTitle}`;
    }
  }

  if (usage.referenceModel === 'Initiative') {
    const initiative = maps.initiativeMap.get(referenceId);
    const initiativeTitle = initiative?.title ?? 'Initiative';

    if (usage.enrollmentTarget === 'package' && usage.initiativePackageId) {
      const packageTitle = initiative?.packageTitles.get(usage.initiativePackageId) ?? usage.initiativePackageId;
      return `Package: ${initiativeTitle} / ${packageTitle}`;
    }

    if (usage.enrollmentTarget === 'track' && usage.initiativePackageId) {
      const trackTitle = maps.initiativeCourseMap.get(usage.initiativePackageId) ?? usage.initiativePackageId;
      return `Track: ${initiativeTitle} / ${trackTitle}`;
    }

    return `Initiative: ${initiativeTitle}`;
  }

  if (usage.referenceModel === 'InitiativeCourse') {
    const trackTitle = maps.initiativeCourseMap.get(referenceId);
    if (trackTitle) {
      return `Track: ${trackTitle}`;
    }
  }

  if (usage.referenceModel === 'Course') {
    const courseTitle = maps.courseMap.get(referenceId);
    if (courseTitle) {
      return `Course: ${courseTitle}`;
    }
  }

  return usage.referenceModel || 'Unknown';
}

export const getPromoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const hasPagination = Boolean(req.query.page || req.query.limit || search);
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }

    if (!hasPagination) {
      const promoCodes = await PromoCode.find()
        .find(filter)
        .populate('applicableTo.courses', 'title')
        .populate('applicableTo.initiativePackages.initiativeId', 'title')
        .sort({ createdAt: -1 });

      return successResponse(res, { data: { promoCodes } });
    }

    const { items: promoCodes, pagination } = await paginateModel(PromoCode, {
      query: req.query as Record<string, unknown>,
      filter,
      populate: [
        { path: 'applicableTo.courses', select: 'title' },
        { path: 'applicableTo.initiativePackages.initiativeId', select: 'title' }
      ],
      sort: { createdAt: -1 },
      defaultLimit: 10,
    });

    successResponse(res, { data: { promoCodes, pagination } });
  } catch (error) {
    next(error);
  }
};

export const getPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id)
      .populate('applicableTo.courses', 'title')
      .populate('applicableTo.initiativePackages.initiativeId', 'title')
      .populate('applicableTo.initiativeTracks.initiativeId', 'title')
      .populate('applicableTo.initiativeTracks.trackId', 'title');

    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    const usages = await Enrollment.find({ promoCode: promoCode.code })
      .select('fullName email phone referenceModel referenceId enrollmentTarget initiativePackageId createdAt')
      .sort({ createdAt: -1 });

    const enrollmentOrderIds = await Enrollment.find({
      promoCode: promoCode.code,
      paymentOrderId: { $exists: true, $ne: null }
    }).distinct('paymentOrderId');

    const paymentUsages = await Payment.find({
      status: 'success',
      'paymentDetails.promoCode': promoCode.code,
      orderId: { $nin: enrollmentOrderIds }
    })
      .select('customer referenceModel referenceId paymentDetails createdAt')
      .sort({ createdAt: -1 });

    const fallbackUsages = paymentUsages
      .filter((payment) => payment.customer?.name || payment.customer?.email || payment.customer?.phone)
      .map((payment) => ({
        _id: payment._id,
        fullName: payment.customer?.name || 'Unknown user',
        email: payment.customer?.email || '',
        phone: payment.customer?.phone || '',
        referenceModel: payment.referenceModel,
        referenceId: payment.referenceId,
        enrollmentTarget: payment.paymentDetails?.enrollmentTarget,
        initiativePackageId: payment.paymentDetails?.initiativePackageId,
        createdAt: payment.createdAt
      }));

    const rawUsages = [...usages, ...fallbackUsages];
    const usageMaps = await buildUsageLabelMaps(rawUsages);
    const normalizedUsages: PromoUsageRecord[] = rawUsages.map((usage: any) => ({
      _id: usage._id,
      fullName: usage.fullName,
      email: usage.email,
      phone: usage.phone,
      referenceModel: usage.referenceModel,
      referenceId: usage.referenceId,
      enrollmentTarget: usage.enrollmentTarget,
      initiativePackageId: usage.initiativePackageId,
      createdAt: usage.createdAt,
      usedOnLabel: formatUsedOnLabel(usage, usageMaps),
    }));

    successResponse(res, { data: { promoCode, usages: normalizedUsages } });
  } catch (error) {
    next(error);
  }
};

export const createPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCode = await PromoCode.create(req.body);
    successResponse(res, { statusCode: 201, message: 'Promo code created', data: { promoCode } });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A promo code with this code already exists.' });
    }
    next(error);
  }
};

export const updatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCode = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    successResponse(res, { message: 'Promo code updated', data: { promoCode } });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A promo code with this code already exists.' });
    }
    next(error);
  }
};

export const deletePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    successResponse(res, { message: 'Promo code deleted' });
  } catch (error) {
    next(error);
  }
};

export const validatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, itemType, itemId, packageId } = req.body;

    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Invalid promo code.' });
    }

    if (!promoCode.isActive) {
      return res.status(400).json({ success: false, message: 'This promo code is no longer active.' });
    }

    if (promoCode.currentUses >= promoCode.maxUses) {
      return res.status(400).json({ success: false, message: 'This promo code has reached its usage limit.' });
    }

    if (promoCode.applicableTo.type === 'specific') {
      if (itemType === 'course') {
        const isApplicable = promoCode.applicableTo.courses.some(
          (courseId) => courseId.toString() === itemId
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this course.' });
        }
      } else if (itemType === 'initiative' && packageId) {
        // This handles packages
        const isApplicable = promoCode.applicableTo.initiativePackages.some(
          (pkg) => pkg.initiativeId.toString() === itemId && pkg.packageId === packageId
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this package.' });
        }
      } else if (itemType === 'initiative' && !packageId) {
        // This handles tracks (itemId is initiativeId, but we might need trackId too)
        // Wait, if it's a track enrollment, we need to know which track.
        // Let's adjust the request to include trackId.
        const trackId = req.body.trackId;
        const isApplicable = promoCode.applicableTo.initiativeTracks.some(
          (track) => track.initiativeId.toString() === itemId && track.trackId.toString() === trackId
        );
        if (!isApplicable) {
          return res.status(400).json({ success: false, message: 'This promo code does not apply to this track.' });
        }
      }
    }

    successResponse(res, {
      data: {
        valid: true,
        discountPercentage: promoCode.discountPercentage
      }
    });
  } catch (error) {
    next(error);
  }
};
