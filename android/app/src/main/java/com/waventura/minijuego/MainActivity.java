package com.waventura.minijuego;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        enableImmersiveMode();

        // Prefer Google TTS engine if installed on the Android tablet for natural voices
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = tts.setLanguage(new Locale("es", "MX"));
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    res = tts.setLanguage(new Locale("es", "US"));
                }
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("es", "419"));
                }
                selectBestLatamSpanishVoice();
                // Natural pitch (1.0) avoids robotic pitch-shift distortion!
                tts.setSpeechRate(0.95f);
                tts.setPitch(1.0f);
                ttsReady = true;
            }
        }, "com.google.android.tts");

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        }
    }

    private void selectBestLatamSpanishVoice() {
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices == null || voices.isEmpty()) return;

            Voice bestVoice = null;
            int bestScore = -1;

            for (Voice v : voices) {
                if (v == null || v.getLocale() == null) continue;
                if (!"es".equalsIgnoreCase(v.getLocale().getLanguage())) continue;
                // Keep offline-capable voices so it always works without Wi-Fi
                if (v.isNetworkConnectionRequired()) continue;

                int score = v.getQuality(); // 100..500 (higher = more natural)
                String country = v.getLocale().getCountry();
                if ("MX".equalsIgnoreCase(country)) score += 120;
                else if ("US".equalsIgnoreCase(country)) score += 110; // Google Latin American Spanish
                else if ("419".equalsIgnoreCase(country) || "CO".equalsIgnoreCase(country) || "AR".equalsIgnoreCase(country)) score += 100;
                else if ("ES".equalsIgnoreCase(country)) score += 10;

                String name = v.getName() != null ? v.getName().toLowerCase() : "";
                // Google Latin American neural/local voice identifiers
                if (name.contains("es-us") || name.contains("es-mx") || name.contains("esu") || name.contains("esm")) {
                    score += 50;
                }
                if (name.contains("local")) {
                    score += 20;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestVoice = v;
                }
            }

            if (bestVoice != null) {
                tts.setVoice(bestVoice);
            }
        } catch (Exception ignored) {
            // Keep default Latin American Spanish locale if enumeration fails
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    private void enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }

    private class TtsBridge {
        @JavascriptInterface
        public void speak(String text) {
            if (tts != null && ttsReady && text != null && !text.isEmpty()) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "minijuego_tts");
            }
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null && ttsReady) {
                tts.stop();
            }
        }
    }
}
