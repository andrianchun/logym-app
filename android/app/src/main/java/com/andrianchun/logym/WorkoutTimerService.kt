package com.andrianchun.logym

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class WorkoutTimerService : Service() {

    private var currentStartTime: Long = 0
    private var currentWorkoutName: String = "Sesi Latihan Aktif"
    private var currentExerciseName: String = ""
    private var currentCalories: String = "0"
    
    private var isResting: Boolean = false
    private var restTargetTime: Long = 0L
    private var previousRestLeft: Long = 1L
    
    private var isAppActive: Boolean = true
    private var windowManager: android.view.WindowManager? = null
    private var floatingView: android.view.View? = null
    private var tvWorkoutTime: android.widget.TextView? = null
    private var tvRestTime: android.widget.TextView? = null
    private var restContainer: android.view.View? = null

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    private var tickerJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "STOP") {
            tickerJob?.cancel()
            stopForeground(true)
            stopSelf()
            return START_NOT_STICKY
        }

        if (action == "START") {
            currentStartTime = intent.getLongExtra("startTime", System.currentTimeMillis())
            currentWorkoutName = intent.getStringExtra("workoutName") ?: "Sesi Latihan Aktif"
            currentExerciseName = intent.getStringExtra("exerciseName") ?: ""
            currentCalories = intent.getStringExtra("calories") ?: "0"
            isResting = false
            restTargetTime = 0L
            previousRestLeft = 1L
            
            startForeground(9999, buildNotification())
            startTicker()
        } else if (action == "UPDATE") {
            if (intent.hasExtra("isResting")) isResting = intent.getBooleanExtra("isResting", false)
            if (intent.hasExtra("targetTime")) {
                restTargetTime = intent.getLongExtra("targetTime", 0L)
                if (isResting) {
                    previousRestLeft = kotlin.math.ceil((restTargetTime - System.currentTimeMillis()) / 1000.0).toLong()
                }
            }
            
            intent.getStringExtra("workoutName")?.let { currentWorkoutName = it }
            intent.getStringExtra("exerciseName")?.let { currentExerciseName = it }
            intent.getStringExtra("calories")?.let { currentCalories = it }
            
            updateNotification()
            updateFloatingWidgetData()
        } else if (action == "APP_STATE_CHANGE") {
            isAppActive = intent.getBooleanExtra("isActive", true)
            updateFloatingWidgetVisibility()
        }

        return START_STICKY
    }

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = serviceScope.launch {
            while (isActive) {
                updateNotification()
                updateFloatingWidgetData()
                delay(1000)
            }
        }
    }

    private fun updateNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(9999, buildNotification())
    }

    private fun formatTime(totalSeconds: Long): String {
        val isNegative = totalSeconds < 0
        val absSeconds = Math.abs(totalSeconds)
        val hrs = absSeconds / 3600
        val m = ((absSeconds % 3600) / 60).toString().padStart(2, '0')
        val s = (absSeconds % 60).toString().padStart(2, '0')
        val prefix = if (isNegative) "-" else ""
        return if (hrs > 0) "$prefix$hrs:$m:$s" else "$prefix$m:$s"
    }

    private fun buildNotification(): android.app.Notification {
        createNotificationChannel()

        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val elapsedSec = (System.currentTimeMillis() - currentStartTime) / 1000
        val durationStr = formatTime(elapsedSec)

        val builder = NotificationCompat.Builder(this, "logym_workout_channel_v2")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setColor(android.graphics.Color.parseColor("#3B82F6"))
            .setColorized(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            // Ikon status bar WAJIB monokrom: Android membuang warnanya dan menyisakan siluet.
            // ic_launcher adaptif penuh warna jadi gumpalan putih; ic_stat_logym sudah 24dp putih.
            .setSmallIcon(R.drawable.ic_stat_logym)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)

        val numbersStr = "$durationStr • $currentCalories kcal"

        val title: CharSequence = if (isResting) {
            val restLeft = kotlin.math.ceil((restTargetTime - System.currentTimeMillis()) / 1000.0).toLong()
            val timeStr = formatTime(restLeft)
            
            if (previousRestLeft > 0 && restLeft <= 0) {
                try {
                    // Nada yang SAMA PERSIS dengan yang dibunyikan aplikasi (public/timer-end.wav
                    // dan res/raw/timer_end.wav dibuat dari satu sumber, scripts/generate-timer-sound.cjs).
                    // Dulu di sini memakai nada alarm bawaan HP, di-loop, DAN memaksa volume alarm
                    // ke maksimum lalu mengembalikannya — mengubah setelan volume punya user, dan
                    // membuat timer terdengar sangat berbeda di dalam vs di luar aplikasi.
                    // Sekarang berbunyi sekali di volume yang user pilih sendiri.
                    val mediaPlayer = android.media.MediaPlayer.create(applicationContext, R.raw.timer_end)
                    mediaPlayer.setAudioAttributes(
                        android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    mediaPlayer.setOnCompletionListener { it.release() }
                    mediaPlayer.start()


                    val v = getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
                    // Polanya mengikuti nada: dua ketuk pendek lalu satu getar panjang. Dulu 5,6
                    // detik bergetar untuk bunyi yang sudah lama selesai.
                    val pattern = longArrayOf(0, 150, 90, 150, 90, 520)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(android.os.VibrationEffect.createWaveform(pattern, -1))
                    } else {
                        v.vibrate(pattern, -1)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            previousRestLeft = restLeft
            
            // Dynamic Icon
            val shortTimeText = if (restLeft > 60) {
                "${restLeft / 60}m"
            } else if (restLeft >= 0) {
                "${restLeft}s"
            } else {
                "0s"
            }
            
            if (restLeft < 0) {
                androidx.core.text.HtmlCompat.fromHtml("Istirahat: <font color=\"#F43F5E\">$timeStr</font> • $numbersStr", androidx.core.text.HtmlCompat.FROM_HTML_MODE_LEGACY)
            } else {
                "Istirahat: $timeStr • $numbersStr"
            }
        } else {
            "$currentWorkoutName • $numbersStr"
        }

        builder.setContentTitle(title)

        if (currentExerciseName.isNotEmpty()) {
            builder.setContentText(currentExerciseName)
        } else {
            builder.setContentText(currentWorkoutName)
        }

        return builder.build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "logym_workout_channel_v2",
                "Workout Timer",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "Tampilan timer saat sesi latihan berjalan"
            channel.setSound(null, null)
            channel.enableVibration(false)
            channel.lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createDynamicIcon(text: String): androidx.core.graphics.drawable.IconCompat {
        val width = 256
        val height = 128
        val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bitmap)
        
        // Draw the app icon (ic_launcher) on the left side
        val drawable = androidx.core.content.ContextCompat.getDrawable(this, R.mipmap.ic_launcher)
        if (drawable != null) {
            drawable.setBounds(8, 16, 104, 112) // Slightly padded 96x96 box on the left
            drawable.draw(canvas)
        }
        
        // Draw the text on the right side
        val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textSize = 72f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            textAlign = android.graphics.Paint.Align.LEFT
        }
        
        val textBounds = android.graphics.Rect()
        paint.getTextBounds(text, 0, text.length, textBounds)
        // Scale text if it exceeds remaining width (256 - 112 - padding = ~130)
        if (textBounds.width() > 130) {
            paint.textSize = paint.textSize * 130f / textBounds.width()
        }
        
        val yPos = ((canvas.height / 2) - ((paint.descent() + paint.ascent()) / 2))
        canvas.drawText(text, 112f, yPos, paint)
        
        return androidx.core.graphics.drawable.IconCompat.createWithBitmap(bitmap)
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        if (floatingView != null) {
            windowManager?.removeView(floatingView)
            floatingView = null
        }
    }

    private fun initFloatingWidget() {
        if (!android.provider.Settings.canDrawOverlays(this)) return
        if (floatingView != null) return

        windowManager = getSystemService(WINDOW_SERVICE) as android.view.WindowManager
        floatingView = android.view.LayoutInflater.from(this).inflate(R.layout.floating_timer, null)
        
        tvWorkoutTime = floatingView?.findViewById(R.id.tv_workout_time)
        tvRestTime = floatingView?.findViewById(R.id.tv_rest_time)
        restContainer = floatingView?.findViewById(R.id.rest_container)
        
        val params = android.view.WindowManager.LayoutParams(
            android.view.WindowManager.LayoutParams.WRAP_CONTENT,
            android.view.WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            else android.view.WindowManager.LayoutParams.TYPE_PHONE,
            android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.TOP or android.view.Gravity.START
        params.x = 50
        params.y = 200
        
        floatingView?.setOnTouchListener(object : android.view.View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var touchStartTime = 0L

            override fun onTouch(v: android.view.View, event: android.view.MotionEvent): Boolean {
                when (event.action) {
                    android.view.MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        touchStartTime = System.currentTimeMillis()
                        return true
                    }
                    android.view.MotionEvent.ACTION_MOVE -> {
                        params.x = initialX + (event.rawX - initialTouchX).toInt()
                        params.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager?.updateViewLayout(floatingView, params)
                        return true
                    }
                    android.view.MotionEvent.ACTION_UP -> {
                        val diffX = Math.abs(event.rawX - initialTouchX)
                        val diffY = Math.abs(event.rawY - initialTouchY)
                        val diffTime = System.currentTimeMillis() - touchStartTime
                        if (diffX < 10 && diffY < 10 && diffTime < 250) {
                            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                            if (launchIntent != null) {
                                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                                startActivity(launchIntent)
                            }
                        }
                        return true
                    }
                }
                return false
            }
        })
        
        windowManager?.addView(floatingView, params)
        floatingView?.visibility = android.view.View.GONE
    }

    private fun updateFloatingWidgetVisibility() {
        if (!android.provider.Settings.canDrawOverlays(this)) return
        if (floatingView == null) initFloatingWidget()
        
        if (floatingView != null) {
            val shouldShow = !isAppActive && isResting
            floatingView?.visibility = if (shouldShow) android.view.View.VISIBLE else android.view.View.GONE
            if (shouldShow) updateFloatingWidgetData()
        }
    }

    private fun updateFloatingWidgetData() {
        if (floatingView == null || floatingView?.visibility == android.view.View.GONE) return
        
        val elapsedSec = (System.currentTimeMillis() - currentStartTime) / 1000
        val durationStr = formatTime(elapsedSec)
        tvWorkoutTime?.text = durationStr
        
        if (isResting) {
            val restLeft = kotlin.math.ceil((restTargetTime - System.currentTimeMillis()) / 1000.0).toLong()
            restContainer?.visibility = android.view.View.VISIBLE
            val formattedRest = formatTime(Math.abs(restLeft))
            if (restLeft >= 0) {
                tvRestTime?.text = formattedRest
                tvRestTime?.setTextColor(android.graphics.Color.WHITE)
            } else {
                tvRestTime?.text = "-$formattedRest"
                tvRestTime?.setTextColor(android.graphics.Color.parseColor("#F43F5E"))
            }
        } else {
            restContainer?.visibility = android.view.View.GONE
        }
    }
}
