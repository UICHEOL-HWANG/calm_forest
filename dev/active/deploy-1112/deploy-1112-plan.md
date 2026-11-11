# 11/11 병합본 배포 (2026-11-12)

사용자: "배포 준비 시작". 준비(빌드·점검·초안)까지 하고, 푸시·업로드·운영 DB·심사 제출은 사용자 확인 뒤.

대상 5곳 동시: 웹(wrangler) · 토스(bundle_upload memo) · itch(dist-itch.zip, 사용자 업로드) · 안드로이드(internal → alpha+production 한 edit) · iOS(build:cap:ios → 아카이브 → 심사)
배포일 운영 DB: sql/migrations/migrate_zone_paths.sql (pg8000 풀러, begin/commit) + 세 지점 확인 (10.5,-15)=auction (19.5,-12.5)=sea_gate (14.5,-12.5)=road
푸시: main + feat/capacitor-app (+ iOS 를 feat/ios-app 에서 올리면 그 브랜치도)
