-- 📮 소식함 공지 — 🍳 요리 코스 개편 (2026-09-11)
--   notices 테이블은 클라이언트가 select 만 한다. insert 는 SQL Editor / service_role MCP 로만.
--   (이 저장소에 붙은 supabase MCP 는 --read-only 라 여기서 실행이 막힌다)
insert into public.notices (title, body, title_en, body_en) values (
  '🍳 요리 개편',
  E'요리가 어렵고 단조롭다는 이야기를 주셔서 손봤어요.\n\n미니게임이 넷으로 늘었어요. 🔥굽기와 🧂간 맞추기가 새로 들어왔고 요리마다 ★1~★3 난이도가 붙었죠. ★1은 한 판짜리에 판정도 넉넉하니 가볍게 시작해 보세요.\n\n만든 음식은 🧺찬장에 넣어 뒀다가 나중에 꺼내 먹어요. 카페에서는 손님 앞에서 바로 요리하고요. 찬장에 있으면 미니게임 없이 그대로 내드리면 돼요.\n\n카페 손님은 마을 주민이 아니라 이웃 마을에서 오는 이들이에요. 밖에 서 있던 상인이 카페에도 앉아 있던 일은 이제 없어요.',
  '🍳 Cooking, reworked',
  E'You told us cooking felt hard and samey, so we reworked it.\n\nThere are four minigames now — 🔥 Grill and 🧂 Season join Simmer and Chop — and every dish has a ★1–★3 rating. ★1 dishes are a single round with far more forgiving timing, so they''re an easy place to start.\n\nFinished dishes go into your 🧺 pantry and can be eaten later. At the Café you cook right in front of the guest, and if the dish is already in your pantry you just serve it.\n\nCafé guests are out-of-town neighbours now, not villagers. The wandering merchant won''t be standing outside and sitting in the café at the same time any more.'
);
