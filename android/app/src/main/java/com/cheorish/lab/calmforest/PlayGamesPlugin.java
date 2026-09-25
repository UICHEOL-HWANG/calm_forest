package com.cheorish.lab.calmforest;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;

/**
 * 📱 Play Games Services v2 — 자동 로그인 확인 · 수동 재시도 · 서버용 authCode.
 * JS 쪽은 js/pgs-native.js (window.Capacitor.Plugins.PlayGames), 서버 교환은 pgs-auth Worker.
 * 서드파티 포크 대신 직접 둔다 — 쓰는 API 가 셋뿐이다.
 *
 * ⚠️ games-ids.xml 의 프로젝트 ID 가 비어 있으면 SDK 를 초기화하지 않는다(MainActivity) →
 *    여기서도 SDK 를 건드리지 않고 "미인증"으로 답해 앱이 게스트 폴백으로 간다(크래시 방지).
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private GamesSignInClient client() {
        return MainActivity.pgsReady ? PlayGames.getGamesSignInClient(getActivity()) : null;
    }

    private void resolveAuthenticated(PluginCall call, boolean ok) {
        JSObject ret = new JSObject();
        ret.put("authenticated", ok);
        call.resolve(ret);
    }

    /** 앱 시작 때 SDK 가 이미 시도한 자동 로그인 결과 — 창을 띄우지 않는다. */
    @PluginMethod
    public void isAuthenticated(PluginCall call) {
        GamesSignInClient c = client();
        if (c == null) { resolveAuthenticated(call, false); return; }
        c.isAuthenticated().addOnCompleteListener(task ->
            resolveAuthenticated(call, task.isSuccessful() && task.getResult().isAuthenticated()));
    }

    /** '바로 플레이하기' 버튼 — 플레이 게임즈 로그인 창을 한 번 띄운다. */
    @PluginMethod
    public void signIn(PluginCall call) {
        GamesSignInClient c = client();
        if (c == null) { resolveAuthenticated(call, false); return; }
        c.signIn().addOnCompleteListener(task ->
            resolveAuthenticated(call, task.isSuccessful() && task.getResult().isAuthenticated()));
    }

    /** 1회용 서버 authCode — serverClientId 는 '게임 서버(웹)' OAuth 클라이언트. 추가 scope 없음 → 동의 화면 없음. */
    @PluginMethod
    public void requestServerSideAccess(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.isEmpty()) { call.reject("serverClientId 가 필요합니다"); return; }
        GamesSignInClient c = client();
        if (c == null) { call.reject("Play Games 미초기화 — games-ids.xml 프로젝트 ID 확인"); return; }
        c.requestServerSideAccess(serverClientId, false).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                Exception e = task.getException();
                call.reject("authCode 요청 실패: " + (e != null ? e.getMessage() : "empty"));
                return;
            }
            JSObject ret = new JSObject();
            ret.put("authCode", task.getResult());
            call.resolve(ret);
        });
    }
}
