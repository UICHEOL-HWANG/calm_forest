- [x] 키 스캔(추가 줄 0건)
- [x] 캐패시터 워크트리 main ff·versionCode 127 / 1.4.15 커밋 abb0a924(미푸시)·테스트 5240
- [x] 웹 dist 882개 · 토스 calmforest.ait · itch.zip(루트)
- [x] 안드로이드 AAB(새 코드 포함 확인)
- [x] 스토어 상태: 토스 -204 라이브·검토 대기 없음 / Play prod 124·alpha 123·internal 126 / iOS 1.0.27 빌드 52 REJECTED(11/9), 라이브 1.0.25
- [x] 출시 노트·토스 메모 초안(release-notes.md)
- [ ] iOS 거절 사유 확인·영상 여부 결정(사용자)
- [ ] 토스 광고 그룹 ID 재확인(01:40 이후)
- [ ] 사용자 확인 → 푸시(main·feat/capacitor-app)·웹·토스 업로드·Play internal→alpha+production·zone SQL

## 녹화 피드백 반영 (11/12 00:40)
- [x] 설문 탭 안 됨: 월드 부팅이 메인 스레드를 막음 → 설문을 띄우면 답 받은 뒤 부팅 (onDecide)
- [x] 포구 안내창이 의뢰 패널을 덮음 → 사용자 B안: 세로 폰은 아래 안내 줄 위(bottom 280px), 문 안내 뜨면 그 위로 비켜 섬
- [x] 끊김: 걷다 새 물체 첫 등장 때 셰이더 컴파일(134ms) → 부팅 끝·플레이 시작 때 compileAsync 미리 굽기. 재측정 3회: 셰이더 컴파일 사라짐, 나무 3그루 벌목 중 34ms 넘는 프레임 0
- [x] 심사 영상: ~/Downloads/calmforest-review-att.mp4 (720p H.264 6MB, 69초, 빌드 53 녹화)
- [ ] iOS 빌드 54·안드로이드 127 재빌드(진행 중)

## 배포 (11/12 00:50~01:00)
- [x] 키 스캔 0건 · 푸시 main 3923329c · capacitor b75992c9 · ios e1138110
- [x] 웹 라이브(f62e122a) — 새 코드·안내서 UTF-8·SDK 3.9.0 핀 확인
- [x] 운영 DB zone SQL: 전 road/road/sea_gate → 후 auction/sea_gate/road
- [x] Play 127(1.4.15) internal·alpha·production
- [x] iOS 1.0.27 빌드 54 재제출 WAITING_FOR_REVIEW (수동 출시) — 영상 첨부(사용자 업로드)·심사 메모·출시 노트 갱신
- [x] 토스: SDK 3.0.x 거부 → 3.9.0 로 올려 -207 CREATED·테스트푸시
- [ ] 토스 -207 실기기 확인 → 검수 제출 → 승인 후 콘솔 출시하기(사용자)
- [ ] itch.zip 업로드(사용자) · iOS 승인 후 출시(사용자) · 토스 광고 그룹 ID 재확인(01:40 이후)

## 재배포 (11/12 01:45~02:05) — 입장 끊김·섬 바구니
- [x] 입장 끊김: 저장 물체 셰이더 + 첫 미니맵 촬영(지도 카메라 전용 셰이더 27개)을 가림막 뒤에서 처리 → 화면 보인 뒤 긴 작업 ~300ms → 0
- [x] 섬 바구니: 폰에서 행동 버튼(104px)과 겹침 → 왼쪽 붙임·칸 크기 자동(390px 폰 29px)
- [x] 웹 라이브 0fa397ed · 푸시 main be530bf9 · capacitor 28a0d322 · ios 322cda72
- [x] Play 129(1.4.17) 3트랙 · iOS 1.0.27 빌드 56 WAITING_FOR_REVIEW(메모 build 56, 영상 첨부 유지) · itch.zip
- [x] 토스: -208 승인(출시 안 함) → -209 검수 제출 REVIEWING. 승인되면 콘솔에서 -209 출시하기(사용자)
- [x] 토스 광고 그룹 ENABLED·ID 일치(01:47)
- [x] 공지 id 173 등록(토스 -209 라이브 02:56 확인 뒤, 전체 대상·ko/en)
- [x] itch.zip 업로드 완료(사용자, 11/12)
- [x] iOS 1.0.27 빌드 56 READY_FOR_SALE(라이브 확인)
