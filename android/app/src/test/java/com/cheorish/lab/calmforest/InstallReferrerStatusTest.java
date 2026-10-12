package com.cheorish.lab.calmforest;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.android.installreferrer.api.InstallReferrerClient.InstallReferrerResponse;

import org.junit.Test;

public class InstallReferrerStatusTest {
    @Test
    public void mapsResponseCodes() {
        assertEquals("ok", InstallReferrerStatus.fromResponseCode(InstallReferrerResponse.OK));
        assertEquals("unsupported", InstallReferrerStatus.fromResponseCode(InstallReferrerResponse.FEATURE_NOT_SUPPORTED));
        assertEquals("unavailable", InstallReferrerStatus.fromResponseCode(InstallReferrerResponse.SERVICE_UNAVAILABLE));
        assertEquals("unavailable", InstallReferrerStatus.fromResponseCode(InstallReferrerResponse.SERVICE_DISCONNECTED));
        assertEquals("error", InstallReferrerStatus.fromResponseCode(InstallReferrerResponse.DEVELOPER_ERROR));
        assertEquals("error", InstallReferrerStatus.fromResponseCode(999));
    }

    @Test
    public void onlyOkAndUnsupportedAreFinal() {
        assertTrue(InstallReferrerStatus.isFinal("ok"));
        assertTrue(InstallReferrerStatus.isFinal("unsupported"));
        assertFalse(InstallReferrerStatus.isFinal("unavailable"));
        assertFalse(InstallReferrerStatus.isFinal("error"));
    }
}
