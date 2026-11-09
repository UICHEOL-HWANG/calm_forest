# 컨텍스트

Last Updated: 2026-11-09

- 공용 조형 도구: js/dream/house-kit.js (rbox=둥근 상자, arch, revolve, flaredRoof). three/addons 를 쓰지 않는다(벤더링 대상 아님).
- 거울 집: js/mirror/house.js buildMirrorHouse(solid, glow, i, PAL3) — js/mirror/art.js HOUSES.forEach 에서 호출. 충돌 상자(layout.js houseBox)·HOUSES 좌표는 그대로.
- 꿈 탑집: js/dream/cottage.js buildMoonTower — buildDreamWorld 에서 COTTAGE 위치(0,-4.8)에 놓는다. 충돌 js/dream/layout.js COTTAGE r=2.0, clampWalkable 이 남쪽으로 밀어낸다.
- 버섯 등 (-1.2,-5.4) 은 탑과 겹쳐 (-3.4,-5.0) 으로 옮김.
- 드로우콜: 전부 기존 solid/glow bake 에 합쳐져 증가 없음(메시 수 동일).
- 🚨 LatheGeometry 는 점이 아래→위 순서여야 바깥면이 앞면(실측 out16/inn0). house-kit revolve 가 위→아래 프로필을 뒤집어 쓴다. 원뿔 실루엣은 안팎이 같아 렌더만 봐선 못 알아본다.
- 배포는 아직 안 함. 거울·꿈은 🚨5곳 동시 배포 규칙 대상.
