package com.andrianchun.logym

import android.content.Intent
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WorkoutTimer")
class WorkoutTimerPlugin : Plugin() {

    @PluginMethod
    fun startTimer(call: PluginCall) {
        val startTime = call.getLong("startTime", System.currentTimeMillis()) ?: System.currentTimeMillis()
        val workoutName = call.getString("workoutName", "Sesi Latihan Aktif")
        val exerciseName = call.getString("exerciseName", "")
        val isResting = call.getBoolean("isResting", false) ?: false
        val targetTime = call.getLong("targetTime", 0L) ?: 0L
        
        val intent = Intent(context, WorkoutTimerService::class.java).apply {
            action = "START"
            putExtra("startTime", startTime)
            putExtra("workoutName", workoutName)
            putExtra("exerciseName", exerciseName)
            putExtra("calories", calories)
            putExtra("isResting", isResting)
            putExtra("targetTime", targetTime)
        }
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to start timer service", e)
        }
    }

    @PluginMethod
    fun stopTimer(call: PluginCall) {
        val intent = Intent(context, WorkoutTimerService::class.java).apply {
            action = "STOP"
        }
        try {
            context.startService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        call.resolve()
    }

    @PluginMethod
    fun updateTimer(call: PluginCall) {
        val intent = Intent(context, WorkoutTimerService::class.java).apply {
            action = "UPDATE"
            if (call.hasOption("isResting")) putExtra("isResting", call.getBoolean("isResting", false) ?: false)
            if (call.hasOption("targetTime")) putExtra("targetTime", call.getLong("targetTime", 0L) ?: 0L)
            if (call.hasOption("workoutName")) putExtra("workoutName", call.getString("workoutName"))
            if (call.hasOption("exerciseName")) putExtra("exerciseName", call.getString("exerciseName"))
            if (call.hasOption("calories")) putExtra("calories", call.getString("calories"))
        }
        try {
            context.startService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        call.resolve()
    }

    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(context)) {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + context.packageName)
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                call.resolve(com.getcapacitor.JSObject().put("granted", false))
                return
            }
        }
        call.resolve(com.getcapacitor.JSObject().put("granted", true))
    }

    @PluginMethod
    fun setAppState(call: PluginCall) {
        val isActive = call.getBoolean("isActive", true) ?: true
        val intent = Intent(context, WorkoutTimerService::class.java).apply {
            action = "APP_STATE_CHANGE"
            putExtra("isActive", isActive)
        }
        try {
            context.startService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        call.resolve()
    }
}
