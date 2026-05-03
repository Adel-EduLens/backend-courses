import express from 'express';
import { getTrustedBadgeContent } from './trustedBadge.controller.js';

const router = express.Router();

router.get('/', getTrustedBadgeContent);

export default router;
