package com.andrianchun.logym;

import android.os.Bundle;
import android.view.Window;
import android.graphics.Color;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin lokal: menulis sesi latihan ke Health Connect. @capgo/capacitor-health cuma
        // bisa MEMBACA sesi latihan, jadi tanpa ini latihan Logym tidak pernah muncul sebagai
        // "Workout" di aplikasi lain. Harus didaftarkan SEBELUM super.onCreate().
        registerPlugin(ExerciseWriterPlugin.class);
        registerPlugin(WorkoutTimerPlugin.class);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
    }
}
