package com.andrianchun.logym

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSegment
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
        // Ringkasan set x reps x kg. Health Connect TIDAK punya field beban sama sekali di skema
        // latihannya — ini batas platform, bukan batas plugin — jadi kilogram cuma bisa dibawa
        // sebagai teks. Tanpa ini, sesi di Samsung Health cuma berisi nama dan durasi.
        val notes = call.getString("notes")
        val segments = buildSegments(call.getArray("segments"), start, end)
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
            // manualEntry(clientRecordId, clientRecordVersion, device?) — BUKAN manualEntryWithId,
            // yang parameter keduanya `Device?` dan tidak punya versi sama sekali. Tanpa versi,
            // koreksi sesi tidak pernah bisa menggantikan record lama.
            val meta = if (clientRecordId == null) Metadata.manualEntry()
                       else Metadata.manualEntry(clientRecordId, version)

            fun record(segs: List<ExerciseSegment>) = ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = zone.rules.getOffset(start),
                endTime = end,
                endZoneOffset = zone.rules.getOffset(end),
                exerciseType = type,
                title = title,
                notes = notes,
                segments = segs,
                laps = emptyList(),
                metadata = meta,
            )

            val hasil = runCatching { client.insertRecords(listOf(record(segments))) }
                // Health Connect MENOLAK seluruh record kalau ada satu jenis segmen yang dianggap
                // tidak cocok dengan jenis sesinya (tabel kecocokannya internal dan tidak stabil
                // antar versi). Sesi tanpa rincian jauh lebih baik daripada sesi yang tidak
                // tersimpan sama sekali, jadi kalau ditolak — coba lagi tanpa segmen.
                .recoverCatching { e ->
                    if (segments.isEmpty()) throw e
                    client.insertRecords(listOf(record(emptyList())))
                }

            hasil.onSuccess {
                call.resolve(JSObject().put("saved", true).put("segments", segments.size))
            }.onFailure {
                call.reject("Gagal menyimpan sesi latihan: ${it.message}")
            }
        }
    }

    /**
     * Ubah daftar latihan dari JS jadi ExerciseSegment.
     *
     * Health Connect mewajibkan segmen berada DI DALAM rentang sesi dan tidak saling tumpang
     * tindih — satu saja yang melanggar, seluruh record ditolak. Karena itu semuanya dipotong
     * paksa ke [start, end] dan yang mundur/nol panjang dibuang, bukan dipercaya apa adanya.
     */
    private fun buildSegments(arr: com.getcapacitor.JSArray?, start: Instant, end: Instant): List<ExerciseSegment> {
        if (arr == null) return emptyList()
        val out = mutableListOf<ExerciseSegment>()
        for (i in 0 until arr.length()) {
            val o = runCatching { arr.getJSONObject(i) }.getOrNull() ?: continue
            val s = runCatching { Instant.parse(o.getString("startDate")) }.getOrNull() ?: continue
            val e = runCatching { Instant.parse(o.getString("endDate")) }.getOrNull() ?: continue
            val cs = if (s.isBefore(start)) start else s
            val ce = if (e.isAfter(end)) end else e
            if (!cs.isBefore(ce)) continue
            out.add(
                ExerciseSegment(
                    startTime = cs,
                    endTime = ce,
                    segmentType = segmentTypeOf(o.optString("type")),
                    repetitions = o.optInt("reps", 0).coerceAtLeast(0),
                )
            )
        }
        return out
    }

    // Kata kunci nama latihan -> jenis segmen. Sengaja kasar dan sedikit: yang tidak dikenal jatuh
    // ke OTHER_WORKOUT, dan repetisinya tetap terbawa — itu bagian yang paling berguna. Memaksa
    // pemetaan yang tepat untuk ratusan nama latihan tidak sepadan dengan nilainya.
    private fun segmentTypeOf(name: String?): Int {
        val n = (name ?: "").lowercase()
        return when {
            // URUTAN PENTING: yang lebih spesifik WAJIB di atas yang generik. Versi lama menaruh
            // "curl" di atas "leg curl", sehingga Leg Curl terkirim ke Health Connect sebagai
            // "Arm curl" — salah otot, dan tidak ada tanda apa pun bahwa itu terjadi.
            n.contains("leg press") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LEG_PRESS
            n.contains("leg curl") || n.contains("hamstring curl") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LEG_CURL
            n.contains("leg extension") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LEG_EXTENSION
            n.contains("leg raise") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LEG_RAISE
            n.contains("back extension") || n.contains("hyperextension") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BACK_EXTENSION
            // Triceps: dulu jatuh ke OTHER_WORKOUT dan tampil "Workout" di layar Health Connect.
            n.contains("triceps") || n.contains("tricep") || n.contains("pushdown") ->
                ExerciseSegment.EXERCISE_SEGMENT_TYPE_DOUBLE_ARM_TRICEPS_EXTENSION
            n.contains("lateral raise") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LATERAL_RAISE
            n.contains("front raise") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_FRONT_RAISE
            n.contains("shoulder press") || n.contains("overhead press") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_SHOULDER_PRESS
            n.contains("bench") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BENCH_PRESS
            n.contains("lat pull") || n.contains("pulldown") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LAT_PULL_DOWN
            n.contains("pull up") || n.contains("pull-up") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_PULL_UP
            n.contains("hip thrust") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_HIP_THRUST
            n.contains("kettlebell") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_KETTLEBELL_SWING
            n.contains("mountain climber") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_MOUNTAIN_CLIMBER
            n.contains("squat") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_SQUAT
            n.contains("deadlift") || n.contains("angkat mati") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_DEADLIFT
            n.contains("curl") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_ARM_CURL
            n.contains("lunge") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_LUNGE
            n.contains("plank") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_PLANK
            n.contains("crunch") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_CRUNCH
            n.contains("sit up") || n.contains("sit-up") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_SIT_UP
            n.contains("row") && !n.contains("rowing") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_DUMBBELL_ROW
            n.contains("hiit") || n.contains("interval") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
            n.contains("pilates") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_PILATES
            n.contains("renang") || n.contains("swim") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_SWIMMING_POOL
            n.contains("stair") || n.contains("tangga") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_STAIR_CLIMBING_MACHINE
            n.contains("treadmill") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_RUNNING_TREADMILL
            n.contains("lari") || n.contains("run") || n.contains("jog") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_RUNNING
            n.contains("jalan") || n.contains("walk") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_WALKING
            n.contains("sepeda") || n.contains("bike") || n.contains("cycl") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BIKING_STATIONARY
            n.contains("rowing") || n.contains("dayung") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_ROWING_MACHINE
            n.contains("elliptical") || n.contains("eliptik") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_ELLIPTICAL
            n.contains("burpee") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BURPEE
            n.contains("jumping jack") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_JUMPING_JACK
            n.contains("skipping") || n.contains("jump rope") || n.contains("lompat tali") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_JUMP_ROPE
            n.contains("yoga") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_YOGA
            n.contains("stretch") || n.contains("peregangan") -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_STRETCHING
            else -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_OTHER_WORKOUT
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
