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

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = tts.setLanguage(new Locale("es", "MX"));
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    res = tts.setLanguage(new Locale("es", "US"));
                }
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("es", "ES"));
                }
                selectBestSpanishVoice();
                // Warm, lively, natural intonation for kids
                tts.setSpeechRate(1.03f);
                tts.setPitch(1.18f);
                ttsReady = true;
            }
        });

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        }
    }

    private void selectBestSpanishVoice() {
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices == null || voices.isEmpty()) return;

            Voice bestVoice = null;
            int bestScore = -1;

            for (Voice v : voices) {
                if (v == null || v.getLocale() == null) continue;
                if (!"es".equalsIgnoreCase(v.getLocale().getLanguage())) continue;
                if (v.isNetworkConnectionRequired()) continue;

                int score = v.getQuality(); // 100..500 (higher = more natural/neural)
                String country = v.getLocale().getCountry();
                if ("MX".equalsIgnoreCase(country)) score += 60;
                else if ("US".equalsIgnoreCase(country)) score += 45;
                else if ("ES".equalsIgnoreCase(country)) score += 20;

                // Prefer natural Google neural/local voices when present
                String name = v.getName() != null ? v.getName().toLowerCase() : "";
                if (name.contains("local") || name.contains("esm") || name.contains("esu")) {
                    score += 15;
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
            // Keep default Spanish voice if voice enumeration is unavailable
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
