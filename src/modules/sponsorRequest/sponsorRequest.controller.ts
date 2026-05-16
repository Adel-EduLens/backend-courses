import type { NextFunction, Request, Response } from 'express';
import SponsorRequest from './sponsorRequest.model.js';
import { paginateModel } from '../../utils/pagination.util.js';

export const createSponsorRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sponsorRequest = await SponsorRequest.create({
      ...req.body,
      eventId: req.body.eventId || undefined,
      message: req.body.message || ''
    });

    res.status(201).json({
      success: true,
      message: 'Sponsor request submitted',
      data: sponsorRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getSponsorRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const filter: Record<string, unknown> = {};

    if (search) {
      const searchRegex = { $regex: String(search), $options: 'i' };
      filter.$or = [
        { eventTitle: searchRegex },
        { companyName: searchRegex },
        { contactPerson: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const { items: sponsorRequests, pagination } = await paginateModel(SponsorRequest, {
      query: req.query as Record<string, unknown>,
      filter,
      populate: { path: 'eventId', select: 'title date' },
      sort: { createdAt: -1 },
      defaultLimit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        sponsorRequests,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};
