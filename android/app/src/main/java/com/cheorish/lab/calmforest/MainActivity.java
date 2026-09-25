package com.cheorish.lab.calmforest;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.games.PlayGamesSdk;

public class MainActivity extends BridgeActivity {
    /** Play Games SDK 를 초기화했는지 — 프로젝트 ID 가 비어 있으면 false(PlayGamesPlugin 이 미인증으로 답한다). */
    static boolean pgsReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayGamesPlugin.class);   // 📱 로컬 플러그인은 super.onCreate 전에 등록해야 브리지에 붙는다
        super.onCreate(savedInstanceState);
        // 🔠 시스템 글꼴 크기가 커도 게임 글자는 100% — WebView 는 기본으로 시스템 배율을 곱해 HUD 가 깨진다(2026-09-25 실기기)
        getBridge().getWebView().getSettings().setTextZoom(100);
        if (!getString(R.string.game_services_project_id).isEmpty()) {
            PlayGamesSdk.initialize(this);        // 앱 시작 시 자동 로그인 시도 — 결과는 isAuthenticated 로 읽는다
            pgsReady = true;
        }
    }
}
