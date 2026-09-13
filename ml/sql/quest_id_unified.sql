-- 퀘스트 퍼널 표준 quest_id (신·구 데이터 통합)
--   2026-09-13 이후: owl_special_deliver 에도 quest_id 가 붙고, ✨특별 의뢰의 수락·완료 id 가
--   `courier:3`(순번) → `courier:special:<type>` 으로 바뀐다. 그 이전 행은 GA4 export 를 고쳐 쓸 수 없으니
--   제목(quest)으로 같은 값을 복원한다. 새 이벤트는 quest_id 를 그대로 쓴다(COALESCE 우선).
--   ⚠️ 제목은 OWL_SPECIAL_POOL(js/game.js) 과 짝 — 풀에 항목을 넣으면 여기도 추가.
WITH e AS (
  SELECT
    event_date, event_timestamp, user_pseudo_id, event_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'quest_id') AS quest_id_raw,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'quest')    AS quest_title,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'npc')      AS npc,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'platform') AS platform
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260727' AND FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Seoul'))
    AND event_name IN ('quest_offered', 'quest_accept', 'quest_complete', 'owl_special_deliver', 'lucky_box')
),
legacy AS (
  SELECT *,
    CASE
      WHEN quest_title LIKE '%달빛 장작%' THEN 'chop'
      WHEN quest_title LIKE '%은빛 물결%' THEN 'fish'
      WHEN quest_title LIKE '%깊은 광맥%' THEN 'mine'
      WHEN quest_title LIKE '%풍요의 밤%' THEN 'harvest'
      WHEN quest_title LIKE '%숲의 선물%' THEN 'forage'
      WHEN quest_title LIKE '%별빛 장터%' THEN 'sell'
    END AS special_type
  FROM e
)
SELECT
  event_date, event_timestamp, user_pseudo_id, event_name, platform, npc, quest_title,
  quest_id_raw,
  COALESCE(
    -- 새 이벤트: 그대로. 단 옛 순번형 특별 의뢰(courier:3)는 종류로 바꾼다
    IF(quest_id_raw IS NOT NULL AND NOT (quest_id_raw = 'courier:3' AND special_type IS NOT NULL), quest_id_raw, NULL),
    IF(special_type IS NOT NULL, CONCAT('courier:special:', special_type), NULL),
    quest_id_raw
  ) AS quest_id
FROM legacy
