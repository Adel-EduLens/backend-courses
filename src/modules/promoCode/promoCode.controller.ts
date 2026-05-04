import type { Request, Response, NextFunction } from 'express';
import { PromoCode } from './promoCode.model.js';
import { successResponse } from '../../utils/response.util.js';

export const getPromoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCodes = await PromoCode.find()
      .populate('applicableTo.courses', 'title')
      .populate('applicableTo.initiativePackages.initiativeId', 'title')
      .sort({ createdAt: -1 });

    successResponse(res, { data: { promoCodes } });
  } catch (error) {
    next(error);
  }
};

export const getPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id)
      .populate('applicableTo.courses', 'title')
      .populate('applicableTo.initiativePackages.initiativeId', 'title');

    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    successResponse(res, { data: { promoCode } });
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
