import type { NextFunction, Request, Response } from 'express';
import { Cover, CoverSettings } from './cover.model.js';
import { Course } from '../course/course.model.js';
import Event from '../event/event.model.js';
import { Initiative } from '../initiative/initiative.model.js';
import { InitiativeCourse } from '../initiative/initiative_course.model.js';
import { deleteFile } from '../../utils/fileSystem.util.js';

const getFileUrl = (file: Express.Multer.File) => file.path;

const getItemLink = async (itemType: string, itemId: string) => {
  switch (itemType) {
    case 'course':
      return `/courses/${itemId}`;
    case 'event':
      return `/events/${itemId}`;
    case 'initiative':
      return `/initiatives/${itemId}`;
    case 'track': {
      const parentInitiative = await Initiative.findOne({ tracks: itemId }).select('_id').lean();
      return parentInitiative ? `/initiatives/${parentInitiative._id}` : '/initiatives';
    }
    default:
      return '/';
  }
};

const getButtonText = (itemType: string) => {
  switch (itemType) {
    case 'course':
      return 'Enroll Now';
    case 'event':
      return 'Register Now';
    case 'initiative':
      return 'Join Now';
    case 'track':
      return 'Explore Now';
    default:
      return 'Register Now';
  }
};

const enrichCover = async (cover: InstanceType<typeof Cover>) => ({
  ...cover.toObject(),
  link: await getItemLink(cover.itemType, String(cover.itemId)),
  buttonText: cover.buttonText || getButtonText(cover.itemType)
});

export const getCovers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const covers = await Cover.find().sort({ order: 1, createdAt: 1 });
    const settings = await CoverSettings.findOne();

    res.status(200).json({
      success: true,
      data: {
        slides: await Promise.all(covers.map(enrichCover)),
        stats: settings?.stats ?? []
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSelectableItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [courses, events, initiatives, tracks] = await Promise.all([
      Course.find({ isAvailable: true }).select('_id title').lean(),
      Event.find({ isAvailable: true }).select('_id title').lean(),
      Initiative.find({ isAvailable: true }).select('_id title').lean(),
      InitiativeCourse.find().select('_id title').lean()
    ]);

    const mapItem = (item: { _id: unknown; title: string }) => ({ _id: item._id, title: item.title });

    res.status(200).json({
      success: true,
      data: {
        course: courses.map(mapItem),
        event: events.map(mapItem),
        initiative: initiatives.map(mapItem),
        track: tracks.map(mapItem)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createCover = async (req: Request, res: Response, next: NextFunction) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;

  try {
    const { itemType, itemId, title, subtitle, tagline, buttonText } = req.body;
    const backgroundImage = uploadedFile ? getFileUrl(uploadedFile) : req.body.backgroundImage || '';

    if (!backgroundImage) {
      return res.status(400).json({ success: false, message: 'Background image is required' });
    }

    const count = await Cover.countDocuments();
    const cover = await Cover.create({
      itemType,
      itemId,
      title,
      subtitle,
      tagline,
      backgroundImage,
      buttonText: buttonText || '',
      order: count
    });

    res.status(201).json({
      success: true,
      data: await enrichCover(cover)
    });
  } catch (error) {
    if (uploadedFile) await deleteFile(getFileUrl(uploadedFile));
    next(error);
  }
};

export const updateCover = async (req: Request, res: Response, next: NextFunction) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;

  try {
    const { id } = req.params;
    const { itemType, itemId, title, subtitle, tagline, buttonText } = req.body;

    const cover = await Cover.findById(id);
    if (!cover) {
      if (uploadedFile) await deleteFile(getFileUrl(uploadedFile));
      return res.status(404).json({ success: false, message: 'Cover not found' });
    }

    const oldImage = cover.backgroundImage;
    const backgroundImage = uploadedFile ? getFileUrl(uploadedFile) : req.body.backgroundImage || cover.backgroundImage;

    cover.set({ itemType, itemId, title, subtitle, tagline, backgroundImage, buttonText: buttonText || '' });
    await cover.save();

    if (uploadedFile && oldImage && oldImage !== backgroundImage) {
      await deleteFile(oldImage);
    }

    res.status(200).json({
      success: true,
      data: await enrichCover(cover)
    });
  } catch (error) {
    if (uploadedFile) await deleteFile(getFileUrl(uploadedFile));
    next(error);
  }
};

export const deleteCover = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const cover = await Cover.findByIdAndDelete(id);

    if (!cover) {
      return res.status(404).json({ success: false, message: 'Cover not found' });
    }

    if (cover.backgroundImage) {
      await deleteFile(cover.backgroundImage);
    }

    res.status(200).json({ success: true, message: 'Cover deleted' });
  } catch (error) {
    next(error);
  }
};

export const updateCoverStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let stats = req.body.stats;
    if (typeof stats === 'string') {
      try { stats = JSON.parse(stats); } catch { stats = []; }
    }
    if (!Array.isArray(stats)) stats = [];

    let settings = await CoverSettings.findOne();
    if (!settings) {
      settings = await CoverSettings.create({ stats });
    } else {
      settings.set({ stats });
      await settings.save();
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
