-- 📮 소식함 공지 — 🦋 텃밭 방문객 (2026-09-18)
--   notices 테이블은 클라이언트가 select 만 한다. insert 는 SQL Editor / service_role MCP 로만.
--   (이 저장소에 붙은 supabase MCP 는 --read-only 라 여기서 실행이 막힌다)
--
--   ⚠️ 실행 시점 주의 — 소식함은 웹·토스가 같은 Supabase 를 본다.
--      웹 배포 **뒤**, 그리고 토스 번들이 출시된 **뒤**에 실행할 것.
--      먼저 넣으면 토스 이용자는 텃밭에 가서 아무것도 못 찾는다(🦉퀘스트 확장 때와 같은 함정).
--
--   ⚠️ 이 공지가 꼭 필요한 이유 — 도감 총계가 66 → 70 으로 늘어난다.
--      배지·보상·박물관 층은 그대로다(awardBadge 는 회수하지 않고, 완성 보상은
--      badges.dex_master 가 막는다 — tests/museum.test.mjs 가 둘 다 잠갔다).
--      그래도 **이미 다 모은 분의 카운터가 66/70 으로 보인다.**
--      안내 없이 두면 "내 도감이 깨졌다" 로 읽힌다.
insert into public.notices (title, body, title_en, body_en) values (
  '🦋 텃밭에 손님이 찾아와요',
  E'텃밭을 꾸미면 동물들이 스스로 찾아오게 됐어요.\n\n잡거나 캐지 않아도 돼요. 🌷꽃밭을 두면 나비가, 작물이 다 익으면 참새가 날아와요. 가까이 다가가면 도감에 등록되고, 조건이 그대로면 다음에도 또 찾아와요.\n\n어떤 자리를 좋아하는지는 🪵장식을 놓는 동안 옆에 뜨는 쪽지가 알려줘요. 무엇이 모자란지, 무엇이 막고 있는지 적혀 있어요.\n\n🎃허수아비는 밤손님만 쫓는 게 아니라 이 손님들도 쫓아요. 울타리 밖으로 조금 물려 두면 밭은 그대로 지켜 주면서 손님도 오게 할 수 있어요.\n\n도감이 4종 늘어 모두 70종이 됐어요. 이미 다 모으신 분의 🏅도감 마스터 배지는 그대로 있어요 — 숫자만 새 손님만큼 늘어난 거예요.',
  '🦋 Visitors are coming to your garden',
  E'Decorate your garden and animals will come on their own.\n\nNo catching or digging needed. Put down a 🌷 flower bed and butterflies arrive; let your crops ripen and sparrows drop by. Walk up to one and it joins your collection, and it will keep coming back as long as the spot still suits it.\n\nWhile you are placing 🪵 decorations, a note beside you tells you what a spot is missing and what is keeping visitors away.\n\nOne thing to know: the 🎃 scarecrow scares off these visitors too, not just night raiders. Move it a little outside the fence and it still guards your crops while letting visitors in.\n\nThe collection grew by 4 entries, to 70 in total. If you had already completed it, your 🏅 Collection Master badge stays exactly where it is — only the number grew.'
);
