package com.cheorish.lab.calmforest;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 📲 Google Play Install Referrer — 설치 링크의 referrer(utm_*) 원문을 한 번 돌려준다.
 * JS 쪽은 js/install-referrer-boot.js (capPlugin('InstallReferrer').get()), 파싱은 js/install-referrer.js.
 *
 *  get → { status, referrer, clickTs, installTs, firstInstallMs, cached }
 *    · firstInstallMs(PackageInfo.firstInstallTime) — JS 가 이 기능 전 기존 설치를 'preexisting' 으로 가른다.
 *    · 한 번 확정(ok·unsupported)되면 SharedPreferences 에 '읽음' 플래그와 값을 남기고, 이후엔 Play 서비스를 다시 부르지 않는다.
 *    · SERVICE_UNAVAILABLE·끊김·오류는 플래그를 세우지 않는다 → 다음 실행에서 다시 시도. reject 하지 않고 status 로 답한다.
 *  🧪 디버그 빌드만: adb shell am start -n com.cheorish.lab.calmforest/.MainActivity --es cf_test_referrer "utm_source=…"
 *    → 그 값을 그대로 돌려준다(저장 안 함). 릴리스 빌드는 이 extra 를 무시한다.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {
    private static final String PREFS = "cf_install_referrer";
    private static final String TEST_EXTRA = "cf_test_referrer";

    @PluginMethod
    public void get(PluginCall call) {
        Context ctx = getContext();
        String test = debugTestReferrer(ctx);
        if (test != null) { call.resolve(result(InstallReferrerStatus.OK, test, 0, 0, 0, false)); return; }

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (prefs.getBoolean("done", false)) {
            call.resolve(result(prefs.getString("status", InstallReferrerStatus.OK), prefs.getString("referrer", ""),
                    prefs.getLong("clickTs", 0), prefs.getLong("installTs", 0), firstInstallMs(ctx), true));
            return;
        }

        InstallReferrerClient client = InstallReferrerClient.newBuilder(ctx).build();
        AtomicBoolean answered = new AtomicBoolean(false);
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (answered.getAndSet(true)) return;
                    String status = InstallReferrerStatus.fromResponseCode(responseCode);
                    String referrer = "";
                    long clickTs = 0, installTs = 0;
                    if (InstallReferrerStatus.OK.equals(status)) {
                        try {
                            ReferrerDetails d = client.getInstallReferrer();
                            referrer = d.getInstallReferrer() == null ? "" : d.getInstallReferrer();
                            clickTs = d.getReferrerClickTimestampSeconds();
                            installTs = d.getInstallBeginTimestampSeconds();
                        } catch (Exception e) {
                            status = InstallReferrerStatus.ERROR;   // RemoteException 등 — 다음 실행에서 다시
                        }
                    }
                    if (InstallReferrerStatus.isFinal(status)) {
                        prefs.edit().putBoolean("done", true).putString("status", status).putString("referrer", referrer)
                                .putLong("clickTs", clickTs).putLong("installTs", installTs).apply();
                    }
                    endQuietly(client);
                    call.resolve(result(status, referrer, clickTs, installTs, firstInstallMs(ctx), false));
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (answered.getAndSet(true)) return;   // 이미 답했으면 무시(재연결은 다음 실행)
                    endQuietly(client);
                    call.resolve(result(InstallReferrerStatus.UNAVAILABLE, "", 0, 0, 0, false));
                }
            });
        } catch (Exception e) {
            if (!answered.getAndSet(true)) call.resolve(result(InstallReferrerStatus.ERROR, "", 0, 0, 0, false));
        }
    }

    private String debugTestReferrer(Context ctx) {
        if ((ctx.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) return null;
        Intent intent = getActivity() == null ? null : getActivity().getIntent();
        return intent == null ? null : intent.getStringExtra(TEST_EXTRA);
    }

    private static long firstInstallMs(Context ctx) {
        try {
            return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).firstInstallTime;
        } catch (Exception e) {
            return 0;   // 모름 — JS 는 referrer 그대로 쓴다
        }
    }

    private static void endQuietly(InstallReferrerClient client) {
        try { client.endConnection(); } catch (Exception ignored) { }
    }

    private static JSObject result(String status, String referrer, long clickTs, long installTs, long firstInstallMs, boolean cached) {
        JSObject o = new JSObject();
        o.put("status", status);
        o.put("referrer", referrer);
        o.put("clickTs", clickTs);
        o.put("installTs", installTs);
        o.put("firstInstallMs", firstInstallMs);
        o.put("cached", cached);
        return o;
    }
}
