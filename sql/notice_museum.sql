-- 📮 소식함 공지 — 🏛️ 박물관 · 🔨 증축 안내 · 🪓 도구 등급 (2026-09-14)
--   notices 테이블은 클라이언트가 select 만 한다. insert 는 SQL Editor / service_role MCP 로만.
--   (이 저장소에 붙은 supabase MCP 는 --read-only 라 여기서 실행이 막힌다)
insert into public.notices (title, body, title_en, body_en) values (
  '🏛️ 박물관이 열렸어요',
  E'마을 서쪽, ⛏️채굴 동굴 너머에 박물관이 생겼어요.\n\n📖도감에 등록한 것이 그대로 전시돼요. 진열장 앞에 서면 "언제 처음 발견했는지"가 뜨고, 액션을 누르면 크게 띄워 돌려 볼 수 있어요. 🎀천이 덮인 자리는 아직 못 찾은 것 — 찾아오면 천을 걷어 드릴게요.\n\n많이 모을수록 건물이 자라요. 1층을 채우면 2층이, 2층을 채우면 3층이 열려요. 코인으로는 못 여는 곳이라, 발로 뛴 만큼만 커집니다.\n\n입구 옆에 🧑‍🦳큐레이터 할아버지가 계세요. 개관을 도와드리면 보답이 있고, 이따금 "아직 그것이 없군요" 하며 다음에 찾을 것을 콕 집어 주신답니다.',
  '🏛️ The Museum has opened',
  E'West of the village, past the ⛏️ Mine, a museum has appeared.\n\nWhatever you register in your 📖 Field Guide goes on display. Stand before a case and it tells you when you first found that thing; press action to lift it up close and turn it around. A case under a 🎀 cloth is something you haven''t found yet — bring it in and we''ll draw the cloth back.\n\nThe building grows as you collect. Fill the ground floor and the second opens; fill that and the third follows. Coins can''t open it — only legwork can.\n\nThe 🧑‍🦳 Curator waits by the door. Help him open the first display and he''ll repay you, and now and then he''ll name the one thing you''re still missing.'
);

insert into public.notices (title, body, title_en, body_en) values (
  '🔨 증축 안내 · 🪓 도구가 달라져요',
  E'집을 다 지은 뒤에 뭘 해야 할지 모르겠다는 이야기가 있었어요. 🔨목수 아저씨가 이제 증축을 알려드려요 — 집 앞에서 [🎨집 외관 꾸미기]를 열면 맨 위에 🏗️증축이 있답니다.\n\n도구 업그레이드가 눈에 보여요. 강철 도끼는 머리가 커지고, 큰 물조리개엔 장미꼭지가 달리고, 튼튼한 낚싯대는 이음쇠와 코르크 손잡이가 생겨요. 이미 사두신 분은 접속하시면 바로 달라져 있어요.\n\n새 업그레이드도 다섯 가지 늘었어요. ⛏️무쇠 괭이(광맥을 한 번 덜 캐요) · 🌰넉넉한 씨앗 주머니(씨앗이 가끔 안 줄어요) · 🌾잘 드는 낫(옆 칸도 함께 거둬요) · 🪏넓은 삽(한 번에 메워요) · 🔨묵직한 망치(건축·증축 목재가 줄어요).',
  '🔨 Upgrading, explained · 🪓 Your tools now show it',
  E'You told us it wasn''t clear what to do once the house was finished. The 🔨 Carpenter will now walk you through upgrading — open [🎨 Decorate Exterior] by your house and 🏗️ Upgrade sits right at the top.\n\nTool upgrades are visible at last. The Steel Axe has a heavier head, the Big Watering Can gains a rose spout, the Sturdy Rod gets a ferrule and a cork grip. If you already bought one, it will look different the moment you log in.\n\nFive more upgrades have been added: ⛏️ Iron Pickaxe (one less swing per vein) · 🌰 Roomy Seed Pouch (seeds sometimes aren''t used up) · 🌾 Keen Sickle (harvests the neighbouring plot too) · 🪏 Wide Shovel (fills a plot in one dig) · 🔨 Heavy Hammer (building and upgrading cost less wood).'
);
