// =============================================================
//  🌾 광장 네트워크 — 진행률은 /api/plaza(엣지 60초 캐시)를 60초 간격으로만 조회,
//  기부·내 기록은 supabase-client.js 의 RPC 래퍼(로그인 토큰 필요)
// =============================================================
import { CONFIG } from '../config.js';
import { plazaDonate, plazaMine } from '../supabase-client.js';
import { createProgressFetcher } from './progress.js';

export const PLAZA_API = (season) => `${CONFIG.API_BASE}/api/plaza?season=${encodeURIComponent(season)}`;
export const donate = plazaDonate;
export const mine = plazaMine;
export const progress = createProgressFetcher({ fetchFn: (u) => fetch(u), url: PLAZA_API });
