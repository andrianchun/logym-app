package com.andrianchun.logym

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Memasang APK pembaruan TANPA melempar user ke browser.
 *
 * Sebelumnya tombol Update di jalur APK cuma membuka tautan hosting di browser; user harus
 * mencari sendiri berkasnya di folder Downloads lalu menekannya. Di sini bytenya dialirkan
 * LANGSUNG dari hosting ke `PackageInstaller.Session` — tidak pernah menjadi berkas di disk,
 * jadi tidak ada yang perlu dihapus sesudahnya dan tidak ada APK menganggur 16 MB di Downloads.
 *
 * YANG TIDAK BISA DIHILANGKAN: dialog "Install" milik Android, dan sekali-seumur-hidup izin
 * "Izinkan dari sumber ini". Android tidak mengizinkan aplikasi biasa memasang paket diam-diam,
 * dan tidak ada jalan memutar yang sah untuk itu.
 *
 * CATATAN KEBIJAKAN: `REQUEST_INSTALL_PACKAGES` adalah izin sensitif, dan pembaruan mandiri
 * melanggar kebijakan Device and Network Abuse Play Store. Aman selama Logym disebar sideload;
 * kalau nanti masuk Play Store, plugin ini harus dicabut lagi.
 *
 * Ini BUKAN langkah keamanan. APK yang sama sudah ada di HP tiap user yang memasangnya dan bisa
 * ditarik tanpa root (`adb shell pm path` lalu `adb pull`), jadi menyembunyikan tautan unduhan
 * tidak mempersulit siapa pun yang mau membongkarnya. Perlindungan fitur berbayar harus di server.
 */
@CapacitorPlugin(name = "ApkInstaller")
class ApkInstallerPlugin : Plugin() {

    private val statusAction get() = "${context.packageName}.APK_INSTALL_STATUS"
    private var receiver: BroadcastReceiver? = null

    override fun load() {
        val r = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1)) {
                    // Android meminta konfirmasi user. Intent inilah dialog "Install"-nya —
                    // wajib dijalankan sendiri, kalau tidak sesinya menggantung tanpa tanda apa pun.
                    PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                        val konfirmasi = if (Build.VERSION.SDK_INT >= 33) {
                            intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                        }
                        konfirmasi?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        konfirmasi?.let { ctx.startActivity(it) }
                        kirim("prompt", null)
                    }
                    PackageInstaller.STATUS_SUCCESS -> kirim("success", null)
                    else -> kirim(
                        "failed",
                        intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Pemasangan dibatalkan"
                    )
                }
            }
        }
        receiver = r
        ContextCompat.registerReceiver(
            context, r, IntentFilter(statusAction), ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun handleOnDestroy() {
        receiver?.let { runCatching { context.unregisterReceiver(it) } }
        receiver = null
    }

    private fun kirim(state: String, message: String?) {
        notifyListeners("apkInstall", JSObject().put("state", state).put("message", message ?: ""))
    }

    private fun kirimProgress(percent: Int) {
        notifyListeners("apkInstall", JSObject().put("state", "downloading").put("percent", percent))
    }

    /** Apakah user sudah mengizinkan Logym memasang aplikasi dari sumbernya sendiri. */
    @PluginMethod
    fun canInstall(call: PluginCall) {
        call.resolve(JSObject().put("granted", context.packageManager.canRequestPackageInstalls()))
    }

    /** Buka layar setelan "Install unknown apps" untuk Logym. */
    @PluginMethod
    fun openInstallSettings(call: PluginCall) {
        val intent = Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
        call.resolve()
    }

    @PluginMethod
    fun install(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("URL APK kosong")
            return
        }
        if (!context.packageManager.canRequestPackageInstalls()) {
            // Bukan error: user tinggal mengizinkan lalu menekan Update lagi. JS yang memutuskan
            // cara memberitahunya.
            call.resolve(JSObject().put("needsPermission", true))
            return
        }

        call.resolve(JSObject().put("needsPermission", false))

        thread(isDaemon = true) {
            var session: PackageInstaller.Session? = null
            var sessionId = -1
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 30_000
                    readTimeout = 60_000
                    instanceFollowRedirects = true
                }
                conn.connect()
                if (conn.responseCode !in 200..299) {
                    kirim("failed", "Server menjawab ${conn.responseCode}")
                    return@thread
                }
                val total = conn.contentLengthLong

                val installer = context.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(
                    PackageInstaller.SessionParams.MODE_FULL_INSTALL
                )
                // Ukuran diberitahukan di depan supaya Android bisa menolak lebih awal kalau
                // penyimpanan tidak cukup, bukan setelah 16 MB terlanjur ditulis.
                if (total > 0) params.setSize(total)
                sessionId = installer.createSession(params)
                session = installer.openSession(sessionId)

                conn.inputStream.use { masuk ->
                    session.openWrite("logym", 0, total).use { keluar ->
                        val buf = ByteArray(64 * 1024)
                        var terunduh = 0L
                        var terakhirLapor = -1
                        while (true) {
                            val n = masuk.read(buf)
                            if (n < 0) break
                            keluar.write(buf, 0, n)
                            terunduh += n
                            if (total > 0) {
                                val persen = ((terunduh * 100) / total).toInt()
                                // Lapor per 1% saja: notifyListeners tiap 64 KB membanjiri bridge
                                // dan justru membuat bar progresnya tersendat.
                                if (persen != terakhirLapor) {
                                    terakhirLapor = persen
                                    kirimProgress(persen)
                                }
                            }
                        }
                        session.fsync(keluar)
                    }
                }

                val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                val pending = PendingIntent.getBroadcast(
                    context,
                    sessionId,
                    Intent(statusAction).setPackage(context.packageName),
                    flags
                )
                kirim("installing", null)
                session.commit(pending.intentSender)
                session.close()
            } catch (e: Exception) {
                runCatching { session?.abandon() }
                runCatching { if (sessionId >= 0) context.packageManager.packageInstaller.abandonSession(sessionId) }
                kirim("failed", e.message ?: "Gagal mengunduh pembaruan")
            }
        }
    }
}
