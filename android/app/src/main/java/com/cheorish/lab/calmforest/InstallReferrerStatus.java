package com.cheorish.lab.calmforest;

import com.android.installreferrer.api.InstallReferrerClient.InstallReferrerResponse;

/**
 * 📲 InstallReferrerClient 응답 코드 → JS 상태 문자열(js/install-referrer.js attributionFromNative 가 읽는다).
 *  ok          : 읽음 — 확정(다시 읽지 않는다)
 *  unsupported : FEATURE_NOT_SUPPORTED(Play 스토어 없는 기기) — 확정, 'unknown' 으로 기록
 *  unavailable : SERVICE_UNAVAILABLE·연결 끊김 — 일시 장애, 다음 실행에서 다시
 *  error       : DEVELOPER_ERROR 등 — 다음 실행에서 다시
 * 안드로이드 프레임워크 의존이 없어 JVM 단위 테스트로 돈다(InstallReferrerStatusTest).
 */
final class InstallReferrerStatus {
    static final String OK = "ok";
    static final String UNSUPPORTED = "unsupported";
    static final String UNAVAILABLE = "unavailable";
    static final String ERROR = "error";

    private InstallReferrerStatus() {}

    static String fromResponseCode(int code) {
        switch (code) {
            case InstallReferrerResponse.OK: return OK;
            case InstallReferrerResponse.FEATURE_NOT_SUPPORTED: return UNSUPPORTED;
            case InstallReferrerResponse.SERVICE_UNAVAILABLE:
            case InstallReferrerResponse.SERVICE_DISCONNECTED: return UNAVAILABLE;
            default: return ERROR;
        }
    }

    /** 이 상태로 끝나면 다시 읽지 않는다(‘읽음’ 플래그를 세운다) */
    static boolean isFinal(String status) {
        return OK.equals(status) || UNSUPPORTED.equals(status);
    }
}
