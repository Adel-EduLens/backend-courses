import express from 'express';
import { getCovers } from './cover.controller.js';

const router = express.Router();

router.get('/', getCovers);

export default router;
