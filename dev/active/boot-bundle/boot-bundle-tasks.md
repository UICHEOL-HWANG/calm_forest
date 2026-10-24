# boot-bundle 체크리스트

- [ ] 0. Lighthouse 모바일 기준선 (운영)
- [ ] 0. 10/25 GA4 광고 유입 입구 통과율 기준선
- [ ] 0. boot_ready 이벤트 필요 여부 결정
- [ ] 1. scripts/lib/bundle-boot.mjs + 테스트(묶음 생성·인라인 교체·https 외부 유지)
- [ ] 1. 4개 빌드 스크립트 마지막 단계에 연결
- [ ] 2. three 묶음 포함, importmap 제거(cap vendor 치환과 충돌 확인)
- [ ] 3. _headers /js/b/* immutable
- [ ] 4. (승인 후) i18n-en 지연 로드
- [ ] 5. npm test · 웹 미리보기 부팅 스모크 · 콘솔 오류 0
- [ ] 5. Lighthouse 재측정 · 성공 기준 대조
- [ ] 5. 10/31 이후 5곳 동시 배포
