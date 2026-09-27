import { CONFIG } from '../config.js';

export const PLAZA_API = (season) => `${CONFIG.API_BASE}/api/plaza?season=${encodeURIComponent(season)}`;
