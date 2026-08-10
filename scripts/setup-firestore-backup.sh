#!/usr/bin/env bash
# Backup Firestore otomatis ke Cloud Storage. Jalankan SEKALI; sesudah itu berjalan sendiri.
#
#   bash scripts/setup-firestore-backup.sh
#
# Aman diulang: semua langkah memeriksa dulu, jadi menjalankannya dua kali tidak menggandakan
# apa pun dan bisa dipakai untuk mengubah jadwal/retensi.
#
# ── KENAPA BENTUKNYA BEGINI ────────────────────────────────────────────────────────────────
# Cloud Scheduler memanggil Firestore Admin API LANGSUNG. Tidak ada Cloud Function di jalur ini:
# tidak ada kode yang perlu di-deploy, di-maintain, atau bangun dari cold start, dan tidak ada
# lagi satu tempat yang bisa gagal diam-diam. Penghapusan backup lama juga bukan kode — itu
# lifecycle rule bawaan Cloud Storage.
#
# Ini melengkapi backup di dalam app (koleksi history_backups), bukan menggantikannya. Bedanya
# penting: backup dalam app hanya berisi tahun yang sedang dimuat perangkat, dan dibuat DARI
# state lokal — kalau state lokalnya sudah rusak, backup-nya ikut rusak. Export ini mengambil
# apa adanya dari server, seluruh database, semua user, semua tahun.
#
# ── BIAYA ──────────────────────────────────────────────────────────────────────────────────
# Export ditagih sebagai pembacaan dokumen (satu read per dokumen), plus penyimpanan GCS.
# Untuk basis pengguna sekarang ini receh; kalau kelak membengkak, dua knob-nya ada di bawah:
# SCHEDULE (perjarang) dan COLLECTIONS (persempit).
# Cloud Scheduler gratis sampai 3 job. Bucket-nya kelas STANDARD, dihapus otomatis setelah
# RETENTION_DAYS supaya tidak menumpuk selamanya.
set -euo pipefail

PROJECT="${PROJECT:-hexa-life}"
BUCKET="${BUCKET:-gs://${PROJECT}-firestore-backup}"
JOB="${JOB:-firestore-daily-export}"
# Tiap hari 03:00 WIB — jam mati, dan cukup sering supaya kehilangan paling banyak sehari.
# Perjarang jadi "0 3 * * 0" (mingguan) kalau biayanya terasa.
SCHEDULE="${SCHEDULE:-0 3 * * *}"
TZ_NAME="${TZ_NAME:-Asia/Jakarta}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
SA_NAME="${SA_NAME:-firestore-backup}"
# Kosong = SELURUH database (yang benar untuk backup). Persempit jadi mis.
# COLLECTIONS='"logym_users"' cuma kalau biaya read jadi masalah — tapi sadari konsekuensinya:
# yang tidak disebut tidak ikut ter-backup, dan itu baru ketahuan saat dibutuhkan.
COLLECTIONS="${COLLECTIONS:-}"

command -v gcloud >/dev/null || { echo "gcloud belum terpasang: https://cloud.google.com/sdk/docs/install"; exit 1; }
gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q . || { echo "Belum login. Jalankan: gcloud auth login"; exit 1; }

SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
echo "Project: ${PROJECT}"

echo "== 1/6 Mengaktifkan API yang dibutuhkan"
gcloud services enable firestore.googleapis.com cloudscheduler.googleapis.com storage.googleapis.com --project "${PROJECT}"

# Bucket WAJIB satu lokasi dengan database Firestore — export lintas lokasi ditolak, dan
# pesan errornya tidak menyebut lokasi sebagai penyebab. Karena itu dibaca, bukan ditebak.
LOCATION="$(gcloud firestore databases describe --database='(default)' --project "${PROJECT}" --format='value(locationId)')"
echo "== 2/6 Lokasi Firestore: ${LOCATION}"

if gcloud storage buckets describe "${BUCKET}" --project "${PROJECT}" >/dev/null 2>&1; then
  echo "== 3/6 Bucket sudah ada: ${BUCKET}"
else
  echo "== 3/6 Membuat bucket ${BUCKET} di ${LOCATION}"
  gcloud storage buckets create "${BUCKET}" --project "${PROJECT}" --location "${LOCATION}" --uniform-bucket-level-access
fi

echo "== 4/6 Retensi ${RETENTION_DAYS} hari (lifecycle rule bawaan GCS, bukan kode)"
LIFECYCLE="$(mktemp)"
cat > "${LIFECYCLE}" <<EOF
{"rule":[{"action":{"type":"Delete"},"condition":{"age":${RETENTION_DAYS}}}]}
EOF
gcloud storage buckets update "${BUCKET}" --lifecycle-file="${LIFECYCLE}" --project "${PROJECT}"
rm -f "${LIFECYCLE}"

echo "== 5/6 Service account + izin"
gcloud iam service-accounts describe "${SA_EMAIL}" --project "${PROJECT}" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "${SA_NAME}" --display-name="Firestore scheduled backup" --project "${PROJECT}"
# importExportAdmin: memicu export. Tidak memberi akses BACA isi dokumen lewat API biasa —
# sengaja sesempit itu, karena kredensial ini hidup di Cloud Scheduler.
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/datastore.importExportAdmin" --condition=None >/dev/null
gcloud storage buckets add-iam-policy-binding "${BUCKET}" \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/storage.objectAdmin" --project "${PROJECT}" >/dev/null

BODY="{\"outputUriPrefix\":\"${BUCKET}\""
[ -n "${COLLECTIONS}" ] && BODY="${BODY},\"collectionIds\":[${COLLECTIONS}]"
BODY="${BODY}}"
URI="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default):exportDocuments"

echo "== 6/6 Menjadwalkan: ${SCHEDULE} (${TZ_NAME})"
if gcloud scheduler jobs describe "${JOB}" --location "${LOCATION}" --project "${PROJECT}" >/dev/null 2>&1; then
  ACTION=update
else
  ACTION=create
fi
gcloud scheduler jobs ${ACTION} http "${JOB}" \
  --project "${PROJECT}" \
  --location "${LOCATION}" \
  --schedule "${SCHEDULE}" \
  --time-zone "${TZ_NAME}" \
  --uri "${URI}" \
  --http-method POST \
  --oauth-service-account-email "${SA_EMAIL}" \
  --headers "Content-Type=application/json" \
  --message-body "${BODY}"

cat <<EOF

Selesai. Backup jalan tiap "${SCHEDULE}" (${TZ_NAME}) ke ${BUCKET}, dihapus otomatis setelah ${RETENTION_DAYS} hari.

JANGAN PERCAYA SEBELUM DILIHAT — picu sekali sekarang, lalu pastikan filenya benar-benar ada:
  gcloud scheduler jobs run ${JOB} --location ${LOCATION} --project ${PROJECT}
  sleep 60 && gcloud storage ls ${BUCKET}

Memulihkan (menimpa data yang ada — pastikan memang itu yang diinginkan):
  gcloud firestore import ${BUCKET}/<FOLDER_TIMESTAMP> --project ${PROJECT}

Menghentikan:  gcloud scheduler jobs pause ${JOB} --location ${LOCATION} --project ${PROJECT}
EOF
