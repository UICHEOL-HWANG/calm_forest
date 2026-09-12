-- 📮 소식함 공지 — 🦉 퀘스트 확장 (2026-09-13)
--   notices 테이블은 클라이언트가 select 만 한다. insert 는 SQL Editor / service_role MCP 로만.
--   (이 저장소에 붙은 supabase MCP 는 --read-only 라 여기서 실행이 막힌다)
--
--   ⚠️ 실행 시점 주의 — 소식함은 웹·토스가 같은 Supabase 를 본다.
--      웹은 2026-09-13 배포 완료(main 2e50024)지만 토스는 아직 라이브가 20260912-37 이라
--      이 공지를 먼저 넣으면 토스 이용자는 새 이웃을 찾으러 갔다가 못 찾는다.
--      토스 번들이 출시된 뒤에 실행할 것.
insert into public.notices (title, body, title_en, body_en) values (
  '🦉 의뢰가 늘었어요',
  E'의뢰를 다 깨고 나면 할 일이 없다는 이야기를 여럿이 주셨어요.\n\n이제 부탁을 다 들어드린 주민도 다시 말을 걸어와요. 매일 세 분이 오늘 도움이 필요한 이웃이 되니, 마을을 한 바퀴 돌며 말풍선이 뜬 이웃을 찾아보세요.\n\n마을 바깥에도 새 이웃 네 분이 자리를 잡았어요. 🦡숲지기 오소리는 채집 숲에, ⭐별 보는 아이는 반딧불이 계곡에, 🦆사공 오리는 나루터에, 🐔목장 아주머니는 닭장 옆에 있어요.\n\n의뢰로 나오는 일도 넓어졌어요. 🗿조각과 🥚달걀 걷기, 🎁선물과 🪵장식 놓기, 🛶강 달리기와 🌊바다낚시, 🌫️안개 숲까지 나와요.',
  '🦉 More errands to go around',
  E'Several of you told us there is nothing left to do once the errands run out.\n\nNow villagers whose requests you have already finished will ask again. Three of them need a hand each day, so take a walk around the village and look for the speech bubbles.\n\nFour new neighbours have settled around the edges of the village — 🦡 Badger the Forest Keeper in the foraging woods, ⭐ the Stargazing Kid at Firefly Valley, 🦆 Duck the Ferryman at the dock, and 🐔 the Ranch Auntie beside the coop.\n\nErrands cover more ground too: 🗿 carving, 🥚 collecting eggs, 🎁 gifts, 🪵 placing decorations, 🛶 river runs, 🌊 sea fishing, and clearing the 🌫️ misty woods.'
);
