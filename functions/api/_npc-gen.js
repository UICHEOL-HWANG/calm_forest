// =============================================================
//  💬 NPC 대화 생성 — 로직 단일 출처
//  ------------------------------------------------------------
//  ▶ 이 모듈을 쓰는 곳 2군데. 중복 구현하지 마세요.
//     · worker/index.js  scheduled  — 주 1회 크론
//     · tools/seed-npc-dialogues.mjs — 최초 시딩(수동 1회)
//  ▶ ⚠️ 모델 응답을 믿지 않는다. daily-quests 가 QUEST_SPEC 으로 거르는 것과
//     같은 이유 — 여기서 못 거른 문장은 게임 화면에 그대로 뜬다.
//  ▶ ⚠️ 본문은 evergreen 전용이다. 날씨·계절을 말하는 대사가 풀에 섞이면,
//     풀은 영구 재사용이라 맑은 날에 "비가 오네요"가 나온다.
//     날씨는 npc_openers(첫인사 한 줄)가 따로 맡는다.
//  ▶ 대화는 3턴 **수렴형**: 턴마다 선택지 3개, 고른 것에 따라 응답이 갈리되
//     다음 턴은 공통으로 돌아온다. 분기를 살리면 3→9→27 로 생성량이 터진다.
// =============================================================

export const TURNS = 3;        // 한 세트의 턴 수
export const CHOICES = 3;      // 턴당 선택지(= 응답) 수
export const POOL_CAP = 100;   // npc·lang 당 풀 상한. 없으면 DB·요금이 무한 증식
export const WEEKLY_PER_COMBO = 3;   // 크론 1회가 조합당 추가하는 세트 수
export const LANGS = ['ko', 'en'];
export const WEATHERS = ['clear', 'rain', 'snow', 'fog'];

// 길이 상한 — 선택지는 버튼에, 응답은 모달 대사줄에 들어간다.
// daily-quests 의 LINE_MAX(48/88) 보다 응답을 조금 길게 잡았다(버튼이 아니라 본문이라).
const LIMITS = {
  ko: { choice: 24, reply: 60 },
  en: { choice: 48, reply: 110 },
};

// 날씨 이름 — daily-quests 의 WEATHER_KO/EN 과 같은 값을 쓴다.
const WEATHER_WORD = {
  ko: { clear: '맑은 날', rain: '비 오는 날', snow: '눈 오는 날', fog: '안개 낀 날' },
  en: { clear: 'a sunny day', rain: 'a rainy day', snow: 'a snowy day', fog: 'a foggy day' },
};

