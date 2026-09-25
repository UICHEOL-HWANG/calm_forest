package com.cheorish.lab.calmforest;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * 📱 사진 저장·공유 — WebView 는 <a download> 를 무시하고 navigator.share 도 없어서(2026-09-25 실기기) 네이티브로 한다.
 * JS 쪽은 js/photo-native.js (capPlugin('Photo')).
 *  save      : 갤러리 Pictures/calmforest 에 저장(Android 10+ MediaStore, 권한 불필요). 9 이하는 "legacy" 로 거절 → JS 가 공유로 안내.
 *  share     : 캐시에 임시 파일 → FileProvider(${applicationId}.fileprovider, cache-path) → 공유 시트
 *  shareText : 링크 공유
 */
@CapacitorPlugin(name = "Photo")
public class PhotoPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String base64 = call.getString("base64");
        String mime = call.getString("mime", "image/png");
        String fileName = call.getString("fileName", "calmforest.png");
        if (base64 == null || base64.isEmpty()) { call.reject("base64 가 필요합니다"); return; }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { call.reject("legacy"); return; }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Images.Media.MIME_TYPE, mime);
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/calmforest");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) { call.reject("갤러리 항목을 만들지 못했어요"); return; }
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new Exception("출력 스트림 없음");
                out.write(bytes);
            }
            values.clear();
            values.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            call.resolve(new JSObject().put("saved", true));
        } catch (Exception e) {
            call.reject("저장 실패: " + e.getMessage());
        }
    }

    @PluginMethod
    public void share(PluginCall call) {
        String base64 = call.getString("base64");
        String mime = call.getString("mime", "image/png");
        String text = call.getString("text", "");
        if (base64 == null || base64.isEmpty()) { call.reject("base64 가 필요합니다"); return; }
        try {
            File dir = new File(getContext().getCacheDir(), "share");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("캐시 폴더 생성 실패");
            File file = new File(dir, "calmforest." + (mime.endsWith("jpeg") ? "jpg" : "png"));
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(Base64.decode(base64, Base64.DEFAULT)); }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, null);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve(new JSObject().put("shared", true));
        } catch (Exception e) {
            call.reject("공유 실패: " + e.getMessage());
        }
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) { call.reject("text 가 필요합니다"); return; }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, text);
        String title = call.getString("title");
        if (title != null) send.putExtra(Intent.EXTRA_SUBJECT, title);
        Intent chooser = Intent.createChooser(send, null);
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(chooser);
        call.resolve(new JSObject().put("shared", true));
    }
}
