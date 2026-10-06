# 박물관 리디자인 — 체크리스트 (계획서 Task 번호와 같음)

브랜치 feat/museum-redesign · 마지막 갱신 2026-10-06 · 테스트 1847건 통과

- [x] 1 실제 도감 id 도우미 + 층 정의 layout·theme (55966ba)
- [x] 2 layout.js 순수 배치 (1840e22)
- [x] 3 슬롯 테스트 교체 + museumDims 소비처 (bbd5ad8, 4와 함께)
- [x] 4 buildMuseumHall 재작성 — 정문 1층만, 상층 난간+유리창, 탁자
- [x] 5 exhibit-parts 뼈대 + 광물 (3c84d19)
- [x] 6 exhibit-build + museumExhibitMesh 배선 (2e255ed)
- [x] 7~9 채집·반딧불이·흔적·땅속·강·정령·날씨·주민·요리·방문객 (58d3722, 한 커밋으로 합침 — 변환기로 시안 모델 자동 이식)
- [x] 10 전부 덮는지 잠금 + 층 테마 C(푸른 저녁) 사용자 선택 + 회랑 방 크기를 칸 수에 맞춤 (8377990)
- [x] 11 실측 검증: 76칸 전부 명판·확대 관람 OK, 드로우콜 A/B(옛 main 대비 최대 +13콜), 콘솔 에러 0
- [ ] 푸시·배포(사용자 승인 후): 웹·토스·itch·안드로이드 4곳 동시, 푸시 main + feat/capacitor-app, 푸시 전 키 스캔(git grep AIza|GOCSPX-)
- [ ] main 병합 (feat/museum-redesign → main)
- [ ] (선택) 소식함 공지 — 박물관이 새 모습이 됐다는 안내