// ── 캐릭터 시트 ───────────────────────────────────────────────
//  persona 는 말투 규칙, samples 는 few-shot. 둘 다 js/game.js 의 NPCS 에서 왔다.
//  ⚠️ 말투가 무너지는 게 이 기능의 가장 흔한 실패다. AI 티보다 이게 먼저 티난다.
export const NPC_SHEET = {
  farmer:    { name: '농부 삼촌',         nameEn: 'Farmer',             persona: '푸근한 중년 농부. 반말. 밭·작물 이야기.', personaEn: 'A warm, weathered farmer in middle age. Plain, friendly speech. Talks about the field and his crops.',                      samples: ['겨울 대비 장작이 필요해. 나무 3번만 베어줄래?', '모종이 목말라 해.'] },
  builder:   { name: '목수 아저씨',       nameEn: 'Carpenter',          persona: '활기찬 목수. 반말, 어미에 힘이 있다. 집·목재·연장 이야기.', personaEn: 'A cheerful carpenter with energy in every sentence. Talks about houses, timber and tools.',    samples: ['이제 근사한 집을 완성해보자고!', '만만치 않을 거야.'] },
  merchant:  { name: '방랑 상인',         nameEn: 'Wandering Merchant', persona: '떠돌이 장사꾼. **하오체**(~하오/~겠소/~시오). 장사·먼 마을 이야기.', personaEn: 'A travelling pedlar. Slightly old-fashioned, courtly phrasing. Talks about trade and far-off villages.', samples: ['여기 씨앗 3개를 줄 테니, 세 번 심어보겠소?', '큰 선물을 주겠소!'] },
  angler:    { name: '낚시꾼 할아버지',   nameEn: 'Old Fisherman',      persona: '노인. **하게체**(~하게/~하네/~게나). 허허 웃는다. 물고기·기다림 이야기.', personaEn: 'An old fisherman. Gentle, elderly speech; chuckles often. Talks about fish and patience.', samples: ['물면 바로 낚아채야 하네.', '만선의 꿈을 이뤄보게나!'] },
  chef:      { name: '요리사 판다',       nameEn: 'Chef Panda',         persona: '들뜬 요리사 판다. 반말. 재료·불조절·맛 이야기.', personaEn: 'An excitable panda cook. Casual, bouncy speech. Talks about ingredients, heat and flavour.',               samples: ['요리는 재료가 절반!', '타이밍을 잘 맞추면 버프도 오래가.'] },
  forager:   { name: '숲지기 오소리',     nameEn: 'Forest Badger',      persona: '다정한 숲지기. 반말, 끝을 부드럽게. 숲·버섯·나눔 이야기.', personaEn: 'A kindly forest-keeper badger. Soft, gentle endings. Talks about the woods, mushrooms and sharing.',      samples: ['어디에 뭐가 나는지 알려줄게.', '혼자 쌓아두면 재미없잖아.'] },
  stargazer: { name: '별 보는 아이',      nameEn: 'Stargazing Child',   persona: '어린아이. **해요체**. 들뜨고 순진하다. 별·반딧불이 이야기.', personaEn: 'A young child. Polite but excited and guileless. Talks about stars and fireflies.',    samples: ['세 마리만 같이 잡아요!', '보고 싶어요!'] },
  ferryman:  { name: '사공 오리',         nameEn: 'Duck Ferryman',      persona: '뱃사람. **하게체**(~하시게/~군/~게야). 물때·뱃길 이야기.', personaEn: 'A duck boatman. Weathered, salty speech. Talks about tides and river routes.',     samples: ['물때가 좋구먼.', '진짜 물가 사람이 되는 게야.'] },
  rancher:   { name: '목장 아주머니',     nameEn: 'Ranch Keeper',       persona: '살뜰한 아주머니. **해요체**. 닭·달걀·아침상 이야기.', personaEn: 'A caring ranch keeper. Warm, homely speech. Talks about hens, eggs and breakfast.',          samples: ['아침은 든든해야지!', '큰 도움이 될 거예요.'] },
  curator:   { name: '큐레이터 할아버지', nameEn: 'Museum Curator',     persona: '정중한 노신사. **합쇼체**(~습니다/~지요). 전시·수집 이야기.', personaEn: 'A courteous old gentleman. Formal, measured speech. Talks about exhibits and collecting.',  samples: ['첫 전시를 열고 싶군요.', '값진 걸로 보답하지요.'] },
  // ⚠️ 올빼미는 NPCS 에 line 이 없다(대사가 daily-quests 에서 온다).
  //    아래 persona 는 잠정이다 — 실제 올빼미 대사를 확인하고 조정할 것.
  courier:   { name: '의뢰 올빼미',       nameEn: 'Quest Owl',          persona: '의뢰를 중개하는 올빼미. 차분한 하게체. 마을 소식·의뢰 이야기.', personaEn: 'An owl who brokers errands. Calm and composed. Talks about village news and requests.', samples: ['오늘도 의뢰가 들어왔네.'] },
};

export const NPC_IDS = Object.keys(NPC_SHEET);

// ── 계획 — 어느 조합에 몇 세트가 더 필요한가 ──────────────────
//  counts: [{npc_id, lang, n}] (npc_pool_counts() 결과)
//  ⚠️ 상한을 넘겨 요청하지 않는다. 넘기면 DB·요금이 계속 늘고 뽑기 쿼리가 느려진다.
export function planGeneration(counts, { cap = POOL_CAP, per = WEEKLY_PER_COMBO } = {}) {
  const have = new Map();
  for (const c of Array.isArray(counts) ? counts : []) {
    // 모르는 npc_id 는 무시 — 옛 주민이 남아 있어도 계획을 오염시키지 않는다
    if (!NPC_SHEET[c?.npc_id] || !LANGS.includes(c?.lang)) continue;
    have.set(`${c.npc_id}/${c.lang}`, Number(c.n) || 0);
  }

  const plan = [];
  for (const npc_id of NPC_IDS) {
    for (const lang of LANGS) {
      const room = cap - (have.get(`${npc_id}/${lang}`) || 0);
      const want = Math.min(per, room);
      if (want > 0) plan.push({ npc_id, lang, want });
    }
  }
  return plan;
}

