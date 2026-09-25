package com.cheorish.lab.calmforest;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.games.PlayGamesSdk;

public class MainActivity extends BridgeActivity {
    /** Play Games SDK 를 초기화했는지 — 프로젝트 ID 가 비어 있으면 false(PlayGamesPlugin 이 미인증으로 답한다). */
    static boolean pgsReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 📱 로컬 플러그인은 super.onCreate 전에 등록해야 브리지에 붙는다
        registerPlugin(PlayGamesPlugin.class);
        registerPlugin(PhotoPlugin.class);       // 📷 사진 저장·공유(WebView 는 download·share 를 못 한다)
        super.onCreate(savedInstanceState);
        // 🔠 시스템 글꼴 크기가 커도 게임 글자는 100% — WebView 는 기본으로 시스템 배율을 곱해 HUD 가 깨진다(2026-09-25 실기기)
        getBridge().getWebView().getSettings().setTextZoom(100);
        if (!getString(R.string.game_services_project_id).isEmpty()) {
            PlayGamesSdk.initialize(this);        // 앱 시작 시 자동 로그인 시도 — 결과는 isAuthenticated 로 읽는다
            pgsReady = true;
        }
    }

    // 🔇 Capacitor 는 앱이 백그라운드로 가도 WebView 를 멈추지 않는다 → 페이지가 visibilitychange 를 못 받아
    //    홈으로 나가도 BGM 이 계속 흘렀다(2026-09-25 실기기). WebView 에 생명주기를 그대로 전달한다.
    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null) getBridge().getWebView().onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null) getBridge().getWebView().onResume();
    }
}
