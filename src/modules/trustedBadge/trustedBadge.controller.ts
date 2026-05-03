import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import TrustedBadgeContent from './trustedBadge.model.js';
import { deleteFile, getRelativePathFromUrl } from '../../utils/fileSystem.util.js';

const DEFAULT_TITLE = 'Trusted by 26+ Schools & Institutions';
const DEFAULT_SUBTITLE = 'Serving educators across Egypt and the Gulf Region';

interface NormalizedBadge {
  _id?: string;
  name: string;
  logo: string;
}

const getFileUrl = (req: Request, file: Express.Multer.File) => {
  const relativePath = path.relative(path.resolve('public'), file.path).split(path.sep).join('/');
  return `${req.protocol}://${req.get('host')}/${relativePath}`;
};

const getUploadedBadgeFiles = (req: Request) => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  return files.filter((file) => file.fieldname.startsWith('badge_logo_'));
};

const deleteUploadedFiles = async (files: Express.Multer.File[]) => {
  await Promise.all(files.map((file) => deleteFile(path.resolve(file.path))));
};

const deleteBadgeLogos = async (logos: string[]) => {
  await Promise.all(
    logos.map(async (logo) => {
      const relativePath = getRelativePathFromUrl(logo);
      if (!relativePath) return;
      await deleteFile(path.resolve('public', relativePath));
    })
  );
};

const getOrCreateTrustedBadgeContent = async () => {
  const existingContent = await TrustedBadgeContent.findOne();

  if (existingContent) return existingContent;

  return TrustedBadgeContent.create({
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    badges: []
  });
};

export const getTrustedBadgeContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = await getOrCreateTrustedBadgeContent();

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

export const updateTrustedBadgeContent = async (req: Request, res: Response, next: NextFunction) => {
  const uploadedFiles = getUploadedBadgeFiles(req);

  try {
    const content = await getOrCreateTrustedBadgeContent();
    const currentBadges: NormalizedBadge[] = content.badges.map((badge) => ({
      _id: String(badge._id),
      name: badge.name || '',
      logo: badge.logo
    }));

    const incomingBadges: NormalizedBadge[] = Array.isArray(req.body.badges) ? req.body.badges : [];
    const nextBadges: NormalizedBadge[] = incomingBadges.map((badge, index: number) => {
      const uploadedFile = uploadedFiles.find((file) => file.fieldname === `badge_logo_${index}`);
      const existingBadge = badge._id ? currentBadges.find((item) => item._id === badge._id) : undefined;

      return {
        name: badge.name || existingBadge?.name || '',
        logo: uploadedFile ? getFileUrl(req, uploadedFile) : badge.logo || existingBadge?.logo || ''
      };
    });

    const removedLogos = currentBadges
      .map((badge) => badge.logo)
      .filter((logo) => logo && !nextBadges.some((nextBadge) => nextBadge.logo === logo));

    content.set({
      title: req.body.title || DEFAULT_TITLE,
      subtitle: req.body.subtitle || DEFAULT_SUBTITLE,
      badges: nextBadges
    });

    await content.save();
    await deleteBadgeLogos(removedLogos);

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    await deleteUploadedFiles(uploadedFiles);
    next(error);
  }
};
