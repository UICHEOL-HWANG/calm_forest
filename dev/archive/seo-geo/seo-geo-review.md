# 검수안 (2026-10-18)

## ① 홈 제목 (title)
- A `고요한 숲 · 설치 없이 하는 3D 힐링 농장 게임`  ← 추천
- B `고요한 숲 · 브라우저에서 바로 하는 힐링 농사 게임`
- C `고요한 숲 · 농사·낚시·집 꾸미기 3D 힐링 게임`
- og:title·twitter:title 은 `고요한 숲 🌿` 유지(카톡 미리보기 캐시 그대로) ← 추천

## ② 홈 설명 (엠대시 제거)
`포근한 로우폴리 3D 힐링 마을 게임이에요. 걷고, 농사짓고, 낚시하고, 집을 짓고 꾸며요. 설치 없이 브라우저에서 바로, 안드로이드·iOS 앱으로도 할 수 있어요.`

## ③ llms.txt (분류·문서 수는 빌드가 자동으로 채움)
```
# 고요한 숲 (calm forest)

> 고요한 숲은 브라우저·안드로이드·iOS에서 무료로 하는 로우폴리 3D 힐링 마을 게임입니다. 이 사이트가 공식 사이트이고, 고요위키의 수치(판매가·계절·성장 단계·재료)는 게임 데이터에서 빌드할 때 그대로 뽑은 원본입니다.

## 핵심 페이지
- [게임 시작](https://calmforest.cloud/): 설치 없이 브라우저에서 바로 플레이
- [초보자 안내서](https://calmforest.cloud/guide/): 처음 30분 플레이 순서
- [Beginner's Guide](https://calmforest.cloud/guide/en/): 영어 안내서
- [고요위키](https://calmforest.cloud/wiki/): 공식 도감 80개 문서
  - [물고기](https://calmforest.cloud/wiki/fish/): 11개 문서
  - … (13개 분류)
- [소식](https://calmforest.cloud/news/): 업데이트와 공지
- [가격 안내](https://calmforest.cloud/shop): 현금 꾸미기 아이템, 게임 진행에 유리한 효과 없음

## 앱
- Google Play · App Store · itch.io (링크)

## 데이터 정책
- 출처: 게임 데이터에서 직접 생성, 게임 업데이트와 같은 날 갱신
- 기준일: (빌드 날짜)
- 인용 표기: 고요한 숲 공식 위키 (calmforest.cloud)
```

## ④ sameAs (공식 채널 연결)
Google Play · App Store(id6821420691) · itch.io(cheorish.itch.io/calmforest) · Threads·Instagram(@calm.forest.official) · 리틀리(litt.ly/calmforest) · GitHub 저장소(넣을지 결정)

## ⑤ 위키 FAQ (infobox 수치에서 자동 생성, 화면 하단 "자주 묻는 질문" + FAQPage LD)
동글 복어
- 동글 복어는 어디서 낚여요? → 마을 낚시터에서 여름에만 낚여요.
- 동글 복어는 얼마에 팔려요? → 8코인에 팔 수 있어요.
- 동글 복어는 박물관 어디에 전시돼요? → 1층에 전시돼요.
요리(예) : ○○은 무엇으로 만들어요? → 재료 …로 만들어요. / 효과가 뭐예요? → (효과 문구)
고급 작물 : 씨앗은 얼마예요? / 물은 몇 번 줘야 해요? / 얼마에 팔려요?
텃밭 방문객 : 어떻게 오게 해요? → 텃밭에 (환경)을 갖추면 (때)에 찾아와요.
주민 : 어떤 의뢰를 줘요? → (의뢰 목록)
수치가 없는 항목은 질문을 만들지 않음.

## ⑥ 소식 페이지 디자인: mockups/news-board.png (A 위키 톤 추천)

## ⑦ AI 학습봇(GPTBot·ClaudeBot) 403
- 허용(추천: 모델이 게임을 알게 됨, 콘텐츠가 공개 위키라 잃을 것 적음) / 차단 유지
- Cloudflare 로그인 후 Aside 로 변경
