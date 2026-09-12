-- 📮 소식함 공지 — 🛶 나룻배 물보라·등불 (2026-09-12)
--   notices 테이블은 클라이언트가 select 만 한다. insert 는 SQL Editor / service_role MCP 로만.
--   (이 저장소에 붙은 supabase MCP 는 --read-only 라 여기서 실행이 막힌다)
--   ⚠️ 줄바꿈 때문에 E'...' 문자열이다. 일반 '...' 로 바꾸면 \n 이 글자로 들어간다.
insert into public.notices (title, body, title_en, body_en) values (
  '🛶 밤 뱃길 정비',
  E'물보라가 눈이 부시다는 이야기를 주셔서 나룻배를 손봤어요.\n\n배가 달릴 때 튀던 물보라가 너무 밝아 오래 보고 있으면 눈이 피로했죠. 이제 옅은 물빛으로 바뀌어 뱃머리 양옆으로 갈라져 튑니다.\n\n🏮뱃머리 등불도 자리를 옮겼어요. 등불이 화면 한가운데 있어서 바로 앞 바위가 그 불빛에 묻혔거든요. 이제 뱃전 기둥에 매달려 시선 위에 있고, 불빛은 코앞 물살 대신 앞쪽 물길을 비춰요. 밤에도 장애물이 더 일찍 보입니다.',
  '🛶 Night river, easier on the eyes',
  E'You told us the spray was too bright, so we went over the ferry.\n\nThe spray thrown up as you row was bright enough to tire your eyes on a long run. It''s a soft water colour now, and it splits to either side of the bow instead of filling the middle of the screen.\n\nThe 🏮 bow lantern moved too. It sat right in the middle of your view, so rocks just ahead were lost in its glow. It now hangs from a post above your line of sight, and its light falls on the water ahead rather than on the bow — so obstacles show up earlier at night.'
);
