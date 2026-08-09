package com.andrianchun.logym

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Metadata
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId

/**
 * Menulis sesi latihan (ExerciseSessionRecord) ke Health Connect.
 *
 * KENAPA ADA: @capgo/capacitor-health cuma bisa MEMBACA sesi latihan. Di kodenya, tipe
 * "workouts" bahkan tidak terdaftar di enum HealthDataType — dia cuma ditangani lewat flag
 * khusus untuk izin baca (lihat permissionsFor di HealthManager.kt), dan saveSample tidak
 * punya cabang untuk ExerciseSessionRecord sama sekali. Akibatnya sesi latihan Logym tidak
 * pernah muncul sebagai "Workout" di aplikasi lain, cuma sebagai angka kalori polos —
 * padahal Samsung Health dkk bisa. Plugin kecil ini menutup celah itu.
 *
 * Sengaja terpisah dari plugin capgo (bukan fork) supaya update plugin itu tidak menimpanya.
 */
@CapacitorPlugin(name = "ExerciseWriter")
class ExerciseWriterPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val permissionContract = PermissionController.createRequestPermissionResultContract()
    private val writePermission = HealthPermission.getWritePermission(ExerciseSessionRecord::class)

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }

    private fun clientOrReject(call: PluginCall): HealthConnectClient? {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect tidak tersedia di perangkat ini.")
            return null
        }
        return runCatching { HealthConnectClient.getOrCreate(context) }
            .onFailure { call.reject("Gagal membuka Health Connect: ${it.message}") }
            .getOrNull()
    }

    /** Cek apakah izin tulis sesi latihan sudah diberikan. */
    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val client = clientOrReject(call) ?: return
        scope.launch {
            runCatching { client.permissionController.getGrantedPermissions() }
                .onSuccess { call.resolve(JSObject().put("granted", it.contains(writePermission))) }
                .onFailure { call.reject("Gagal membaca status izin: ${it.message}") }
        }
    }

    /**
     * Minta izin tulis sesi latihan. Idempoten: kalau sudah diberikan, langsung resolve tanpa
     * memunculkan dialog — sama seperti perilaku plugin capgo, jadi aman dipanggil tiap sinkron.
     */
    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val client = clientOrReject(call) ?: return
        scope.launch {
            val granted = runCatching { client.permissionController.getGrantedPermissions() }.getOrNull()
            if (granted != null && granted.contains(writePermission)) {
                call.resolve(JSObject().put("granted", true))
                return@launch
            }
            runCatching {
                startActivityForResult(call, permissionContract.createIntent(context, setOf(writePermission)), "permissionResult")
            }.onFailure {
                call.reject("Gagal membuka dialog izin Health Connect: ${it.message}")
            }
        }
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val client = clientOrReject(call) ?: return
        scope.launch {
            val granted = runCatching { client.permissionController.getGrantedPermissions() }.getOrNull().orEmpty()
            call.resolve(JSObject().put("granted", granted.contains(writePermission)))
        }
    }

    /**
     * Simpan satu sesi latihan.
     * startDate/endDate: ISO 8601. exerciseType: nama konstanta Health Connect (lihat
     * exerciseTypeOf) — kalau tidak dikenal, jatuh ke OTHER_WORKOUT supaya tidak pernah gagal
     * cuma karena nama jenis latihan.
     *
     * `clientRecordId` (id sesi Logym) + `clientRecordVersion` membuat Health Connect
     * MENG-UPSERT, bukan menyisipkan record baru. Tanpa itu, satu-satunya penjaga duplikat adalah
     * memo di localStorage — yang hilang begitu app di-reinstall atau datanya dibersihkan, lalu
     * sapuan setahun menulis ULANG semua sesi. Health Connect tidak punya jalur hapus lewat
     * plugin ini, jadi duplikatnya permanen dan kalori di Samsung Health melonjak dua kali lipat.
     *
     * Versi juga membuat sesi yang durasinya diperbaiki belakangan bisa MENGGANTI record lama,
     * bukan menumpuk record kedua di sebelahnya.
     */
    @PluginMethod
    fun saveWorkout(call: PluginCall) {
        val client = clientOrReject(call) ?: return
        val start = runCatching { Instant.parse(call.getString("startDate")) }.getOrNull()
        val end = runCatching { Instant.parse(call.getString("endDate")) }.getOrNull()
        if (start == null || end == null) {
            call.reject("startDate/endDate wajib diisi dengan ISO 8601 yang valid.")
            return
        }
        if (!start.isBefore(end)) {
            call.reject("startDate harus lebih awal dari endDate.")
            return
        }
        val type = exerciseTypeOf(call.getString("exerciseType"))
        val title = call.getString("title")
        val clientRecordId = call.getString("clientRecordId")?.takeIf { it.isNotBlank() }
        // Versi WAJIB naik tiap kali isinya berubah; Health Connect membuang tulisan dengan versi
        // yang lebih rendah dari yang sudah tersimpan.
        val version = call.getLong("clientRecordVersion") ?: 1L
        val zone = ZoneId.systemDefault()

        scope.launch {
            val granted = runCatching { client.permissionController.getGrantedPermissions() }.getOrNull().orEmpty()
            if (!granted.contains(writePermission)) {
                call.reject("Izin menulis sesi latihan belum diberikan.")
                return@launch
            }
            runCatching {
                client.insertRecords(
                    listOf(
                        ExerciseSessionRecord(
                            startTime = start,
                            startZoneOffset = zone.rules.getOffset(start),
                            endTime = end,
                            endZoneOffset = zone.rules.getOffset(end),
                            exerciseType = type,
                            title = title,
                            // manualEntry(clientRecordId, clientRecordVersion, device?) — BUKAN
                            // manualEntryWithId, yang parameter keduanya `Device?` dan tidak punya
                            // versi sama sekali. Tanpa versi, koreksi sesi tidak pernah bisa
                            // menggantikan record lama.
                            metadata = if (clientRecordId == null) Metadata.manualEntry()
                                       else Metadata.manualEntry(clientRecordId, version)
                        )
                    )
                )
            }.onSuccess {
                call.resolve(JSObject().put("saved", true))
            }.onFailure {
                call.reject("Gagal menyimpan sesi latihan: ${it.message}")
            }
        }
    }

    // Hanya jenis yang benar-benar dipakai Logym + padanan umum. Sisanya OTHER_WORKOUT —
    // lebih baik tercatat sebagai "latihan lain" daripada gagal tersimpan.
    private fun exerciseTypeOf(name: String?) = when (name) {
        "strengthTraining", "weightlifting" -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
        "runningTreadmill" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL
        "running" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
        "walking" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
        "hiking" -> ExerciseSessionRecord.EXERCISE_TYPE_HIKING
        "cycling" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
        "bikingStationary" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY
        "swimming" -> ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL
        "elliptical" -> ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL
        "rowingMachine" -> ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE
        "stairClimbing" -> ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING
        "highIntensityIntervalTraining" -> ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
        "yoga" -> ExerciseSessionRecord.EXERCISE_TYPE_YOGA
        "pilates" -> ExerciseSessionRecord.EXERCISE_TYPE_PILATES
        "stretching" -> ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING
        "calisthenics" -> ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS
        "boxing" -> ExerciseSessionRecord.EXERCISE_TYPE_BOXING
        "martialArts" -> ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS
        "badminton" -> ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON
        "basketball" -> ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL
        "soccer" -> ExerciseSessionRecord.EXERCISE_TYPE_SOCCER
        "tennis" -> ExerciseSessionRecord.EXERCISE_TYPE_TENNIS
        else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }
}
