# 로그인 화면 QR

PC 로그인 화면 옆 QR 카드(`#login-qr`)에 쓴다. 스토어 유입은 `login_qr` 로 귀속된다.

| 파일 | 주소 |
|---|---|
| login-app-store.svg | https://apps.apple.com/app/id6821420691?pt=129595134&ct=login_qr_web&mt=8 |
| login-google-play.svg | https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest&referrer=utm_source%3Dweb%26utm_medium%3Dlogin_qr |

다시 만들기 (qrcode@1.5.4):

```bash
npx -y qrcode@1.5.4 -t svg -e M -m 1 -o assets/qr/login-app-store.svg "<App Store 주소>"
npx -y qrcode@1.5.4 -t svg -e M -m 1 -o assets/qr/login-google-play.svg "<Google Play 주소>"
```
