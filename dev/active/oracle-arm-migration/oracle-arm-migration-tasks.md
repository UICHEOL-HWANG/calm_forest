# 체크리스트 — 오라클 ARM 이전

**Last Updated:** 2026-09-12

## 0. 준비
- [x] 구 VM 실측(shape·생성일·IP·컨테이너)
- [x] 백업 — pgdump / `/opt` tar / nginx·letsencrypt tar / STATE.md
- [x] ARM 호환성 검증(이미지 3종 + 파이썬 휠)
- [x] 설계 승인
- [x] dev docs 생성

## 1. 사전 확인
- [x] 구 VM(E5) 아직 running — 병행 전환 가능
- [x] A1 무료 한도 축소 확인 (4 OCPU/24GB → **2 OCPU/12GB**)
- [x] A1 용량 — **AD-1/2/3 전부 부족**. `VM.Standard.A2.Flex` 는 서비스 한도 0 이라 대안 아님
- [x] 방향 재검토 → **워크로드 분리**로 전환 (plan 참조)

## 1-A. `/predict` → Cloudflare Worker  ⬅️ **새 1순위**
- [ ] 설계 — 점수 적립처(Supabase 테이블) · `coef.json` 배포처(KV) · 라우트
- [ ] 승인
- [ ] 구현 + 테스트
- [ ] 배포 · `js/tuning.js` 엔드포인트 교체
- [ ] 검증 — 개입 배너 정상 노출, GA4 `churn_score` 기록 확인
- [ ] ⚠️ `worker/index.js` 라우트 등록 필수 (dex-notes·daily-quests 404 전례)

## 2. A1 인스턴스 생성 — 🙋 사용자 (용량 열릴 때까지 재시도)
- [ ] 재시도 자동화 여부 결정 (OCI CLI + API 키) — 수동 클릭은 3 AD 모두 실패함
- [ ] Ubuntu 24.04 LTS aarch64 이미지 선택
- [ ] VM.Standard.A1.Flex · 2 OCPU · 12GB
- [ ] 구 VM 과 동일 VCN/서브넷, 공인 IP 할당
- [ ] 기존 SSH 공개키 등록
- [ ] 생성된 공인 IP 를 알려주기

## 3. 호스트 준비
- [ ] `~/.ssh/config` 에 `oracle-calmforest-arm` 별칭 추가
- [ ] apt 업데이트 + docker-ce·compose plugin 설치(arm64)
- [ ] nginx · iptables-persistent 설치
- [ ] `update-cf-ips.sh` 배치 + 주 1회 cron 등록
- [ ] ⚠️ **방화벽 증명** — 오리진 IP 직접 접근이 실제로 차단되는지 확인
      (Cloudflare 아닌 곳에서 `curl http://<신IP>` → 타임아웃이어야 함)

## 4. 스택 복원
- [ ] 백업 tar 업로드 + 전개(`/opt/airflow`, `/opt/calm-api`)
- [ ] `.env` · `secrets/gcp_sa.json` 권한 복원(600 / 700)
- [ ] `AIRFLOW_UID` 값 신 호스트에 맞게 확인
- [ ] `docker compose up -d --build` — arm64 이미지 빌드
- [ ] Postgres 기동 후 pgdump 복원
- [ ] nginx 설정 배치 + `nginx -t` + reload
- [ ] calm-api compose 기동

## 5. 검증 (전환 전, 오리진 직결)
- [ ] `curl --resolve lab.calmforest.cloud:443:<신IP>` → Airflow UI 응답
- [ ] `/health` 200
- [ ] `airflow dags list` — DAG 3개, Import Error 0
- [ ] `airflow dags test churn_train <날짜>` 실제 성공
- [ ] churn API 추론 요청 → 정상 응답
- [ ] 컨테이너 4개 healthy

## 6. DNS 전환 — 🙋 사용자 승인 필요
- [ ] Cloudflare A 레코드 → 신 IP
- [ ] 전파 후 `https://lab.calmforest.cloud/health` 200
- [ ] Airflow UI 로그인 확인
- [ ] 구 VM 은 **유지**(롤백 카드)

## 7. 정리 (안정화 후)
- [ ] 구 VM 종료/종결
- [ ] `infra/airflow/README.md` — OS·아키텍처, arm64 재빌드 주의, DAG 표 갱신
      (현재 README 는 `tableau_sheets` 기준인데 실제론 `churn_*` 가 떠 있음)
- [ ] dev docs → `dev/done/` 이동
- [ ] 메모리 `lab-infra-setup.md` 갱신
