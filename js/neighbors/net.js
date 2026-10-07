// 🏡 이웃 마을 네트워크 바인딩 — 규칙은 ./api.js(테스트), 여기는 실제 supabase·fetch 를 묶기만 한다(js/plaza/net.js 와 같은 구조)
import { CONFIG } from '../config.js';
import { neighborRpc } from '../supabase-client.js';
import { createNeighborApi } from './api.js';

export const neighborApi = createNeighborApi({ rpc: neighborRpc, fetchFn: (u) => fetch(u), base: CONFIG.API_BASE });