// ── 검증 — 모델이 준 걸 게임에 넣어도 되는가 ──────────────────
//  ⚠️ 언어 가드. 프롬프트를 영어로 고쳐도 모델은 가끔 미끄러진다.
//     여기서 못 막으면 영어 유저 화면에 한국어가 그대로 뜬다 —
//     실제로 lang='en' 330행이 전부 한국어로 들어간 적이 있다.
const HANGUL = /[가-힣]/;
const wrongLang = (lang, text) => lang === 'en' && HANGUL.test(text);

function clean(s, max) {
  const t = String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // 글자 중간에서 자르면 어색하다 — 마지막 공백까지만 남기고 말줄임
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > (max - 1) * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

export function validateSets(raw, { lang = 'ko' } = {}) {
  const lim = LIMITS[lang] || LIMITS.ko;
  const sets = [];
  let rejected = 0;

  for (const s of Array.isArray(raw) ? raw : []) {
    const turns = s?.turns;
    if (!Array.isArray(turns) || turns.length !== TURNS) { rejected++; continue; }

    const out = [];
    let ok = true;
    for (const t of turns) {
      const ch = t?.choices, rp = t?.replies;
      if (!Array.isArray(ch) || !Array.isArray(rp)) { ok = false; break; }
      if (ch.length !== CHOICES || rp.length !== CHOICES) { ok = false; break; }
      // 빈 문자열은 버튼이 비어 보이거나 대사가 끊긴다 — 세트째 버린다
      if ([...ch, ...rp].some(v => !String(v ?? '').trim())) { ok = false; break; }
      // 영어판에 한국어가 섞이면 세트째 버린다(일부만 걸러내면 대화가 반말·영어로 튄다)
      if ([...ch, ...rp].some(v => wrongLang(lang, String(v)))) { ok = false; break; }
      out.push({
        choices: ch.map(v => clean(v, lim.choice)),
        replies: rp.map(v => clean(v, lim.reply)),
      });
    }

    if (ok) sets.push({ turns: out }); else rejected++;
  }
  return { sets, rejected };
}

// ── 프롬프트 ─────────────────────────────────────────────────
//  ⚠️ npc·lang 은 화이트리스트로만 받는다. 호출부가 준 문자열을 그대로 프롬프트에
//     넣으면 인젝션 통로가 된다(cafe-guests 와 같은 규칙).
export function buildPrompt(npc, lang, n) {
  const sheet = NPC_SHEET[npc];
  if (!sheet) throw new Error(`unknown npc: ${npc}`);
  if (!LANGS.includes(lang)) throw new Error(`unknown lang: ${lang}`);
  const want = Math.max(1, Math.min(Number(n) || 1, 10));
  const lim = LIMITS[lang];

  if (lang === 'ko') {
    return [
      `${sheet.name} — ${sheet.persona}`,
      ``,
      `이 주민과 플레이어가 나누는 짧은 잡담을 ${want}세트 만들어라.`,
      `한 세트는 ${TURNS}턴이고, 각 턴은 플레이어 선택지 ${CHOICES}개와 그에 대한 응답 ${CHOICES}개로 이루어진다.`,
      `선택지 i를 고르면 응답 i가 나온다. 어느 선택지를 골랐든 다음 턴은 자연스럽게 이어져야 한다.`,
      ``,
      `- 말투를 절대 흩뜨리지 마라. 예시: ${sheet.samples.map(s => `"${s}"`).join(' ')}`,
      `- ⚠️ 날씨·계절·시간대를 말하지 마라. 이 대사는 아무 날에나 쓰인다.`,
      `- 플레이어에게 무엇을 하라고 시키지 마라. 의뢰는 다른 곳에서 준다.`,
      `- 선택지는 플레이어가 할 말이다. ${lim.choice}자 이내로 짧게.`,
      `- 응답은 ${sheet.name}의 말이다. ${lim.reply}자 이내.`,
      `- 포근하고 조용한 마을 분위기. 과장·이모지·느낌표 남발 금지.`,
      ``,
      `JSON 배열로만 답하라:`,
      `[{"turns":[{"choices":["…","…","…"],"replies":["…","…","…"]}]}]`,
    ].join('\n');
  }

  // ⚠️ 이 분기에는 한국어를 한 글자도 넣지 않는다. 예전에 한국어 persona 와 '날씨' 를
  //    그대로 섞어 넣고 "영어로 써라"를 빼먹어, lang='en' 으로 만든 330행이 전부
  //    한국어로 들어갔다. personaEn 을 쓰고, 언어 지시를 맨 앞에 못박는다.
  return [
    `Write everything in English.`,
    ``,
    `${sheet.nameEn} — a villager in a cozy forest village. ${sheet.personaEn}`,
    ``,
    `Write ${want} short small-talk sets between this villager and the player.`,
    `Each set has ${TURNS} turns; each turn has ${CHOICES} player choices and ${CHOICES} matching replies.`,
    `Choosing choice i yields reply i. The next turn must follow naturally from any choice.`,
    ``,
    `- Every line must be in English. Do not use any other language or script.`,
    `- Keep the character's voice consistent throughout.`,
    `- Never mention weather, season, or time of day — these lines are reused on any day.`,
    `- Never tell the player to go do a task. Quests come from elsewhere.`,
    `- "choices" are what the PLAYER says. Max ${lim.choice} characters.`,
    `- "replies" are what ${sheet.nameEn} says. Max ${lim.reply} characters.`,
    `- Cozy, quiet village tone. No hype, no emoji spam.`,
    ``,
    `Respond with a JSON array only:`,
    `[{"turns":[{"choices":["...","...","..."],"replies":["...","...","..."]}]}]`,
  ].join('\n');
}

// ── 날씨 첫인사 ──────────────────────────────────────────────
//  본문과 정반대 규칙이다. 본문은 날씨를 말하면 안 되고, 첫인사는 **반드시** 말해야 한다.
//  날짜가 안 들어가므로 1회 생성하고 영구 재사용한다 — "비 오는 날 농부의 첫마디"가
//  매일 새로울 이유는 없다. 본문 캐시 키에서 weather 를 뺄 수 있는 근거가 이것.
export function buildOpenerPrompt(npc, lang, weather, n) {
  const sheet = NPC_SHEET[npc];
  if (!sheet) throw new Error(`unknown npc: ${npc}`);
  if (!LANGS.includes(lang)) throw new Error(`unknown lang: ${lang}`);
  if (!WEATHERS.includes(weather)) throw new Error(`unknown weather: ${weather}`);
  const want = Math.max(1, Math.min(Number(n) || 1, 10));
  const word = WEATHER_WORD[lang][weather];
  const lim = LIMITS[lang];

  if (lang === 'ko') {
    return [
      `${sheet.name} — ${sheet.persona}`,
      ``,
      `${word}에 이 주민이 플레이어를 보고 건네는 **첫마디**를 ${want}개 만들어라.`,
      `대화의 말문을 여는 한 줄이다. 질문으로 끝나도 되고 혼잣말이어도 된다.`,
      ``,
      `- 말투를 절대 흩뜨리지 마라. 예시: ${sheet.samples.map(s => `"${s}"`).join(' ')}`,
      `- ${word}이라는 게 드러나야 한다. 그게 이 문장의 존재 이유다.`,
      `- 날짜·요일·계절은 말하지 마라. 날씨만.`,
      `- 한 줄, ${lim.reply}자 이내.`,
      `- 포근하고 조용한 마을 분위기.`,
      ``,
      `JSON 문자열 배열로만 답하라:`,
      `["…","…","…"]`,
    ].join('\n');
  }

  // ⚠️ 본문과 같은 이유로 한국어를 섞지 않는다(위 buildPrompt 주석 참조).
  return [
    `Write everything in English.`,
    ``,
    `${sheet.nameEn} — a villager in a cozy forest village. ${sheet.personaEn}`,
    ``,
    `Write ${want} opening lines this villager says to the player on ${word}.`,
    `One line that opens a conversation. A question or a musing both work.`,
    ``,
    `- Every line must be in English. Do not use any other language or script.`,
    `- Keep the character's voice consistent.`,
    `- It must read as ${word} — that is the whole point of the line.`,
    `- Do not mention the date, weekday, or season. Weather only.`,
    `- One line, max ${lim.reply} characters.`,
    `- Cozy, quiet village tone.`,
    ``,
    `Respond with a JSON array of strings only:`,
    `["...","...","..."]`,
  ].join('\n');
}

export function validateOpeners(raw, { lang = 'ko' } = {}) {
  const lim = LIMITS[lang] || LIMITS.ko;
  const lines = [];
  let rejected = 0;
  for (const v of Array.isArray(raw) ? raw : []) {
    // 숫자·객체가 섞여 오면 String() 이 "42"·"[object Object]" 로 통과시킨다 — 타입을 본다
    if (typeof v !== 'string' || !v.trim()) { rejected++; continue; }
    if (wrongLang(lang, v)) { rejected++; continue; }   // 영어판에 한국어 첫인사
    lines.push(clean(v, lim.reply));
  }
  return { lines, rejected };
}

// ── Gemini 호출 ──────────────────────────────────────────────
//  cafe-guests.js 의 규약을 그대로 따른다(모델·헤더·JSON 강제).
//  responseSchema 로 형태를 한 번 강제하고, 그래도 validate* 로 또 거른다 —
//  스키마는 "3개"까지는 강제하지 못하고, 빈 문자열·꺾쇠·길이는 전혀 못 막는다.
const strs = (n) => ({ type: 'ARRAY', minItems: n, maxItems: n, items: { type: 'STRING' } });

// ⚠️ 바깥 배열에도 minItems/maxItems 를 건다. 안 걸면 "3세트 달라"는 프롬프트를
//    모델이 무시하고 1세트만 줘도 스키마를 통과한다 — 실측에서 22호출 중 절반이
//    1세트만 돌려줘 66 요청에 42만 들어왔다.
const dialogueSchema = (n) => ({
  type: 'ARRAY',
  minItems: n,
  maxItems: n,
  items: {
    type: 'OBJECT',
    properties: {
      turns: {
        type: 'ARRAY', minItems: TURNS, maxItems: TURNS,
        items: {
          type: 'OBJECT',
          properties: { choices: strs(CHOICES), replies: strs(CHOICES) },
          required: ['choices', 'replies'],
        },
      },
    },
    required: ['turns'],
  },
});

const openerSchema = (n) => ({ type: 'ARRAY', minItems: n, maxItems: n, items: { type: 'STRING' } });

// ⚠️ 다른 API(cafe-guests·daily-quests·dex-notes·night-note)와 달리 GEMINI_MODEL 을
//    읽지 않는다. 그 변수는 tools/cardnews/generate.mjs 가 **이미지 모델**
//    (gemini-3-pro-image-preview)로도 쓰고 있어서, 셸에 그 값이 떠 있으면
//    대사 생성이 이미지 모델로 나가 즉시 429(무료 쿼터 소진)가 난다.
//    (`node --env-file` 은 이미 있는 환경변수를 덮어쓰지 않으므로 .env 로도 못 막는다.)
//    이 모듈은 로컬·워커 양쪽에서 도니까 텍스트 모델을 직접 못박고,
//    바꿀 일이 있으면 전용 변수로만 받는다.
async function askGemini(env, prompt, schema) {
  const model = env.NPC_GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.15,              // 세트마다 다른 화제가 나오게
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return JSON.parse(text);
}

export async function generateDialogues(env, npc, lang, n) {
  const want = Math.max(1, Math.min(Number(n) || 1, 10));
  const raw = await askGemini(env, buildPrompt(npc, lang, want), dialogueSchema(want));
  return validateSets(raw, { lang });
}

export async function generateOpeners(env, npc, lang, weather, n) {
  const want = Math.max(1, Math.min(Number(n) || 1, 10));
  const raw = await askGemini(env, buildOpenerPrompt(npc, lang, weather, want), openerSchema(want));
  return validateOpeners(raw, { lang });
}
