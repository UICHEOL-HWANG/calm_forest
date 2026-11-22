# 11/23 배포 계획

사용자: "여태 커밋분이랑 병합 모두 하고 QA 진행한 다음에 배포 진행해보자"

1. 병합: 미병합 브랜치 점검 → 새로 넣을 것 없음(port-boat-choice 는 main 에 같은 커밋, weekly-market 은 스쿼시 병합됨, worldtree-reel·meta-pixel 은 10/28 wip 보존 커밋, capacitor·ios 는 앱 빌드 브랜치)
2. QA: 전체 테스트, 웹·토스·itch 빌드 산출물 확인, 실제 게임 스모크(PC·세로·가로), 다른 세션 기능(식당·반딧불이 계곡·광산 승강기·세계수·Tenjin) 점검
3. 푸시 전 키 스캔
4. 배포 5곳: 웹(wrangler) → 토스(bundle_upload memo) → Play(internal + alpha·production 한 edit) → iOS(새 빌드 제출) → itch zip
5. 사람 몫: 토스 콘솔 출시, itch 업로드, 공지
