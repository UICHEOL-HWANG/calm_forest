# client-logs — tasks
- [x] 0-a 콘솔 로그 숨기기 — ✅ 핫픽스로 먼저 웹 배포(2026-10-13 main f1266785, Worker 695f1788). 토스·itch·Android·iOS 는 다음 정기 배포
- [x] 0-b 요금제 확인: 무료 → Queue 제외
- [ ] 0-c R2 활성화(사용자)
- [x] 1-a 수집기 코어(client-errors.js·링버퍼, 테스트 25)
- [x] 1-b client-errors-boot.js(오류 훅·전송)
- [x] 2 /api/logs + 라우트 등록
- [x] 3 client_errors·client_error_daily DDL(+v2 하드닝, 운영 적용)
- [x] 4 client_logs_daily DAG — VM 배포·unpause·스모크 통과(첫 실행 10/14 04:30 KST)
- [ ] 5 문의하기 로그 첨부
- [ ] 6 관리자 페이지(시안 3개)
- [~] 7 웹 배포 ✅(main cc2a649b, Worker 15cb4452, 라이브 E2E 통과) · 토스·itch·Android·iOS 다음 정기 배포 · 10/14 DAG 결과 확인

## 리뷰 지적(2026-10-13) — ✅ 아래 전부 반영해 배포(관리자 페이지·링버퍼 항목은 5·6단계에서)
- [ ] H1 maskText 정규식 2차 시간 — 자르고 나서 가리기 + 정규식 길이 제한(서버·기기)
- [~] M 레이트 리밋: LOGS_LIMITER(20/60s) 배포했지만 145회 연타에도 429 안 남(무료 요금제·전파 지연 의심) → WAF 규칙 검토. 대신 DB 하루 2만 상한·자가 정리로 방어
- [ ] M DAG 가 며칠 실패하면 client_errors 가 쌓임 → 함수 안 3일 지난 행 정리 + 하루 상한 2만으로
- [ ] M 깨진 문자(\u0000·반쪽 서로게이트)·거대 ts 로 묶음 전체 실패 → 서버 4xx 는 버림(200), ts 범위 제한, 코드포인트 단위 자르기
- [ ] M 본문 상한: content-length 없을 때 스트림으로 바이트 상한
- [ ] M suppressed 만 있는 flush 금지 · suppressed 는 첫 행에만
- [ ] M 실패한 전송이 세션 예산을 먹음 → 성공만 세기 + 실패 시 backoff · beacon 별도 상한
- [ ] M 전송 타임아웃(15초) 없으면 inFlight 고착
- [ ] M 413·4xx 영구 실패는 기기에서 버리기 · 기기 쪽 묶음 크기 상한(한글 3바이트)
- [ ] L 사파리 스택 `fn@https://…` 가 [email] 로 가려짐 → 스택은 이메일 마스크 제외
- [ ] L 스택 안 URL 쿼리 제거 · data:/blob: URL 버림 · refresh_token 패턴 마스크
- [ ] L search_path = '' · count(*) 대신 카운터
- [ ] L 관리자 페이지는 textContent 만(저장형 XSS) · url 을 href 로 쓰지 않기
- [ ] L 링버퍼 JSON.stringify 비용 — 첨부 때 지연 직렬화

## 후속 백로그 (2026-11-02)
- [~] 네트워크 요청 실패 원인 조사·재시도 보강 — 최근 `client_errors` 에서 `game_saves`·`session_logs` 등의 `Failed to fetch` 확인
  - [ ] Worker·Supabase 로그와 오류 발생 시각을 대조해 플랫폼별(웹·Android·iOS·토스) 실패 endpoint, 상태 코드/DB 오류, 반복 여부를 확인 — 11/2 최근 24시간 PostgREST 로그에는 테이블 경로 요청이 나타나지 않아 원인 미확정
  - [ ] 네트워크 단절·timeout·429·5xx와 인증/RLS·요청 형식 등 재시도로 해결되지 않는 실패를 구분하고 사용자 데이터 영향 확인
  - [x] `game_saves` 읽기·쓰기 재시도에 jitter 추가(5초 최대 간격은 유지); 동기화된 재시도 요청을 분산
  - [x] `session_logs` upsert 에 일시 네트워크/429/5xx 최대 3회 재시도 추가; 세션당 최신 요약만 직렬 전송해 중복·역순 덮어쓰기 방지
  - [ ] 영구 실패는 재시도 중단 및 저장 실패 안내·복구 경로 점검; 성공/최종 실패를 로그에서 구분
