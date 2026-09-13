export const equipmentOptions = ["Assisted", "Band", "Barbell", "Body Weight", "Bosu Ball", "Cable", "Dumbbell", "Elliptical Machine", "EZ Barbell", "Hammer", "Kettlebell", "Leverage Machine", "Machine", "Medicine Ball", "Olympic Barbell", "Resistance Band", "Roller", "Rope", "Rowing Machine", "Skierg", "Sled Machine", "Smith Machine", "Stability Ball", "Stationary Bike", "Stepmill Machine", "Tire", "Trap Bar", "Treadmill", "Upper Body Ergometer", "Weighted", "Wheel Roller", "Lainnya"];
export const levelOptions = ["beginner", "intermediate", "advanced"];

export const defaultEquipmentConfig = {
  'Olympic Barbell': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Barbell': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'EZ Barbell': { baseWeight: 10, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Trap Bar': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Smith Machine': { baseWeight: 15, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Dumbbell': { baseWeight: 0, ratio: 1, inputRule: 'per_side', label: 'Beban 1 Sisi', placeholder: 'Ketikan beban 1 sisi' },
  'Kettlebell': { baseWeight: 0, ratio: 1, inputRule: 'per_side', label: 'Beban 1 Sisi', placeholder: 'Ketikan beban 1 sisi' },
  'Cable': { baseWeight: 0, ratio: 1, inputRule: 'per_side_or_pin', label: 'Beban 1 Sisi / Pin', placeholder: 'Ketikan beban 1 sisi / pin' },
  'Machine': { baseWeight: 0, ratio: 1, inputRule: 'pin_number', label: 'Angka di Pin', placeholder: 'Ketikan angka di pin' },
  'Leverage Machine': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Sled Machine': { baseWeight: 45, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Weighted': { baseWeight: 0, ratio: 1, isBodyweightPlus: true, inputRule: 'extra_weight', label: 'Beban Tambahan', placeholder: 'Ketikan beban tambahan' },
  'Body Weight': { baseWeight: 0, ratio: 1, inputRule: 'bodyweight', label: 'Berat Badan', placeholder: '0' },
  'Assisted': { baseWeight: 0, ratio: 1, inputRule: 'assisted', label: 'Bantuan Pin', placeholder: 'Beban bantuan' },
};

export const exerciseTypeLabels = {
  weight: 'Beban & Repetisi',
  reps: 'Repetisi',
  time: 'Durasi',
  cardio: 'Kardio (Jarak & Waktu)',
};

export const defaultMasterExercises = [
  {
    "id": 101,
    "name": "Smith Machine Incline Bench Press",
    "target": [
      "Dada Atas",
      "Deltoid Depan",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Smith Machine",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Incline_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.webp",
    "instructions": [
      "Atur bangku incline di bawah smith machine. Posisikan barbell pada ketinggian yang terjangkau saat berbaring dengan lengan hampir lurus. Setelah mengatur beban, berbaringlah dan pastikan dada bagian atas sejajar dengan barbell. Genggam bar dengan posisi telapak tangan menghadap ke depan (lebih lebar dari bahu), lepas kunci bar, lalu luruskan lengan ke atas sebagai posisi awal.",
      "Tarik napas, lalu turunkan bar secara perlahan hingga hampir menyentuh dada bagian atas.",
      "Tahan selama satu detik, lalu dorong kembali bar ke posisi awal menggunakan otot dada sambil mengembuskan napas. Kunci lengan di atas, tahan sesaat, lalu turunkan kembali secara perlahan. (Tip: Durasi menurunkan beban sebaiknya dua kali lebih lambat dibanding saat mendorong).",
      "Ulangi gerakan ini sesuai dengan jumlah repetisi yang dianjurkan.",
      "Setelah selesai, kunci kembali bar ke rak dengan aman."
    ],
    "instructions_id": [
      "Atur bangku incline di bawah smith machine. Posisikan barbell pada ketinggian yang terjangkau saat berbaring dengan lengan hampir lurus. Setelah mengatur beban, berbaringlah dan pastikan dada bagian atas sejajar dengan barbell. Genggam bar dengan posisi telapak tangan menghadap ke depan (lebih lebar dari bahu), lepas kunci bar, lalu luruskan lengan ke atas sebagai posisi awal.",
      "Tarik napas, lalu turunkan bar secara perlahan hingga hampir menyentuh dada bagian atas.",
      "Tahan selama satu detik, lalu dorong kembali bar ke posisi awal menggunakan otot dada sambil mengembuskan napas. Kunci lengan di atas, tahan sesaat, lalu turunkan kembali secara perlahan. (Tip: Durasi menurunkan beban sebaiknya dua kali lebih lambat dibanding saat mendorong).",
      "Ulangi gerakan ini sesuai dengan jumlah repetisi yang dianjurkan.",
      "Setelah selesai, kunci kembali bar ke rak dengan aman."
    ],
    "instructions_en": [
      "Place an incline bench underneath the smith machine. Place the barbell at a height that you can reach when lying down and your arms are almost fully extended. Once the weight you need is selected, lie down on the incline bench and make sure your upper chest is aligned with the barbell. Using a pronated grip (palms facing forward) that is wider than shoulder width, unlock the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "As you breathe in, come down slowly until you feel the bar on your upper chest.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ]
  },
  {
    "id": 102,
    "name": "Seated Cable Rows",
    "target": [
      "Punggung Atas",
      "Biceps"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz",
    "videoUrl": "/exercise-assets/edb-Seated_Cable_Rows.mp4 /exercise-assets/youtube-backup/edb-Seated_Cable_Rows.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Seated_Cable_Rows.webp",
    "gifUrl": "/exercise-assets/edb-Seated_Cable_Rows.webp",
    "instructions": [
      "Gunakan mesin low pulley row dengan V-bar (pegangan netral saling berhadapan). Duduklah di mesin dan letakkan kaki di platform depan dengan lutut sedikit ditekuk (tidak terkunci).",
      "Condongkan badan ke depan dengan punggung tetap lurus alami, lalu raih pegangan V-bar.",
      "Tarik beban dengan tangan lurus hingga posisi tubuh membentuk sudut 90 derajat terhadap kaki. Punggung sedikit melengkung ke atas, dada membusung, dan Anda merasakan regangan pada otot punggung (lats). Ini adalah posisi awal.",
      "Tahan posisi tubuh tetap diam, lalu tarik pegangan ke arah perut (abdomen) dengan siku dekat dengan tubuh sambil mengembuskan napas. Remas otot punggung sekuat tenaga, tahan selama sedetik, lalu kembali ke posisi awal secara perlahan sambil menarik napas.",
      "Ulangi gerakan tersebut sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Gunakan mesin low pulley row dengan V-bar (pegangan netral saling berhadapan). Duduklah di mesin dan letakkan kaki di platform depan dengan lutut sedikit ditekuk (tidak terkunci).",
      "Condongkan badan ke depan dengan punggung tetap lurus alami, lalu raih pegangan V-bar.",
      "Tarik beban dengan tangan lurus hingga posisi tubuh membentuk sudut 90 derajat terhadap kaki. Punggung sedikit melengkung ke atas, dada membusung, dan Anda merasakan regangan pada otot punggung (lats). Ini adalah posisi awal.",
      "Tahan posisi tubuh tetap diam, lalu tarik pegangan ke arah perut (abdomen) dengan siku dekat dengan tubuh sambil mengembuskan napas. Remas otot punggung sekuat tenaga, tahan selama sedetik, lalu kembali ke posisi awal secara perlahan sambil menarik napas.",
      "Ulangi gerakan tersebut sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.",
      "Lean over as you keep the natural alignment of your back and grab the V-bar handles.",
      "With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.",
      "Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 103,
    "name": "Dumbbell Bench Press",
    "target": [
      "Dada Tengah",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.webp",
    "instructions": [
      "Berbaringlah di bangku datar dengan posisi dumbbell di atas paha. Telapak tangan saling berhadapan.",
      "Gunakan dorongan paha untuk mengangkat dumbbell satu per satu hingga berada di depan bahu.",
      "Putar pergelangan tangan ke depan agar telapak tangan menghadap ke depan. Posisikan dumbbell di samping dada dengan siku membentuk sudut 90 derajat. Ini adalah posisi awal Anda.",
      "Buang napas saat mendorong dumbbell ke atas hingga lengan lurus, remas otot dada selama satu detik, lalu turunkan beban secara perlahan (durasi turun dua kali lebih lama dari saat naik).",
      "Ulangi gerakan sesuai dengan jumlah repetisi yang ditentukan dalam program latihan Anda."
    ],
    "instructions_id": [
      "Berbaringlah di bangku datar dengan posisi dumbbell di atas paha. Telapak tangan saling berhadapan.",
      "Gunakan dorongan paha untuk mengangkat dumbbell satu per satu hingga berada di depan bahu.",
      "Putar pergelangan tangan ke depan agar telapak tangan menghadap ke depan. Posisikan dumbbell di samping dada dengan siku membentuk sudut 90 derajat. Ini adalah posisi awal Anda.",
      "Buang napas saat mendorong dumbbell ke atas hingga lengan lurus, remas otot dada selama satu detik, lalu turunkan beban secara perlahan (durasi turun dua kali lebih lama dari saat naik).",
      "Ulangi gerakan sesuai dengan jumlah repetisi yang ditentukan dalam program latihan Anda."
    ],
    "instructions_en": [
      "Lie down on a flat bench with a dumbbell in each hand resting on top of your thighs. The palms of your hands will be facing each other.",
      "Then, using your thighs to help raise the dumbbells up, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.",
      "Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. The dumbbells should be just to the sides of your chest, with your upper arm and forearm creating a 90 degree angle. Be sure to maintain full control of the dumbbells at all times. This will be your starting position.",
      "Then, as you breathe out, use your chest to push the dumbbells up. Lock your arms at the top of the lift and squeeze your chest, hold for a second and then begin coming down slowly. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
      "Repeat the movement for the prescribed amount of repetitions of your training program."
    ]
  },
  {
    "id": 104,
    "name": "Standing Cable Lateral Raise",
    "target": [
      "Deltoid Samping"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.mp4",
    "thumbnailUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.webp",
    "gifUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.webp",
    "instructions": [
      "Pasang single handle (d-handle) pada katrol kabel di posisi paling bawah (low pulley). Berdirilah tegak di samping mesin katrol.",
      "Pegang handle dengan tangan yang berada di sisi luar (menyilang di depan badan atau dari samping). Jaga tubuh tetap tegak, dada membusung, dan siku sedikit ditekuk.",
      "Angkat lengan ke samping hingga setinggi bahu atau sejajar dengan lantai. Buang napas saat mengangkat dan rasakan kontraksi penuh pada deltoid samping.",
      "Turunkan kabel secara perlahan dan terkontrol kembali ke posisi awal sambil menarik napas.",
      "Ulangi sebanyak repetisi yang ditentukan, lalu lakukan hal yang sama pada sisi lengan lainnya."
    ],
    "instructions_id": [
      "Pasang single handle (d-handle) pada katrol kabel di posisi paling bawah (low pulley). Berdirilah tegak di samping mesin katrol.",
      "Pegang handle dengan tangan yang berada di sisi luar (menyilang di depan badan atau dari samping). Jaga tubuh tetap tegak, dada membusung, dan siku sedikit ditekuk.",
      "Angkat lengan ke samping hingga setinggi bahu atau sejajar dengan lantai. Buang napas saat mengangkat dan rasakan kontraksi penuh pada deltoid samping.",
      "Turunkan kabel secara perlahan dan terkontrol kembali ke posisi awal sambil menarik napas.",
      "Ulangi sebanyak repetisi yang ditentukan, lalu lakukan hal yang sama pada sisi lengan lainnya."
    ],
    "instructions_en": [
      "Attach a single handle to the low pulley of a cable machine. Stand upright beside the pulley.",
      "Grasp the handle with the far arm across your body. Keep your torso steady and your elbow slightly bent.",
      "Raise your arm out to the side until it is parallel to the floor and at shoulder level. Exhale and hold the contraction at the top.",
      "Slowly lower the cable back down to the starting position under control as you inhale.",
      "Repeat for the recommended amount of reps, then switch to the other arm."
    ]
  },
  {
    "id": 105,
    "name": "Triceps Pushdown",
    "target": [
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne",
    "videoUrl": "/exercise-assets/edb-Triceps_Pushdown.mp4 /exercise-assets/youtube-backup/edb-Triceps_Pushdown.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Triceps_Pushdown.webp",
    "gifUrl": "/exercise-assets/edb-Triceps_Pushdown.webp",
    "instructions": [
      "Pasang stbar lurus atau bengkok pada katrol atas, lalu pegang dengan genggaman menghadap ke bawah (overhand) selebar bahu.",
      "Berdirilah tegak dengan torso lurus dan condongkan tubuh sedikit ke depan. Rapatkan lengan atas ke sisi tubuh dan posisikan tegak lurus dengan lantai. Lengan bawah mengarah ke atas menuju katrol. Ini adalah posisi awal Anda.",
      "Gunakan otot tricep untuk mendorong bar ke bawah hingga menyentuh bagian depan paha dan lengan lurus sempurna tegak lurus dengan lantai. Lengan atas harus tetap diam di samping torso dan hanya lengan bawah yang bergerak. Hembuskan napas saat melakukan gerakan ini.",
      "Tahan selama satu detik di posisi kontraksi, lalu kembalikan bar secara perlahan ke posisi awal sambil menarik napas.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Pasang stbar lurus atau bengkok pada katrol atas, lalu pegang dengan genggaman menghadap ke bawah (overhand) selebar bahu.",
      "Berdirilah tegak dengan torso lurus dan condongkan tubuh sedikit ke depan. Rapatkan lengan atas ke sisi tubuh dan posisikan tegak lurus dengan lantai. Lengan bawah mengarah ke atas menuju katrol. Ini adalah posisi awal Anda.",
      "Gunakan otot tricep untuk mendorong bar ke bawah hingga menyentuh bagian depan paha dan lengan lurus sempurna tegak lurus dengan lantai. Lengan atas harus tetap diam di samping torso dan hanya lengan bawah yang bergerak. Hembuskan napas saat melakukan gerakan ini.",
      "Tahan selama satu detik di posisi kontraksi, lalu kembalikan bar secara perlahan ke posisi awal sambil menarik napas.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.",
      "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.",
      "Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
      "After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 106,
    "name": "Dumbbell Alternate Bicep Curl",
    "target": [
      "Biceps"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Alternate_Bicep_Curl.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.webp",
    "instructions": [
      "Berdiri tegak dengan memegang dumbbell di masing-masing tangan di sisi tubuh. Siku dekat dengan torso dan telapak tangan menghadap paha.",
      "Tahan lengan atas tetap diam, angkat beban kanan sambil memutar telapak tangan ke depan. Buang napas saat menekuk bisep hingga beban sejajar dengan bahu. Tahan selama sedetik sambil mengontraksikan bisep. Catatan: Hanya lengan bawah yang bergerak.",
      "Turunkan kembali dumbbell secara perlahan ke posisi awal sambil menarik napas. Catatan: Putar kembali telapak tangan menghadap paha saat turun.",
      "Ulangi gerakan yang sama untuk tangan kiri. Ini dihitung satu repetisi.",
      "Lanjutkan gerakan bergantian ini sesuai jumlah repetisi yang ditentukan."
    ],
    "instructions_id": [
      "Berdiri tegak dengan memegang dumbbell di masing-masing tangan di sisi tubuh. Siku dekat dengan torso dan telapak tangan menghadap paha.",
      "Tahan lengan atas tetap diam, angkat beban kanan sambil memutar telapak tangan ke depan. Buang napas saat menekuk bisep hingga beban sejajar dengan bahu. Tahan selama sedetik sambil mengontraksikan bisep. Catatan: Hanya lengan bawah yang bergerak.",
      "Turunkan kembali dumbbell secara perlahan ke posisi awal sambil menarik napas. Catatan: Putar kembali telapak tangan menghadap paha saat turun.",
      "Ulangi gerakan yang sama untuk tangan kiri. Ini dihitung satu repetisi.",
      "Lanjutkan gerakan bergantian ini sesuai jumlah repetisi yang ditentukan."
    ],
    "instructions_en": [
      "Stand (torso upright) with a dumbbell in each hand held at arms length. The elbows should be close to the torso and the palms of your hand should be facing your thighs.",
      "While holding the upper arm stationary, curl the right weight as you rotate the palm of the hands until they are facing forward. At this point continue contracting the biceps as you breathe out until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move.",
      "Slowly begin to bring the dumbbell back to the starting position as your breathe in. Tip: Remember to twist the palms back to the starting position (facing your thighs) as you come down.",
      "Repeat the movement with the left hand. This equals one repetition.",
      "Continue alternating in this manner for the recommended amount of repetitions."
    ]
  },
  {
    "id": 107,
    "name": "Cardio",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Stationary Bike",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Lakukan pemanasan dinamis ringan selama 3–5 menit untuk mempersiapkan detak jantung dan persendian tubuh.",
      "Mulai aktivitas kardio pilihan Anda (jalan cepat, lari, sepeda, atau mesin kardio) secara bertahap hingga mencapai zona intensitas target.",
      "Pertahankan postur tubuh tegak, bahu rileks, dan atur pola pernapasan yang stabil serta berirama.",
      "Jaga kecepatan konstan sesuai durasi yang direncanakan tanpa memaksakan tubuh melampaui batas kemampuan fisik.",
      "Lakukan pendinginan selama 2–3 menit dengan menurunkan tempo secara bertahap hingga detak jantung kembali normal."
    ],
    "instructions_id": [
      "Lakukan pemanasan dinamis ringan selama 3–5 menit untuk mempersiapkan detak jantung dan persendian tubuh.",
      "Mulai aktivitas kardio pilihan Anda (jalan cepat, lari, sepeda, atau mesin kardio) secara bertahap hingga mencapai zona intensitas target.",
      "Pertahankan postur tubuh tegak, bahu rileks, dan atur pola pernapasan yang stabil serta berirama.",
      "Jaga kecepatan konstan sesuai durasi yang direncanakan tanpa memaksakan tubuh melampaui batas kemampuan fisik.",
      "Lakukan pendinginan selama 2–3 menit dengan menurunkan tempo secara bertahap hingga detak jantung kembali normal."
    ],
    "instructions_en": [
      "Perform a 3–5 minute light dynamic warm-up to prepare your heart rate and joints.",
      "Begin your chosen cardio activity at a gradual pace to smoothly reach your target heart rate zone.",
      "Maintain an upright posture, relaxed shoulders, and steady rhythmic breathing.",
      "Sustain a consistent pace for the target duration without overexerting yourself.",
      "Cool down for 2–3 minutes by gradually decreasing intensity until your heart rate normalizes."
    ]
  },
  {
    "id": 108,
    "name": "Smith Machine Squat",
    "target": [
      "Quads",
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 0,
    "equipment": "Smith Machine",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Squat.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Squat.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Squat.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Squat.webp",
    "instructions": [
      "Atur tinggi bar sesuai tubuh Anda. Setelah beban terpasang, posisikan bahu bagian belakang (sedikit di bawah leher) di bawah bar.",
      "Genggam bar dengan kedua tangan (telapak menghadap depan), buka kunci, dan angkat dari rak dengan mendorong kaki sambil menegakkan tubuh.",
      "Buka kaki selebar bahu dengan jari kaki sedikit mengarah keluar. Jaga kepala tetap tegak dan punggung lurus sebagai posisi awal.",
      "Tarik napas perlahan sambil menurunkan bar dengan menekuk lutut. Turun hingga sudut paha dan betis kurang dari 90 derajat (paha di bawah paralel lantai). Pastikan lutut tidak melebihi ujung jari kaki untuk mencegah cedera.",
      "Buang napas sambil mendorong lantai dengan tumit untuk kembali ke posisi berdiri tegak.",
      "Ulangi gerakan sesuai repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Atur tinggi bar sesuai tubuh Anda. Setelah beban terpasang, posisikan bahu bagian belakang (sedikit di bawah leher) di bawah bar.",
      "Genggam bar dengan kedua tangan (telapak menghadap depan), buka kunci, dan angkat dari rak dengan mendorong kaki sambil menegakkan tubuh.",
      "Buka kaki selebar bahu dengan jari kaki sedikit mengarah keluar. Jaga kepala tetap tegak dan punggung lurus sebagai posisi awal.",
      "Tarik napas perlahan sambil menurunkan bar dengan menekuk lutut. Turun hingga sudut paha dan betis kurang dari 90 derajat (paha di bawah paralel lantai). Pastikan lutut tidak melebihi ujung jari kaki untuk mencegah cedera.",
      "Buang napas sambil mendorong lantai dengan tumit untuk kembali ke posisi berdiri tegak.",
      "Ulangi gerakan sesuai repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "To begin, first set the bar on the height that best matches your height. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
      "Hold on to the bar using both arms at each side (palms facing forward), unlock it and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and also maintain a straight back. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance which targets overall development; however you can choose any of the three stances discussed in the foot stances section).",
      "Begin to slowly lower the bar by bending the knees as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
      "Begin to raise the bar as you exhale by pushing the floor with the heel of your foot as you straighten the legs again and go back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 109,
    "name": "Romanian Deadlift",
    "target": [
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6",
    "videoUrl": "/exercise-assets/edb-Romanian_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Romanian_Deadlift.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Romanian_Deadlift.webp",
    "gifUrl": "/exercise-assets/edb-Romanian_Deadlift.webp",
    "instructions": [
      "Posisikan barbel di depan kaki, pegang dengan telapak tangan menghadap ke bawah (pronated), sedikit lebih lebar dari bahu.",
      "Tekuk lutut sedikit, pastikan tulang kering vertikal, dorong pinggul ke belakang, dan jaga punggung tetap lurus. Ini posisi awal.",
      "Dengan punggung dan lengan tetap lurus, gunakan otot pinggul untuk mengangkat barbel sambil mengembuskan napas secara terkontrol.",
      "Saat posisi tegak, turunkan barbel dengan mendorong pinggul ke belakang. Tekuk lutut hanya sedikit, berbeda dengan gerakan squat. Jaga dada tetap membusung dan napas terkontrol.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Posisikan barbel di depan kaki, pegang dengan telapak tangan menghadap ke bawah (pronated), sedikit lebih lebar dari bahu.",
      "Tekuk lutut sedikit, pastikan tulang kering vertikal, dorong pinggul ke belakang, dan jaga punggung tetap lurus. Ini posisi awal.",
      "Dengan punggung dan lengan tetap lurus, gunakan otot pinggul untuk mengangkat barbel sambil mengembuskan napas secara terkontrol.",
      "Saat posisi tegak, turunkan barbel dengan mendorong pinggul ke belakang. Tekuk lutut hanya sedikit, berbeda dengan gerakan squat. Jaga dada tetap membusung dan napas terkontrol.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.",
      "Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.",
      "Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.",
      "Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 110,
    "name": "Dumbbell Walking Lunges",
    "target": [
      "Quads",
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "intermediate",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
    "instructions": [
      "Berdirilah dengan tegak sambil memegang dua dumbbell di samping tubuh. Ini adalah posisi awal Anda.",
      "Langkahkan kaki kanan ke depan sekitar 60 cm, turunkan tubuh sambil menjaga torso tetap tegak dan seimbang. Tarik napas saat turun. Pastikan lutut tidak melebihi jari kaki dan tulang kering depan tetap tegak lurus dengan lantai.",
      "Dorong tubuh kembali ke posisi awal menggunakan tumit kaki depan sambil membuang napas.",
      "Ulangi gerakan sesuai repetisi yang ditentukan, lalu lakukan dengan kaki kiri."
    ],
    "instructions_id": [
      "Berdirilah dengan tegak sambil memegang dua dumbbell di samping tubuh. Ini adalah posisi awal Anda.",
      "Langkahkan kaki kanan ke depan sekitar 60 cm, turunkan tubuh sambil menjaga torso tetap tegak dan seimbang. Tarik napas saat turun. Pastikan lutut tidak melebihi jari kaki dan tulang kering depan tetap tegak lurus dengan lantai.",
      "Dorong tubuh kembali ke posisi awal menggunakan tumit kaki depan sambil membuang napas.",
      "Ulangi gerakan sesuai repetisi yang ditentukan, lalu lakukan dengan kaki kiri."
    ],
    "instructions_en": [
      "Stand with your torso upright holding two dumbbells in your hands by your sides. This will be your starting position.",
      "Step forward with your right leg around 2 feet or so from the foot being left stationary behind and lower your upper body down, while keeping the torso upright and maintaining balance. Inhale as you go down. Note: As in the other exercises, do not allow your knee to go forward beyond your toes as you come down, as this will put undue stress on the knee joint. Make sure that you keep your front shin perpendicular to the ground.",
      "Using mainly the heel of your foot, push up and go back to the starting position as you exhale.",
      "Repeat the movement for the recommended amount of repetitions and then perform with the left leg."
    ]
  },
  {
    "id": 111,
    "name": "Rocking Standing Calf Raise",
    "target": [
      "Calves"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Barbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Rocking_Standing_Calf_Raise.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rocking_Standing_Calf_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rocking_Standing_Calf_Raise/0.jpg",
    "instructions": [
      "Gunakan squat rack untuk keamanan. Atur barbel setinggi bahu, lalu letakkan di punggung atas bawah leher.",
      "Pegang barbel dengan kedua tangan, angkat dari rack dengan mendorong kaki dan menegakkan tubuh.",
      "Melangkahlah menjauh, buka kaki selebar bahu dengan jari kaki sedikit menghadap ke luar. Pandangan ke depan, punggung tegak, dan lutut sedikit ditekuk (jangan dikunci). Ini posisi awal.",
      "Angkat tumit dengan mendorong pergelangan kaki setinggi mungkin sambil mengembuskan napas. Jaga lutut tetap diam dan sedikit menekuk. Tahan posisi kontraksi selama satu detik.",
      "Kembali ke posisi awal secara perlahan sambil menarik napas hingga otot betis terasa meregang.",
      "Angkat jari kaki dengan mengontraksikan otot kering (tibia) sambil mengembuskan napas.",
      "Tahan selama satu detik lalu turunkan kembali sambil menarik napas.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Gunakan squat rack untuk keamanan. Atur barbel setinggi bahu, lalu letakkan di punggung atas bawah leher.",
      "Pegang barbel dengan kedua tangan, angkat dari rack dengan mendorong kaki dan menegakkan tubuh.",
      "Melangkahlah menjauh, buka kaki selebar bahu dengan jari kaki sedikit menghadap ke luar. Pandangan ke depan, punggung tegak, dan lutut sedikit ditekuk (jangan dikunci). Ini posisi awal.",
      "Angkat tumit dengan mendorong pergelangan kaki setinggi mungkin sambil mengembuskan napas. Jaga lutut tetap diam dan sedikit menekuk. Tahan posisi kontraksi selama satu detik.",
      "Kembali ke posisi awal secara perlahan sambil menarik napas hingga otot betis terasa meregang.",
      "Angkat jari kaki dengan mengontraksikan otot kering (tibia) sambil mengembuskan napas.",
      "Tahan selama satu detik lalu turunkan kembali sambil menarik napas.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack that best matches your height. Once the correct height is chosen and the bar is loaded, step under the bar and place it on the back of your shoulders (slightly below the neck).",
      "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times as looking down will get you off balance. Also maintain a straight back and keep the knees with a slight bend; never locked. This will be your starting position.",
      "Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending (other than the slight initial bend we created during positioning) at any time. Hold the contracted position by a second before you start to go back down.",
      "Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.",
      "Now lift your toes by contracting the tibia muscles in the front of the calves as you breathe out.",
      "Hold for a second and bring them back down as you breathe in.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 112,
    "name": "Cable Crunch",
    "target": [
      "Core"
    ],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Cable_Crunch.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg",
    "instructions": [
      "Berlututlah di bawah katrol tinggi yang dipasangi tali (rope attachment).",
      "Pegang tali katrol dan tarik ke bawah hingga tangan Anda berada di samping wajah.",
      "Tekuk sedikit pinggul Anda dan biarkan beban membuat punggung bawah sedikit melengkung (hiperekstensi). Ini adalah posisi awal Anda.",
      "Jaga pinggul tetap diam, tekuk pinggang saat mengontraksikan otot perut sehingga siku bergerak ke arah tengah paha. Hembuskan napas saat melakukan gerakan ini dan tahan kontraksi selama satu detik.",
      "Kembali ke posisi awal secara perlahan sambil menarik napas. Tips: Pastikan otot perut Anda tetap tegang sepanjang gerakan. Selain itu, jangan memilih beban yang terlalu berat agar punggung bawah tidak menanggung beban utama.",
      "Ulangi sesuai jumlah repetisi yang direkomendasikan."
    ],
    "instructions_id": [
      "Berlututlah di bawah katrol tinggi yang dipasangi tali (rope attachment).",
      "Pegang tali katrol dan tarik ke bawah hingga tangan Anda berada di samping wajah.",
      "Tekuk sedikit pinggul Anda dan biarkan beban membuat punggung bawah sedikit melengkung (hiperekstensi). Ini adalah posisi awal Anda.",
      "Jaga pinggul tetap diam, tekuk pinggang saat mengontraksikan otot perut sehingga siku bergerak ke arah tengah paha. Hembuskan napas saat melakukan gerakan ini dan tahan kontraksi selama satu detik.",
      "Kembali ke posisi awal secara perlahan sambil menarik napas. Tips: Pastikan otot perut Anda tetap tegang sepanjang gerakan. Selain itu, jangan memilih beban yang terlalu berat agar punggung bawah tidak menanggung beban utama.",
      "Ulangi sesuai jumlah repetisi yang direkomendasikan."
    ],
    "instructions_en": [
      "Kneel below a high pulley that contains a rope attachment.",
      "Grasp cable rope attachment and lower the rope until your hands are placed next to your face.",
      "Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.",
      "With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.",
      "Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 113,
    "name": "Wide-Grip Lat Pulldown",
    "target": [
      "Lats",
      "Biceps"
    ],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf",
    "videoUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.mp4 /exercise-assets/youtube-backup/edb-Wide-Grip_Lat_Pulldown.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.webp",
    "gifUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.webp",
    "instructions": [
      "Duduklah pada mesin lat pulldown yang dilengkapi bar panjang pada katrol atas. Sesuaikan bantalan lutut mesin dengan tinggi badan Anda agar tubuh tidak terangkat oleh beban.",
      "Genggam bar dengan telapak tangan menghadap ke depan sesuai lebar genggaman yang ditentukan. Catatan: Untuk genggaman lebar, letakkan tangan lebih lebar dari bahu. Untuk genggaman sedang, selebar bahu. Untuk genggaman sempit, lebih sempit dari lebar bahu.",
      "Dengan kedua lengan lurus memegang bar, condongkan torso ke belakang sekitar 30 derajat sambil melengkungkan sedikit bagian bawah punggung dan membusungkan dada. Ini adalah posisi awal Anda.",
      "Buang napas dan tarik bar ke bawah hingga menyentuh dada atas dengan menggerakkan bahu serta lengan atas ke bawah dan ke belakang. Tips: Fokuskan pada kontraksi otot punggung saat mencapai titik kontraksi penuh. Torso atas harus tetap diam dan hanya lengan yang bergerak. Lengan bawah hanya berfungsi sebagai pengait bar, jadi jangan menarik bar menggunakan tenaga lengan bawah.",
      "Setelah menahan selama satu detik pada posisi kontraksi dengan merapatkan belikat, perlahan angkat kembali bar ke posisi awal hingga lengan lurus penuh dan otot latissimus merenggang maksimal. Tarik napas selama fase ini.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang ditentukan."
    ],
    "instructions_id": [
      "Duduklah pada mesin lat pulldown yang dilengkapi bar panjang pada katrol atas. Sesuaikan bantalan lutut mesin dengan tinggi badan Anda agar tubuh tidak terangkat oleh beban.",
      "Genggam bar dengan telapak tangan menghadap ke depan sesuai lebar genggaman yang ditentukan. Catatan: Untuk genggaman lebar, letakkan tangan lebih lebar dari bahu. Untuk genggaman sedang, selebar bahu. Untuk genggaman sempit, lebih sempit dari lebar bahu.",
      "Dengan kedua lengan lurus memegang bar, condongkan torso ke belakang sekitar 30 derajat sambil melengkungkan sedikit bagian bawah punggung dan membusungkan dada. Ini adalah posisi awal Anda.",
      "Buang napas dan tarik bar ke bawah hingga menyentuh dada atas dengan menggerakkan bahu serta lengan atas ke bawah dan ke belakang. Tips: Fokuskan pada kontraksi otot punggung saat mencapai titik kontraksi penuh. Torso atas harus tetap diam dan hanya lengan yang bergerak. Lengan bawah hanya berfungsi sebagai pengait bar, jadi jangan menarik bar menggunakan tenaga lengan bawah.",
      "Setelah menahan selama satu detik pada posisi kontraksi dengan merapatkan belikat, perlahan angkat kembali bar ke posisi awal hingga lengan lurus penuh dan otot latissimus merenggang maksimal. Tarik napas selama fase ini.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang ditentukan."
    ],
    "instructions_en": [
      "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
      "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the bar; therefore do not try to pull down the bar using the forearms.",
      "After a second at the contracted position squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
      "Repeat this motion for the prescribed amount of repetitions."
    ]
  },
  {
    "id": 114,
    "name": "Dumbbell Shoulder Press",
    "target": [
      "Deltoid Depan",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Shoulder_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.webp",
    "instructions": [
      "Duduk di bangku dengan sandaran punggung. Pegang dumbbell dan letakkan di atas paha.",
      "Angkat dumbbell ke bahu satu per satu dengan bantuan dorongan paha.",
      "Putar pergelangan tangan hingga telapak tangan menghadap ke depan.",
      "Hembuskan napas, dorong dumbbell ke atas hingga hampir bersentuhan.",
      "Tahan sejenak, lalu tarik napas sambil menurunkan dumbbell secara perlahan ke posisi awal.",
      "Ulangi sesuai repetisi yang ditentukan."
    ],
    "instructions_id": [
      "Duduk di bangku dengan sandaran punggung. Pegang dumbbell dan letakkan di atas paha.",
      "Angkat dumbbell ke bahu satu per satu dengan bantuan dorongan paha.",
      "Putar pergelangan tangan hingga telapak tangan menghadap ke depan.",
      "Hembuskan napas, dorong dumbbell ke atas hingga hampir bersentuhan.",
      "Tahan sejenak, lalu tarik napas sambil menurunkan dumbbell secara perlahan ke posisi awal.",
      "Ulangi sesuai repetisi yang ditentukan."
    ],
    "instructions_en": [
      "While holding a dumbbell in each hand, sit on a military press bench or utility bench that has back support. Place the dumbbells upright on top of your thighs.",
      "Now raise the dumbbells to shoulder height one at a time using your thighs to help propel them up into position.",
      "Make sure to rotate your wrists so that the palms of your hands are facing forward. This is your starting position.",
      "Now, exhale and push the dumbbells upward until they touch at the top.",
      "Then, after a brief pause at the top contracted position, slowly lower the weights back down to the starting position while inhaling.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 124,
    "name": "Dumbbell Shrug",
    "target": [
      "Traps",
      "Leher"
    ],
    "type": "weight",
    "defaultWeight": 15,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Dumbbell_Shrug.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "instructions": [
      "Berdiri tegak dengan dumbbell di masing-masing tangan (telapak menghadap tubuh), lengan lurus di samping.",
      "Hembuskan napas, angkat bahu setinggi mungkin. Tahan kontraksi selama satu detik. Pastikan lengan tetap lurus dan tidak menggunakan otot bisep.",
      "Turunkan kembali dumbbell ke posisi semula.",
      "Ulangi sesuai repetisi yang ditentukan."
    ],
    "instructions_id": [
      "Berdiri tegak dengan dumbbell di masing-masing tangan (telapak menghadap tubuh), lengan lurus di samping.",
      "Hembuskan napas, angkat bahu setinggi mungkin. Tahan kontraksi selama satu detik. Pastikan lengan tetap lurus dan tidak menggunakan otot bisep.",
      "Turunkan kembali dumbbell ke posisi semula.",
      "Ulangi sesuai repetisi yang ditentukan."
    ],
    "instructions_en": [
      "Stand erect with a dumbbell on each hand (palms facing your torso), arms extended on the sides.",
      "Lift the dumbbells by elevating the shoulders as high as possible while you exhale. Hold the contraction at the top for a second. Tip: The arms should remain extended at all times. Refrain from using the biceps to help lift the dumbbells. Only the shoulders should be moving up and down.",
      "Lower the dumbbells back to the original position.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 115,
    "name": "Smith Machine Bench Press",
    "target": [
      "Dada Tengah",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 7.5,
    "equipment": "Smith Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.webp",
    "instructions": [
      "Letakkan bangku datar di bawah Smith Machine. Atur ketinggian palang agar dapat dijangkau saat berbaring dengan lengan hampir lurus. Berbaringlah, pegang palang dengan genggaman pronasi lebih lebar dari bahu, buka kunci palang, dan tahan lurus di atas dada dengan lengan terkunci sebagai posisi awal.",
      "Tarik napas dan turunkan palang perlahan hingga menyentuh dada bagian tengah.",
      "Setelah jeda satu detik, dorong palang kembali ke posisi awal sambil mengembuskan napas, gunakan otot dada. Kunci lengan di posisi atas, tahan sedetik, lalu turunkan kembali perlahan (durasi turun sebaiknya dua kali lebih lama daripada saat naik).",
      "Ulangi gerakan sesuai target repetisi.",
      "Kunci kembali palang pada rak setelah selesai."
    ],
    "instructions_id": [
      "Letakkan bangku datar di bawah Smith Machine. Atur ketinggian palang agar dapat dijangkau saat berbaring dengan lengan hampir lurus. Berbaringlah, pegang palang dengan genggaman pronasi lebih lebar dari bahu, buka kunci palang, dan tahan lurus di atas dada dengan lengan terkunci sebagai posisi awal.",
      "Tarik napas dan turunkan palang perlahan hingga menyentuh dada bagian tengah.",
      "Setelah jeda satu detik, dorong palang kembali ke posisi awal sambil mengembuskan napas, gunakan otot dada. Kunci lengan di posisi atas, tahan sedetik, lalu turunkan kembali perlahan (durasi turun sebaiknya dua kali lebih lama daripada saat naik).",
      "Ulangi gerakan sesuai target repetisi.",
      "Kunci kembali palang pada rak setelah selesai."
    ],
    "instructions_en": [
      "Place a flat bench underneath the smith machine. Now place the barbell at a height that you can reach when lying down and your arms are almost fully extended. Once the weight you need is selected, lie down on the flat bench. Using a pronated grip that is wider than shoulder width, unlock the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "As you breathe in, come down slowly until you feel the bar on your middle chest.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, lock the bar back in the rack."
    ]
  },
  {
    "id": 116,
    "name": "Cable Rear Delt Fly",
    "target": [
      "Deltoid Belakang"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Cable",
    "level": "advanced",
    "ytVideo": "https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I",
    "videoUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly_1.mp4 /exercise-assets/edb-Cable_Rear_Delt_Fly_2.mp4 /exercise-assets/youtube-backup/edb-Cable_Rear_Delt_Fly_1.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp",
    "gifUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp",
    "instructions": [
      "Atur tinggi pulley sedikit di atas kepala dan sesuaikan beban.",
      "Pegang pulley kiri dengan tangan kanan dan pulley kanan dengan tangan kiri, sehingga kabel menyilang di depan dada. Ini posisi awal Anda.",
      "Gerakkan kedua lengan ke arah belakang dan luar, jaga lengan tetap lurus selama gerakan.",
      "Tahan sejenak di titik akhir gerakan sebelum kembali ke posisi awal."
    ],
    "instructions_id": [
      "Atur tinggi pulley sedikit di atas kepala dan sesuaikan beban.",
      "Pegang pulley kiri dengan tangan kanan dan pulley kanan dengan tangan kiri, sehingga kabel menyilang di depan dada. Ini posisi awal Anda.",
      "Gerakkan kedua lengan ke arah belakang dan luar, jaga lengan tetap lurus selama gerakan.",
      "Tahan sejenak di titik akhir gerakan sebelum kembali ke posisi awal."
    ],
    "instructions_en": [
      "Adjust the pulleys to the appropriate height and adjust the weight. The pulleys should be above your head.",
      "Grab the left pulley with your right hand and the right pulley with your left hand, crossing them in front of you. This will be your starting position.",
      "Initiate the movement by moving your arms back and outward, keeping your arms straight as you execute the movement.",
      "Pause at the end of the motion before returning the handles to the start position."
    ]
  },
  {
    "id": 117,
    "name": "Cable Rope Overhead Triceps Extension",
    "target": [
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_",
    "videoUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.mp4 /exercise-assets/youtube-backup/edb-Cable_Rope_Overhead_Triceps_Extension.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.webp",
    "gifUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.webp",
    "instructions": [
      "Pasang aksesori tali (rope attachment) pada katrol bawah mesin kabel.",
      "Pegang tali dengan kedua tangan, lalu luruskan lengan hingga posisi tangan berada tepat di atas kepala menggunakan genggaman netral (telapak tangan saling berhadapan). Jaga siku tetap dekat dengan kepala dan lengan tegak lurus dengan lantai dengan buku jari menghadap ke atas. Ini adalah posisi awal Anda.",
      "Turunkan tali secara perlahan ke belakang kepala sambil menjaga lengan atas tetap diam. Tarik napas saat melakukan gerakan ini dan tahan sejenak saat otot trisep teregang sepenuhnya.",
      "Kembali ke posisi awal dengan mengontraksikan otot trisep sambil mengembuskan napas.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Pasang aksesori tali (rope attachment) pada katrol bawah mesin kabel.",
      "Pegang tali dengan kedua tangan, lalu luruskan lengan hingga posisi tangan berada tepat di atas kepala menggunakan genggaman netral (telapak tangan saling berhadapan). Jaga siku tetap dekat dengan kepala dan lengan tegak lurus dengan lantai dengan buku jari menghadap ke atas. Ini adalah posisi awal Anda.",
      "Turunkan tali secara perlahan ke belakang kepala sambil menjaga lengan atas tetap diam. Tarik napas saat melakukan gerakan ini dan tahan sejenak saat otot trisep teregang sepenuhnya.",
      "Kembali ke posisi awal dengan mengontraksikan otot trisep sambil mengembuskan napas.",
      "Ulangi gerakan ini sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Attach a rope to the bottom pulley of the pulley machine.",
      "Grasping the rope with both hands, extend your arms with your hands directly above your head using a neutral grip (palms facing each other). Your elbows should be in close to your head and the arms should be perpendicular to the floor with the knuckles aimed at the ceiling. This will be your starting position.",
      "Slowly lower the rope behind your head as you hold the upper arms stationary. Inhale as you perform this movement and pause when your triceps are fully stretched.",
      "Return to the starting position by flexing your triceps as you breathe out.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 118,
    "name": "Standing Biceps Cable Curl",
    "target": [
      "Biceps"
    ],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj",
    "videoUrl": "/exercise-assets/youtube-backup/edb-High_Cable_Curls.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg",
    "instructions": [
      "Berdirilah tegak sambil memegang stang bar cable curl yang terhubung ke katrol bawah. Genggam pegangan selebar bahu dan jaga siku tetap dekat dengan tubuh. Telapak tangan menghadap ke atas (supinasi). Ini adalah posisi awal Anda.",
      "Jaga lengan atas tetap diam dan bahu tetap rileks (hindari mengangkat bahu/traps — inilah mengapa video panduan memberi tanda peringatan merah pada area traps agar bahu tidak terangkat). Angkat beban sambil mengontraksikan otot bisep dan embuskan napas. Hanya lengan bawah yang bergerak hingga bar berada setinggi dada atau bahu. Tahan posisi puncak kontraksi sejenak sambil meremas otot bisep.",
      "Perlahan turunkan kembali bar ke posisi awal secara terkontrol sambil menarik napas.",
      "Ulangi sesuai dengan jumlah repetisi yang direkomendasikan."
    ],
    "instructions_id": [
      "Berdirilah tegak sambil memegang stang bar cable curl yang terhubung ke katrol bawah. Genggam pegangan selebar bahu dan jaga siku tetap dekat dengan tubuh. Telapak tangan menghadap ke atas (supinasi). Ini adalah posisi awal Anda.",
      "Jaga lengan atas tetap diam dan bahu tetap rileks (hindari mengangkat bahu/traps — inilah mengapa video panduan memberi tanda peringatan merah pada area traps agar bahu tidak terangkat). Angkat beban sambil mengontraksikan otot bisep dan embuskan napas. Hanya lengan bawah yang bergerak hingga bar berada setinggi dada atau bahu. Tahan posisi puncak kontraksi sejenak sambil meremas otot bisep.",
      "Perlahan turunkan kembali bar ke posisi awal secara terkontrol sambil menarik napas.",
      "Ulangi sesuai dengan jumlah repetisi yang direkomendasikan."
    ],
    "instructions_en": [
      "Stand up with your torso upright while holding a cable curl bar that is attached to a low pulley. Grab the cable bar at shoulder width and keep the elbows close to the torso. The palm of your hands should be facing up (supinated grip). This will be your starting position.",
      "While holding the upper arms stationary, curl the weights while contracting the biceps as you breathe out. Only the forearms should move. Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second as you squeeze the muscle.",
      "Slowly begin to bring the curl bar back to starting position as your breathe in.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 119,
    "name": "Split Squat with Dumbbells",
    "target": [
      "Quads",
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Dumbbell",
    "level": "advanced",
    "ytVideo": "https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn",
    "videoUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.mp4 /exercise-assets/youtube-backup/edb-Split_Squat_with_Dumbbells.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.webp",
    "gifUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.webp",
    "instructions": [
      "Ambil posisi melangkah dengan kaki belakang diletakkan di atas tumpuan dan kaki depan menapak di lantai.",
      "Pegang dumbbell di masing-masing tangan dengan posisi lengan tergantung di samping tubuh.",
      "Turunkan tubuh dengan menekuk lutut dan pinggul depan. Jaga postur tetap tegak dan pastikan lutut depan tetap sejajar dengan kaki.",
      "Dorong melalui tumit kaki depan untuk meluruskan lutut dan pinggul hingga kembali ke posisi berdiri."
    ],
    "instructions_id": [
      "Ambil posisi melangkah dengan kaki belakang diletakkan di atas tumpuan dan kaki depan menapak di lantai.",
      "Pegang dumbbell di masing-masing tangan dengan posisi lengan tergantung di samping tubuh.",
      "Turunkan tubuh dengan menekuk lutut dan pinggul depan. Jaga postur tetap tegak dan pastikan lutut depan tetap sejajar dengan kaki.",
      "Dorong melalui tumit kaki depan untuk meluruskan lutut dan pinggul hingga kembali ke posisi berdiri."
    ],
    "instructions_en": [
      "Position yourself into a staggered stance with the rear foot elevated and front foot forward.",
      "Hold a dumbbell in each hand, letting them hang at the sides. This will be your starting position.",
      "Begin by descending, flexing your knee and hip to lower your body down. Maintain good posture througout the movement. Keep the front knee in line with the foot as you perform the exercise.",
      "At the bottom of the movement, drive through the heel to extend the knee and hip to return to the starting position."
    ]
  },
  {
    "id": 120,
    "name": "Smith Machine Romanian Deadlift",
    "target": [
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Smith Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Romanian_Deadlift.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.webp",
    "instructions": [
      "Atur tinggi bar Smith Machine setinggi pertengahan paha. Genggam bar dengan pegangan pronasi (telapak menghadap depan) selebar bahu.",
      "Angkat bar dengan meluruskan lengan sepenuhnya, punggung tetap lurus. Berdiri tegak dengan kaki selebar bahu dan lutut sedikit ditekuk sebagai posisi awal.",
      "Buang napas, turunkan bar ke arah punggung kaki dengan menekuk pinggang tanpa menggerakkan lutut. Jaga punggung tetap lurus hingga otot hamstring terasa teregang.",
      "Tarik napas, segera kembali ke posisi tegak dengan mendorong pinggul dan pinggang ke depan.",
      "Ulangi gerakan sesuai repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Atur tinggi bar Smith Machine setinggi pertengahan paha. Genggam bar dengan pegangan pronasi (telapak menghadap depan) selebar bahu.",
      "Angkat bar dengan meluruskan lengan sepenuhnya, punggung tetap lurus. Berdiri tegak dengan kaki selebar bahu dan lutut sedikit ditekuk sebagai posisi awal.",
      "Buang napas, turunkan bar ke arah punggung kaki dengan menekuk pinggang tanpa menggerakkan lutut. Jaga punggung tetap lurus hingga otot hamstring terasa teregang.",
      "Tarik napas, segera kembali ke posisi tegak dengan mendorong pinggul dan pinggang ke depan.",
      "Ulangi gerakan sesuai repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "To begin, set the bar on the smith machine to a height that is around the middle of your thighs. Once the correct height is chosen and the bar is loaded, grasp the bar using a pronated (palms forward) grip that is shoulder width apart. You may need some wrist wraps if using a significant amount of weight.",
      "Lift the bar up by fully extending your arms while keeping your back straight. Stand with your torso straight and your legs spaced using a shoulder width or narrower stance. The knees should be slightly bent. This is your starting position.",
      "Keeping the knees stationary, lower the barbell to over the top of your feet by bending at the waist while keeping your back straight. Keep moving forward as if you were going to pick something from the floor until you feel a stretch on the hamstrings. Exhale as you perform this movement",
      "Start bringing your torso up straight again as soon as you feel the hamstrings stretch by extending your hips and waist until you are back at the starting position. Inhale as you perform this movement.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 121,
    "name": "Cable Hip Abduction",
    "target": [
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 15,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "",
    "gifUrl": "",
    "instructions": [
      "Pasang ankle strap pada katrol kabel bawah (low cable pulley), lalu kaitkan pada pergelangan kaki luar Anda.",
      "Berdiri menyamping dari mesin kabel dengan jarak sekitar satu langkah, pegang tiang mesin dengan satu tangan untuk keseimbangan tubuh.",
      "Jaga tubuh tetap tegak dan kaki tumpuan sedikit ditekuk. Angkat dan ayunkan kaki yang aktif ke arah samping luar menjauhi tubuh sejauh yang Anda rasa nyaman.",
      "Tahan dan kontraksikan otot bokong samping (glute medius) selama satu detik di puncak gerakan, lalu turunkan kembali kaki secara perlahan ke posisi awal.",
      "Ulangi sesuai jumlah repetisi yang ditentukan, kemudian ganti ke kaki sisi lainnya."
    ],
    "instructions_id": [
      "Pasang ankle strap pada katrol kabel bawah (low cable pulley), lalu kaitkan pada pergelangan kaki luar Anda.",
      "Berdiri menyamping dari mesin kabel dengan jarak sekitar satu langkah, pegang tiang mesin dengan satu tangan untuk keseimbangan tubuh.",
      "Jaga tubuh tetap tegak dan kaki tumpuan sedikit ditekuk. Angkat dan ayunkan kaki yang aktif ke arah samping luar menjauhi tubuh sejauh yang Anda rasa nyaman.",
      "Tahan dan kontraksikan otot bokong samping (glute medius) selama satu detik di puncak gerakan, lalu turunkan kembali kaki secara perlahan ke posisi awal.",
      "Ulangi sesuai jumlah repetisi yang ditentukan, kemudian ganti ke kaki sisi lainnya."
    ],
    "instructions_en": [
      "Attach an ankle cuff to a low cable pulley and fasten it around your outside ankle.",
      "Stand sideways to the cable machine, holding onto the frame for stability.",
      "Keep your torso upright and your supporting leg slightly bent. Abduct your active leg out to the side away from your body as high as comfortably possible.",
      "Pause and squeeze your glutes at the top for a second, then slowly return to the starting position.",
      "Repeat for the recommended repetitions, then switch legs."
    ]
  },
  {
    "id": 122,
    "name": "Seated Calf Raise",
    "target": [
      "Calves"
    ],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Seated_Calf_Raise.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
    "instructions": [
      "Duduklah pada mesin dan tempatkan ujung kaki pada bagian bawah platform dengan tumit menggantung. Pilih arah hadap ujung kaki Anda (lurus ke depan, ke dalam, atau ke luar) sesuai kenyamanan.",
      "Posisikan paha bagian bawah di bawah bantalan tuas, sesuaikan dengan tinggi paha Anda. Letakkan tangan di atas bantalan tuas untuk mencegahnya bergeser ke depan.",
      "Angkat tuas sedikit dengan mendorong tumit ke atas, lalu lepas tuas pengaman. Ini adalah posisi awal Anda.",
      "Turunkan tumit secara perlahan dengan menekuk pergelangan kaki hingga otot betis teregang sepenuhnya. Tarik napas saat melakukan gerakan ini.",
      "Angkat tumit setinggi mungkin dengan meluruskan pergelangan kaki sembari mengontraksikan betis dan mengembuskan napas. Tahan kontraksi di posisi atas selama satu detik.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Duduklah pada mesin dan tempatkan ujung kaki pada bagian bawah platform dengan tumit menggantung. Pilih arah hadap ujung kaki Anda (lurus ke depan, ke dalam, atau ke luar) sesuai kenyamanan.",
      "Posisikan paha bagian bawah di bawah bantalan tuas, sesuaikan dengan tinggi paha Anda. Letakkan tangan di atas bantalan tuas untuk mencegahnya bergeser ke depan.",
      "Angkat tuas sedikit dengan mendorong tumit ke atas, lalu lepas tuas pengaman. Ini adalah posisi awal Anda.",
      "Turunkan tumit secara perlahan dengan menekuk pergelangan kaki hingga otot betis teregang sepenuhnya. Tarik napas saat melakukan gerakan ini.",
      "Angkat tumit setinggi mungkin dengan meluruskan pergelangan kaki sembari mengontraksikan betis dan mengembuskan napas. Tahan kontraksi di posisi atas selama satu detik.",
      "Ulangi gerakan sesuai jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Sit on the machine and place your toes on the lower portion of the platform provided with the heels extending off. Choose the toe positioning of your choice (forward, in, or out) as per the beginning of this chapter.",
      "Place your lower thighs under the lever pad, which will need to be adjusted according to the height of your thighs. Now place your hands on top of the lever pad in order to prevent it from slipping forward.",
      "Lift the lever slightly by pushing your heels up and release the safety bar. This will be your starting position.",
      "Slowly lower your heels by bending at the ankles until the calves are fully stretched. Inhale as you perform this movement.",
      "Raise the heels by extending the ankles as high as possible as you contract the calves and breathe out. Hold the top contraction for a second.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 123,
    "name": "Plank",
    "target": [
      "Core"
    ],
    "type": "time",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Plank.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "instructions": [
      "Ambil posisi telungkup di lantai, topang berat badan dengan jari kaki dan lengan bawah. Siku ditekuk tepat di bawah bahu.",
      "Jaga tubuh tetap lurus setiap saat dan tahan posisi ini selama mungkin. Untuk meningkatkan kesulitan, angkat satu tangan atau kaki."
    ],
    "instructions_id": [
      "Ambil posisi telungkup di lantai, topang berat badan dengan jari kaki dan lengan bawah. Siku ditekuk tepat di bawah bahu.",
      "Jaga tubuh tetap lurus setiap saat dan tahan posisi ini selama mungkin. Untuk meningkatkan kesulitan, angkat satu tangan atau kaki."
    ],
    "instructions_en": [
      "Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.",
      "Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised."
    ]
  },
  {
    "id": 125,
    "name": "Palms-Up Dumbbell Wrist Curl Over A Bench",
    "target": [
      "Forearm"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg",
    "instructions": [
      "Letakkan dua dumbel di sisi bangku datar.",
      "Berlututlah dengan kedua kaki menghadap ke arah bangku.",
      "Genggam kedua dumbel dengan telapak tangan menghadap ke atas (supinasi), lalu letakkan lengan bawah di atas bangku dengan pergelangan tangan menggantung di tepi bangku.",
      "Angkat pergelangan tangan ke atas sambil mengembuskan napas.",
      "Turunkan pergelangan tangan kembali ke posisi awal secara perlahan sambil menarik napas.",
      "Pastikan lengan bawah tetap diam dan hanya pergelangan tangan yang bergerak.",
      "Ulangi sebanyak repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Letakkan dua dumbel di sisi bangku datar.",
      "Berlututlah dengan kedua kaki menghadap ke arah bangku.",
      "Genggam kedua dumbel dengan telapak tangan menghadap ke atas (supinasi), lalu letakkan lengan bawah di atas bangku dengan pergelangan tangan menggantung di tepi bangku.",
      "Angkat pergelangan tangan ke atas sambil mengembuskan napas.",
      "Turunkan pergelangan tangan kembali ke posisi awal secara perlahan sambil menarik napas.",
      "Pastikan lengan bawah tetap diam dan hanya pergelangan tangan yang bergerak.",
      "Ulangi sebanyak repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Start out by placing two dumbbells on one side of a flat bench.",
      "Kneel down on both of your knees so that your body is facing the flat bench.",
      "Use your arms to grab both of the dumbbells with a supinated grip (palms up) and bring them up so that your forearms are resting against the flat bench. Your wrists should be hanging over the edge.",
      "Start out by curling your wrist upwards and exhaling.",
      "Slowly lower your wrists back down to the starting position while inhaling. Make sure to inhale during this part of the exercise.",
      "Your forearms should be stationary as your wrist is the only movement needed to perform this exercise.",
      "Repeat for the recommended amount of repetitions."
    ]
  },
  {
    "id": 126,
    "name": "Treadmill",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Treadmill",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Naik ke treadmill, pasang safety clip pengaman pada pakaian, dan mulai dengan kecepatan jalan santai 3–4 km/jam untuk pemanasan.",
      "Tingkatkan kecepatan ke target joging atau lari secara bertahap saat tubuh sudah siap.",
      "Pertahankan postur tegak, pandangan lurus ke depan, ayunkan lengan rileks dari bahu, dan hindari bertumpu pada pegangan tangan.",
      "Daratkan kaki dengan lembut pada bagian tengah telapak (midfoot) tepat di bawah pusat gravitasi tubuh dengan langkah ringan berirama.",
      "Turunkan kecepatan secara bertahap selama 2 menit untuk pendinginan sebelum menekan tombol berhenti."
    ],
    "instructions_id": [
      "Naik ke treadmill, pasang safety clip pengaman pada pakaian, dan mulai dengan kecepatan jalan santai 3–4 km/jam untuk pemanasan.",
      "Tingkatkan kecepatan ke target joging atau lari secara bertahap saat tubuh sudah siap.",
      "Pertahankan postur tegak, pandangan lurus ke depan, ayunkan lengan rileks dari bahu, dan hindari bertumpu pada pegangan tangan.",
      "Daratkan kaki dengan lembut pada bagian tengah telapak (midfoot) tepat di bawah pusat gravitasi tubuh dengan langkah ringan berirama.",
      "Turunkan kecepatan secara bertahap selama 2 menit untuk pendinginan sebelum menekan tombol berhenti."
    ],
    "instructions_en": [
      "Step onto the treadmill, attach the safety key to your clothing, and start at an easy walking pace (3–4 km/h) to warm up.",
      "Gradually increase the belt speed to your target jogging or running pace as your muscles warm up.",
      "Keep your torso tall, look straight ahead, swing arms naturally from the shoulders, and avoid leaning on the handrails.",
      "Land softly on your midfoot directly underneath your hips with light, rhythmic strides.",
      "Gradually reduce the speed for 2 minutes to cool down before pressing stop."
    ]
  },
  {
    "id": 127,
    "name": "Stationary Bike",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Stationary Bike",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Sesuaikan tinggi sadel agar sejajar tulang pinggul; saat pedal di titik terendah, lutut harus sedikit tertekuk (sekitar 25-30 derajat).",
      "Duduk dengan nyaman, letakkan bantalan depan kaki pada pedal dan kencangkan tali pengikat jika tersedia.",
      "Jaga punggung lurus dan bahu rileks, pegang stang tanpa mencengkeram terlalu kencang.",
      "Kayuh pedal dengan putaran memutar yang halus dan konsisten, dorong ke bawah dan tarik ke atas secara seimbang.",
      "Atur resistensi beban kayuhan sesuai target latihan dan bernapaslah secara teratur sepanjang sesi."
    ],
    "instructions_id": [
      "Sesuaikan tinggi sadel agar sejajar tulang pinggul; saat pedal di titik terendah, lutut harus sedikit tertekuk (sekitar 25-30 derajat).",
      "Duduk dengan nyaman, letakkan bantalan depan kaki pada pedal dan kencangkan tali pengikat jika tersedia.",
      "Jaga punggung lurus dan bahu rileks, pegang stang tanpa mencengkeram terlalu kencang.",
      "Kayuh pedal dengan putaran memutar yang halus dan konsisten, dorong ke bawah dan tarik ke atas secara seimbang.",
      "Atur resistensi beban kayuhan sesuai target latihan dan bernapaslah secara teratur sepanjang sesi."
    ],
    "instructions_en": [
      "Adjust saddle height level with your hip bone; at the bottom of the pedal stroke, your knee should have a slight bend (25–30 degrees).",
      "Sit comfortably, place the balls of your feet on the pedals, and secure the straps.",
      "Maintain a neutral spine, relaxed shoulders, and a light grip on the handlebars.",
      "Pedal in smooth, controlled continuous circles, pushing down and pulling up evenly.",
      "Adjust resistance to your target workout intensity and breathe rhythmically throughout."
    ]
  },
  {
    "id": 128,
    "name": "Aerobic",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 20,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Gunakan pakaian dan sepatu olahraga yang nyaman dengan bantalan peredam benturan yang baik.",
      "Mulai dengan gerakan langkah ringan di tempat atau side-to-side tap untuk menaikkan suhu tubuh.",
      "Ikuti gerakan aerobik berirama dengan menggerakkan lengan dan kaki secara terkoordinasi.",
      "Jaga otot inti (core) tetap aktif untuk menjaga keseimbangan dinamis dan melindungi tulang belakang.",
      "Akhiri sesi dengan peregangan statis pada otot kaki, betis, dan paha setelah pendinginan ringan."
    ],
    "instructions_id": [
      "Gunakan pakaian dan sepatu olahraga yang nyaman dengan bantalan peredam benturan yang baik.",
      "Mulai dengan gerakan langkah ringan di tempat atau side-to-side tap untuk menaikkan suhu tubuh.",
      "Ikuti gerakan aerobik berirama dengan menggerakkan lengan dan kaki secara terkoordinasi.",
      "Jaga otot inti (core) tetap aktif untuk menjaga keseimbangan dinamis dan melindungi tulang belakang.",
      "Akhiri sesi dengan peregangan statis pada otot kaki, betis, dan paha setelah pendinginan ringan."
    ],
    "instructions_en": [
      "Wear supportive workout shoes and comfortable attire suitable for continuous movement.",
      "Begin with gentle steps in place or side-to-side taps to raise your core body temperature.",
      "Perform rhythmic aerobic movements with coordinated arm and leg motions.",
      "Keep your core engaged to protect your lower back and maintain dynamic balance.",
      "Conclude with light cool-down walking followed by static stretches for the legs and hips."
    ]
  },
  {
    "id": 129,
    "name": "HIIT",
    "target": [
      "Cardio",
      "Core"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Body Weight",
    "level": "advanced",
    "ytVideo": "",
    "instructions": [
      "Awali dengan pemanasan dinamis menyeluruh selama 3–5 menit untuk mempersiapkan otot dan sistem kardiovaskular.",
      "Lakukan interval kerja intensitas tinggi (all-out effort atau 85–95% kapasitas maksimal) selama durasi target (misal: 20–30 detik).",
      "Pertahankan form dan teknik gerakan yang presisi meskipun detak jantung dan kelelahan meningkat.",
      "Manfaatkan interval istirahat (misal: 30–60 detik) untuk mengatur napas dalam-dalam dan memulihkan tenaga.",
      "Ulangi siklus kerja-istirahat sesuai jumlah ronde yang direncanakan, lalu lakukan pendinginan menyeluruh."
    ],
    "instructions_id": [
      "Awali dengan pemanasan dinamis menyeluruh selama 3–5 menit untuk mempersiapkan otot dan sistem kardiovaskular.",
      "Lakukan interval kerja intensitas tinggi (all-out effort atau 85–95% kapasitas maksimal) selama durasi target (misal: 20–30 detik).",
      "Pertahankan form dan teknik gerakan yang presisi meskipun detak jantung dan kelelahan meningkat.",
      "Manfaatkan interval istirahat (misal: 30–60 detik) untuk mengatur napas dalam-dalam dan memulihkan tenaga.",
      "Ulangi siklus kerja-istirahat sesuai jumlah ronde yang direncanakan, lalu lakukan pendinginan menyeluruh."
    ],
    "instructions_en": [
      "Warm up thoroughly with dynamic stretches for 3–5 minutes before beginning high-intensity intervals.",
      "Perform the work interval at high intensity (85–95% maximum effort) for the assigned duration (e.g., 20–30 seconds).",
      "Prioritize clean form and controlled body mechanics even as fatigue sets in.",
      "Use the recovery intervals (e.g., 30–60 seconds) to take deep breaths and lower your heart rate.",
      "Complete the designated number of rounds, followed by an active cool-down."
    ]
  },
  {
    "id": 130,
    "name": "Pilates",
    "target": [
      "Core"
    ],
    "type": "time",
    "defaultWeight": 0,
    "duration": 1200,
    "equipment": "Body Weight",
    "level": "intermediate",
    "ytVideo": "",
    "instructions": [
      "Gelar matras di permukaan rata dan ambil posisi awal yang rileks dengan tulang belakang netral.",
      "Fokuskan pernapasan lateral (bernapas dalam melebar ke tulang rusuk, buang napas sambil menarik pusar ke arah tulang belakang).",
      "Aktifkan otot inti bagian dalam (powerhouse: transversus abdominis dan otot dasar panggul) pada setiap repetisi.",
      "Lakukan setiap gerakan secara perlahan, terarah, dan terkontrol tanpa menggunakan momentum tubuh.",
      "Jaga leher, rahang, dan bahu tetap bebas dari ketegangan selama transisi antar gerakan."
    ],
    "instructions_id": [
      "Gelar matras di permukaan rata dan ambil posisi awal yang rileks dengan tulang belakang netral.",
      "Fokuskan pernapasan lateral (bernapas dalam melebar ke tulang rusuk, buang napas sambil menarik pusar ke arah tulang belakang).",
      "Aktifkan otot inti bagian dalam (powerhouse: transversus abdominis dan otot dasar panggul) pada setiap repetisi.",
      "Lakukan setiap gerakan secara perlahan, terarah, dan terkontrol tanpa menggunakan momentum tubuh.",
      "Jaga leher, rahang, dan bahu tetap bebas dari ketegangan selama transisi antar gerakan."
    ],
    "instructions_en": [
      "Set up a comfortable exercise mat and align your spine in a neutral, relaxed position.",
      "Focus on lateral ribcage breathing: inhale wide into the sides and exhale while drawing your navel in toward your spine.",
      "Engage your deep core powerhouse (transverse abdominis and pelvic floor) on each repetition.",
      "Execute each movement with precision and control, avoiding sudden momentum.",
      "Keep the neck, shoulders, and jaw relaxed throughout each exercise."
    ]
  },
  {
    "id": 131,
    "name": "Yoga / Relaksasi",
    "target": [
      "Core"
    ],
    "type": "time",
    "defaultWeight": 0,
    "duration": 600,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Siapkan matras di tempat yang tenang dengan sirkulasi udara baik dan bebas dari gangguan.",
      "Duduk tegak bersila, pejamkan mata sejenak, dan sadari ritme pernapasan alami tubuh Anda.",
      "Masuk ke setiap pose atau peregangan secara perlahan, sesuaikan kedalaman pose dengan batas kelenturan tubuh.",
      "Tarik napas untuk memanjangkan tulang belakang dan buang napas untuk memperdalam peregangan atau merilekskan otot.",
      "Tutup sesi dengan pose istirahat (Savasana) selama beberapa menit untuk memulihkan energi tubuh dan pikiran."
    ],
    "instructions_id": [
      "Siapkan matras di tempat yang tenang dengan sirkulasi udara baik dan bebas dari gangguan.",
      "Duduk tegak bersila, pejamkan mata sejenak, dan sadari ritme pernapasan alami tubuh Anda.",
      "Masuk ke setiap pose atau peregangan secara perlahan, sesuaikan kedalaman pose dengan batas kelenturan tubuh.",
      "Tarik napas untuk memanjangkan tulang belakang dan buang napas untuk memperdalam peregangan atau merilekskan otot.",
      "Tutup sesi dengan pose istirahat (Savasana) selama beberapa menit untuk memulihkan energi tubuh dan pikiran."
    ],
    "instructions_en": [
      "Place your mat in a quiet, well-ventilated space free from distractions.",
      "Sit tall, close your eyes, and center yourself by tuning into your natural breath.",
      "Flow into each posture smoothly, honoring your body current mobility limits.",
      "Inhale to lengthen your spine and exhale to relax deeper into the stretch.",
      "Complete your session in a resting posture (Savasana) for a few minutes to integrate the practice."
    ]
  },
  {
    "id": 132,
    "name": "Elliptical Trainer",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Elliptical Machine",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Naiki mesin elliptical dan pilih opsi latihan pada menu. Anda dapat menggunakan mode manual atau program otomatis, serta memasukkan usia dan berat badan untuk estimasi kalori. Sesuaikan tingkat kemiringan (elevation) untuk mengatur intensitas.",
      "Gunakan sensor pada handle untuk memantau detak jantung agar intensitas tetap terjaga."
    ],
    "instructions_id": [
      "Naiki mesin elliptical dan pilih opsi latihan pada menu. Anda dapat menggunakan mode manual atau program otomatis, serta memasukkan usia dan berat badan untuk estimasi kalori. Sesuaikan tingkat kemiringan (elevation) untuk mengatur intensitas.",
      "Gunakan sensor pada handle untuk memantau detak jantung agar intensitas tetap terjaga."
    ],
    "instructions_en": [
      "To begin, step onto the elliptical and select the desired option from the menu. Most ellipticals have a manual setting, or you can select a program to run. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise. Elevation can be adjusted to change the intensity of the workout.",
      "The handles can be used to monitor your heart rate to help you stay at an appropriate intensity."
    ]
  },
  {
    "id": 133,
    "name": "Jump Rope",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 5,
    "equipment": "Rope",
    "level": "intermediate",
    "ytVideo": "",
    "instructions": [
      "Pilih tali skipping dengan panjang yang tepat (saat diinjak di tengah, kedua ujung gagang mencapai ketiak).",
      "Posisikan kedua siku dekat dengan pinggang, putar tali menggunakan pergelangan tangan, bukan seluruh lengan.",
      "Lompat rendah sekitar 2–3 cm dari lantai hanya setinggi yang diperlukan agar tali dapat lewat di bawah kaki.",
      "Mendaratlah dengan lembut menggunakan bantalan depan kaki (balls of feet) dengan lutut sedikit ditekuk untuk meredam benturan.",
      "Jaga pandangan lurus ke depan, dada tegap, dan bernapas secara teratur dan konsisten."
    ],
    "instructions_id": [
      "Pilih tali skipping dengan panjang yang tepat (saat diinjak di tengah, kedua ujung gagang mencapai ketiak).",
      "Posisikan kedua siku dekat dengan pinggang, putar tali menggunakan pergelangan tangan, bukan seluruh lengan.",
      "Lompat rendah sekitar 2–3 cm dari lantai hanya setinggi yang diperlukan agar tali dapat lewat di bawah kaki.",
      "Mendaratlah dengan lembut menggunakan bantalan depan kaki (balls of feet) dengan lutut sedikit ditekuk untuk meredam benturan.",
      "Jaga pandangan lurus ke depan, dada tegap, dan bernapas secara teratur dan konsisten."
    ],
    "instructions_en": [
      "Adjust your jump rope to the correct length (stepping on the rope center, handles should reach underarms).",
      "Keep elbows close to your ribs and rotate the rope primarily from your wrists rather than swinging your arms.",
      "Jump only 2–3 cm off the floor—just enough for the rope to clear under your feet.",
      "Land softly on the balls of your feet with knees slightly soft to absorb shock.",
      "Look straight ahead with an upright chest and maintain smooth, rhythmic breathing."
    ]
  },
  {
    "id": 134,
    "name": "Goblet Squat",
    "target": [
      "Quads",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/MeIiIdhgPgl",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Goblet_Squat.mp4",
    "instructions": [
      "Berdiri tegak sambil memegang kettlebell ringan di bagian pegangan dekat dada. Ini adalah posisi awal.",
      "Jongkok di antara kedua kaki hingga hamstring menyentuh betis. Pastikan dada dan kepala tetap tegak serta punggung lurus.",
      "Tahan posisi di bawah sejenak dan gunakan siku untuk mendorong lutut ke arah luar. Kembali ke posisi awal, ulangi 10-20 repetisi."
    ],
    "instructions_id": [
      "Berdiri tegak sambil memegang kettlebell ringan di bagian pegangan dekat dada. Ini adalah posisi awal.",
      "Jongkok di antara kedua kaki hingga hamstring menyentuh betis. Pastikan dada dan kepala tetap tegak serta punggung lurus.",
      "Tahan posisi di bawah sejenak dan gunakan siku untuk mendorong lutut ke arah luar. Kembali ke posisi awal, ulangi 10-20 repetisi."
    ],
    "instructions_en": [
      "Stand holding a light kettlebell by the horns close to your chest. This will be your starting position.",
      "Squat down between your legs until your hamstrings are on your calves. Keep your chest and head up and your back straight.",
      "At the bottom position, pause and use your elbows to push your knees out. Return to the starting position, and repeat for 10-20 repetitions."
    ]
  },
  {
    "id": 135,
    "name": "Barbell Bench Press - Medium Grip",
    "target": [
      "Dada Tengah",
      "Triceps",
      "Deltoid Depan"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/rT7DgCr-3pg",
    "videoUrl": "/exercise-assets/edb-Barbell_Bench_Press_-_Medium_Grip.mp4 /exercise-assets/youtube-backup/edb-Barbell_Bench_Press_-_Medium_Grip.mp4",
    "instructions": [
      "Berbaringlah di atas bangku datar. Gunakan genggaman dengan lebar sedang (genggaman yang membentuk sudut 90 derajat di tengah gerakan antara lengan bawah dan lengan atas), angkat barbel dari rak dan tahan lurus di atas Anda dengan tangan terkunci. Ini adalah posisi awal Anda.",
      "Dari posisi awal, tarik napas dan mulailah turunkan secara perlahan hingga barbel menyentuh dada bagian tengah.",
      "Setelah jeda singkat, dorong barbel kembali ke posisi awal sambil menghembuskan napas. Fokuslah mendorong barbel menggunakan otot dada. Kunci lengan Anda dan kencangkan dada pada posisi kontraksi di puncak gerakan, tahan selama sedetik lalu mulai turunkan kembali secara perlahan. Tip: Idealnya, menurunkan beban memakan waktu sekitar dua kali lebih lama daripada mengangkatnya.",
      "Ulangi gerakan untuk jumlah repetisi yang ditentukan.",
      "Setelah selesai, kembalikan barbel ke rak."
    ],
    "instructions_id": [
      "Berbaringlah di atas bangku datar. Gunakan genggaman dengan lebar sedang (genggaman yang membentuk sudut 90 derajat di tengah gerakan antara lengan bawah dan lengan atas), angkat barbel dari rak dan tahan lurus di atas Anda dengan tangan terkunci. Ini adalah posisi awal Anda.",
      "Dari posisi awal, tarik napas dan mulailah turunkan secara perlahan hingga barbel menyentuh dada bagian tengah.",
      "Setelah jeda singkat, dorong barbel kembali ke posisi awal sambil menghembuskan napas. Fokuslah mendorong barbel menggunakan otot dada. Kunci lengan Anda dan kencangkan dada pada posisi kontraksi di puncak gerakan, tahan selama sedetik lalu mulai turunkan kembali secara perlahan. Tip: Idealnya, menurunkan beban memakan waktu sekitar dua kali lebih lama daripada mengangkatnya.",
      "Ulangi gerakan untuk jumlah repetisi yang ditentukan.",
      "Setelah selesai, kembalikan barbel ke rak."
    ],
    "instructions_en": [
      "Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest.",
      "After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top of the motion, hold for a second and then start coming down slowly again. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ]
  },
  {
    "id": 136,
    "name": "Swimming (Renang)",
    "target": [
      "Cardio",
      "Core",
      "Lats"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Pool",
    "level": "intermediate",
    "ytVideo": "",
    "instructions": [
      "Lakukan pemanasan peregangan sendi bahu dan leher di pinggir kolam sebelum masuk ke air.",
      "Mulai dengan 1–2 putaran gaya dada atau gaya bebas santai untuk beradaptasi dengan suhu air.",
      "Pertahankan posisi tubuh horizontal dan sejajar permukaan air (streamline) untuk meminimalkan hambatan air.",
      "Lakukan kayuhan tangan secara efisien dipadukan dengan kayuhan kaki yang teratur dari pangkal paha.",
      "Atur pola pernapasan ritmis (misal: mengambil napas tiap 2 atau 3 kayuhan) dan lakukan pendinginan 1 putaran santai."
    ],
    "instructions_id": [
      "Lakukan pemanasan peregangan sendi bahu dan leher di pinggir kolam sebelum masuk ke air.",
      "Mulai dengan 1–2 putaran gaya dada atau gaya bebas santai untuk beradaptasi dengan suhu air.",
      "Pertahankan posisi tubuh horizontal dan sejajar permukaan air (streamline) untuk meminimalkan hambatan air.",
      "Lakukan kayuhan tangan secara efisien dipadukan dengan kayuhan kaki yang teratur dari pangkal paha.",
      "Atur pola pernapasan ritmis (misal: mengambil napas tiap 2 atau 3 kayuhan) dan lakukan pendinginan 1 putaran santai."
    ],
    "instructions_en": [
      "Warm up your shoulders, back, and hips with light stretches poolside before entering the water.",
      "Swim 1–2 easy warmup laps to adjust to water temperature and establish your breathing rhythm.",
      "Maintain a streamlined, horizontal body line near the surface to reduce drag.",
      "Drive your arm strokes with complete extension and kick rhythmically from your hips, not just knees.",
      "Breathe rhythmically at consistent stroke intervals and finish with an easy cool-down lap."
    ]
  },
  {
    "id": 137,
    "name": "Jogging / Running",
    "target": [
      "Cardio",
      "Quads",
      "Calves"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 20,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Mulai dengan jalan cepat selama 3–5 menit untuk melancarkan sirkulasi darah ke otot kaki.",
      "Tingkatkan tempo menjadi lari santai (joging) dengan postur tubuh sedikit condong ke depan dari pergelangan kaki.",
      "Ayunkan lengan ke depan dan ke belakang secara santai dengan sudut siku sekitar 90 derajat.",
      "Daratkan kaki dengan lembut di bawah panggul, hindari melangkah terlalu jauh ke depan (overstriding).",
      "Turunkan kecepatan menjadi jalan santai selama 3 menit untuk mendinginkan detak jantung setelah selesai."
    ],
    "instructions_id": [
      "Mulai dengan jalan cepat selama 3–5 menit untuk melancarkan sirkulasi darah ke otot kaki.",
      "Tingkatkan tempo menjadi lari santai (joging) dengan postur tubuh sedikit condong ke depan dari pergelangan kaki.",
      "Ayunkan lengan ke depan dan ke belakang secara santai dengan sudut siku sekitar 90 derajat.",
      "Daratkan kaki dengan lembut di bawah panggul, hindari melangkah terlalu jauh ke depan (overstriding).",
      "Turunkan kecepatan menjadi jalan santai selama 3 menit untuk mendinginkan detak jantung setelah selesai."
    ],
    "instructions_en": [
      "Begin with 3–5 minutes of brisk walking to prepare your lower-body muscles and joints.",
      "Transition into an easy jog with a slight forward lean from the ankles, not the waist.",
      "Swing your arms naturally front to back with elbows bent at approximately 90 degrees.",
      "Land softly underneath your center of gravity, avoiding overstriding onto the heel.",
      "Cool down by walking easily for 3 minutes until your breathing stabilizes."
    ]
  },
  {
    "id": 138,
    "name": "Walking / Jalan Kaki",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Berdirilah tegak dengan bahu rileks ke belakang, dada terbuka, dan pandangan sekitar 3–5 meter ke depan.",
      "Langkahkan kaki ke depan dengan mendaratkan tumit terlebih dahulu, lalu gulirkan telapak kaki hingga mendorong dari ibu jari.",
      "Ayunkan kedua lengan secara alami dan bergantian mengikuti irama langkah kaki.",
      "Pertahankan kecepatan jalan cepat (brisk walk) yang membuat Anda bernapas lebih cepat tetapi masih dapat berbicara.",
      "Turunkan tempo langkah di 2 menit terakhir sebagai pendinginan bertahap."
    ],
    "instructions_id": [
      "Berdirilah tegak dengan bahu rileks ke belakang, dada terbuka, dan pandangan sekitar 3–5 meter ke depan.",
      "Langkahkan kaki ke depan dengan mendaratkan tumit terlebih dahulu, lalu gulirkan telapak kaki hingga mendorong dari ibu jari.",
      "Ayunkan kedua lengan secara alami dan bergantian mengikuti irama langkah kaki.",
      "Pertahankan kecepatan jalan cepat (brisk walk) yang membuat Anda bernapas lebih cepat tetapi masih dapat berbicara.",
      "Turunkan tempo langkah di 2 menit terakhir sebagai pendinginan bertahap."
    ],
    "instructions_en": [
      "Stand tall with relaxed shoulders, open chest, and eyes looking 3–5 meters ahead.",
      "Step forward with a natural heel-to-toe roll, pushing off gently through your toes.",
      "Swing your arms naturally in opposition to your leg stride.",
      "Maintain a brisk pace that raises your heart rate while still allowing comfortable speech.",
      "Slow your pace during the final 2 minutes for a gradual cool-down."
    ]
  },
  {
    "id": 139,
    "name": "Cycling / Sepeda",
    "target": [
      "Cardio",
      "Quads"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Bicycle",
    "level": "beginner",
    "ytVideo": "",
    "instructions": [
      "Periksa kondisi sepeda (tekanan ban, rem, dan tinggi sadel) serta kenakan helm pengaman sebelum berkendara.",
      "Mulai bersepeda di jalur yang aman dengan gigi ringan untuk pemanasan otot kaki selama 5 menit.",
      "Jaga posisi tulang belakang rileks, tekuk siku sedikit saat memegang stang untuk menyerap getaran jalan.",
      "Pertahankan putaran kayuhan (cadence) yang stabil dan efisien sekitar 70–90 RPM tanpa memaksakan gigi berat.",
      "Kurangi intensitas kayuhan pada 5 menit terakhir untuk mendinginkan otot sebelum berhenti."
    ],
    "instructions_id": [
      "Periksa kondisi sepeda (tekanan ban, rem, dan tinggi sadel) serta kenakan helm pengaman sebelum berkendara.",
      "Mulai bersepeda di jalur yang aman dengan gigi ringan untuk pemanasan otot kaki selama 5 menit.",
      "Jaga posisi tulang belakang rileks, tekuk siku sedikit saat memegang stang untuk menyerap getaran jalan.",
      "Pertahankan putaran kayuhan (cadence) yang stabil dan efisien sekitar 70–90 RPM tanpa memaksakan gigi berat.",
      "Kurangi intensitas kayuhan pada 5 menit terakhir untuk mendinginkan otot sebelum berhenti."
    ],
    "instructions_en": [
      "Check tire pressure, brakes, and saddle height, and always fasten your helmet before riding.",
      "Start in an easy gear on a safe flat route to warm up your legs for the first 5 minutes.",
      "Keep your back relaxed and elbows slightly bent on the handlebars to absorb road vibration.",
      "Maintain a steady, efficient pedaling cadence (around 70–90 RPM) rather than grinding in high gears.",
      "Ease up on pedal resistance during the final 5 minutes for a smooth cool-down."
    ]
  },
  {
    "id": 140,
    "name": "Pull Through",
    "target": [
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Pull_Through.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg",
    "instructions": [
      "Berdiri beberapa langkah di depan mesin katrol rendah yang sudah dipasangi tali atau pegangan. Posisikan tubuh membelakangi mesin, buka kaki lebar, dan posisikan kabel di antara kedua kaki.",
      "Mulai gerakan dengan mendorong pinggul ke belakang dan menjangkaukan tangan melalui celah kaki sejauh mungkin dengan lutut sedikit ditekuk.",
      "Jaga lengan tetap lurus, lalu dorong pinggul ke depan hingga posisi berdiri tegak. Hindari menarik beban dengan bahu; seluruh tenaga harus berasal dari dorongan pinggul."
    ],
    "instructions_id": [
      "Berdiri beberapa langkah di depan mesin katrol rendah yang sudah dipasangi tali atau pegangan. Posisikan tubuh membelakangi mesin, buka kaki lebar, dan posisikan kabel di antara kedua kaki.",
      "Mulai gerakan dengan mendorong pinggul ke belakang dan menjangkaukan tangan melalui celah kaki sejauh mungkin dengan lutut sedikit ditekuk.",
      "Jaga lengan tetap lurus, lalu dorong pinggul ke depan hingga posisi berdiri tegak. Hindari menarik beban dengan bahu; seluruh tenaga harus berasal dari dorongan pinggul."
    ],
    "instructions_en": [
      "Begin standing a few feet in front of a low pulley with a rope or handle attached. Face away from the machine, straddling the cable, with your feet set wide apart.",
      "Begin the movement by reaching through your legs as far as possible, bending at the hips. Keep your knees slightly bent. Keeping your arms straight, extend through the hip to stand straight up. Avoid pulling upward through the shoulders; all of the motion should originate through the hips."
    ]
  },
  {
    "id": 141,
    "name": "Trail Running",
    "target": [
      "Cardio",
      "Quads",
      "Glutes",
      "Calves"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "intermediate",
    "ytVideo": "",
    "instructions": [
      "Berlari atau mendaki di jalur setapak akan memacu detak jantung dengan cepat. Pastikan menggunakan alas kaki yang sesuai.",
      "Saat mendaki, otot betis dan bokong bekerja menarik tubuh ke atas. Saat turun, lutut, sendi, dan pergelangan kaki meredam beban terbesar.",
      "Gunakan langkah pendek saat berjalan menurun, jaga lutut tetap sedikit menekuk untuk meredam impak, dan kurangi kecepatan guna menghindari risiko jatuh."
    ],
    "instructions_id": [
      "Berlari atau mendaki di jalur setapak akan memacu detak jantung dengan cepat. Pastikan menggunakan alas kaki yang sesuai.",
      "Saat mendaki, otot betis dan bokong bekerja menarik tubuh ke atas. Saat turun, lutut, sendi, dan pergelangan kaki meredam beban terbesar.",
      "Gunakan langkah pendek saat berjalan menurun, jaga lutut tetap sedikit menekuk untuk meredam impak, dan kurangi kecepatan guna menghindari risiko jatuh."
    ],
    "instructions_en": [
      "Running or hiking on trails will get the blood pumping and heart beating almost immediately. Make sure you have good shoes. While you use the muscles in your calves and buttocks to pull yourself up a hill, the knees, joints and ankles absorb the bulk of the pounding coming back down. Take smaller steps as you walk downhill, keep your knees bent to reduce the impact and slow down to avoid falling.",
      "A 150 lb person can burn over 200 calories for 30 minutes walking uphill, compared to 175 on a flat surface. If running the trail, a 150 lb person can burn well over 500 calories in 30 minutes."
    ]
  },
  {
    "id": 142,
    "name": "Barbell Incline Bench Press - Medium Grip",
    "target": [
      "Chest",
      "Shoulders",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "instructions": [
      "Berbaringlah di bangku inklin (incline bench). Dengan genggaman lebar sedang (genggaman yang membentuk sudut 90 derajat di tengah gerakan antara lengan bawah dan lengan atas), angkat barbel dari rak dan tahan lurus di atas Anda dengan lengan terkunci. Ini adalah posisi awal Anda.",
      "Sambil menarik napas, turunkan barbel secara perlahan hingga menyentuh dada bagian atas.",
      "Setelah jeda satu detik, dorong kembali barbel ke posisi awal menggunakan otot dada saat mengembuskan napas. Kunci lengan Anda di posisi puncak, kontraksikan otot dada, tahan selama satu detik, lalu mulailah menurunkan barbel kembali secara perlahan. Tips: waktu untuk menurunkan beban harus dua kali lebih lama daripada saat mendorongnya.",
      "Ulangi gerakan ini sesuai dengan jumlah repetisi yang ditentukan.",
      "Setelah selesai, letakkan kembali barbel ke rak penyangga."
    ],
    "instructions_id": [
      "Berbaringlah di bangku inklin (incline bench). Dengan genggaman lebar sedang (genggaman yang membentuk sudut 90 derajat di tengah gerakan antara lengan bawah dan lengan atas), angkat barbel dari rak dan tahan lurus di atas Anda dengan lengan terkunci. Ini adalah posisi awal Anda.",
      "Sambil menarik napas, turunkan barbel secara perlahan hingga menyentuh dada bagian atas.",
      "Setelah jeda satu detik, dorong kembali barbel ke posisi awal menggunakan otot dada saat mengembuskan napas. Kunci lengan Anda di posisi puncak, kontraksikan otot dada, tahan selama satu detik, lalu mulailah menurunkan barbel kembali secara perlahan. Tips: waktu untuk menurunkan beban harus dua kali lebih lama daripada saat mendorongnya.",
      "Ulangi gerakan ini sesuai dengan jumlah repetisi yang ditentukan.",
      "Setelah selesai, letakkan kembali barbel ke rak penyangga."
    ],
    "instructions_en": [
      "Lie back on an incline bench. Using a medium-width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "As you breathe in, come down slowly until you feel the bar on you upper chest.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, squeeze your chest, hold for a second and then start coming down slowly again. Tip: it should take at least twice as long to go down than to come up.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ]
  },
  {
    "id": 143,
    "name": "Side Lateral Raise",
    "target": [
      "Deltoid Samping"
    ],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    "instructions": [
      "Ambil sepasang dumbbell, berdiri tegak dengan posisi lengan lurus di samping tubuh dan telapak tangan menghadap ke dalam. Ini adalah posisi awal Anda.",
      "Jaga tubuh tetap stabil (tanpa mengayun), angkat dumbbell ke samping dengan sedikit menekuk siku dan posisi tangan sedikit miring ke depan seperti sedang menuang air ke dalam gelas. Lanjutkan hingga lengan sejajar dengan lantai. Buang napas saat melakukan gerakan ini dan tahan selama satu detik di atas.",
      "Turunkan kembali dumbbell secara perlahan ke posisi awal sambil menarik napas.",
      "Ulangi untuk jumlah repetisi yang dianjurkan."
    ],
    "instructions_id": [
      "Ambil sepasang dumbbell, berdiri tegak dengan posisi lengan lurus di samping tubuh dan telapak tangan menghadap ke dalam. Ini adalah posisi awal Anda.",
      "Jaga tubuh tetap stabil (tanpa mengayun), angkat dumbbell ke samping dengan sedikit menekuk siku dan posisi tangan sedikit miring ke depan seperti sedang menuang air ke dalam gelas. Lanjutkan hingga lengan sejajar dengan lantai. Buang napas saat melakukan gerakan ini dan tahan selama satu detik di atas.",
      "Turunkan kembali dumbbell secara perlahan ke posisi awal sambil menarik napas.",
      "Ulangi untuk jumlah repetisi yang dianjurkan."
    ],
    "instructions_en": [
      "Pick a couple of dumbbells and stand with a straight torso and the dumbbells by your side at arms length with the palms of the hand facing you. This will be your starting position.",
      "While maintaining the torso in a stationary position (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
      "Lower the dumbbells back down slowly to the starting position as you inhale.",
      "Repeat for the recommended amount of repetitions."
    ]
  }
];

export const cleanExerciseNameForMatching = (name) => {
  if (!name) return '';
  let str = String(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\brumanian\b/g, 'romanian')
    .replace(/\brdl\b/g, 'romanian deadlift')
    .replace(/\b(romanian deadlift)(\s+romanian deadlift)+\b/g, 'romanian deadlift')
    .replace(/\bsm\b/g, 'smith machine')
    .replace(/\bdumbell\b/g, 'dumbbell')
    .replace(/\bdumbel\b/g, 'dumbbell')
    .replace(/\bpull\s+thru\b/g, 'pull through')
    .replace(/\blat\s+pull\s*down\b/g, 'lat pulldown')
    .replace(/\bcross\s+cable\s+rear\s+delt(\s+fly)?\b/g, 'cable rear delt fly')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalisasi bentuk jamak/tunggal istilah umum
  str = str.replace(/\bbiceps\b/g, 'bicep')
           .replace(/\bcurls\b/g, 'curl')
           .replace(/\braises\b/g, 'raise')
           .replace(/\bpresses\b/g, 'press')
           .replace(/\bshrugs\b/g, 'shrug')
           .replace(/\blunges\b/g, 'lunge')
           .replace(/\bcrunches\b/g, 'crunch')
           .replace(/\bextensions\b/g, 'extension')
           .replace(/\brows\b/g, 'row');

  return str;
};

/**
 * Mencocokkan exercise dengan defaultMasterExercises atau daftar katalog lainnya secara cerdas.
 * Mendukung variasi nama seperti "Lat Pulldown" -> "Wide-Grip Lat Pulldown",
 * "Cross Cable Rear Delt" -> "Cable Rear Delt Fly", "Dumbbell Biceps Curl" -> "Dumbbell Alternate Bicep Curl",
 * "Cable Pull Through" -> "Pull Through", "Flat Dumbbell Bench Press" -> "Dumbbell Bench Press",
 * "Cable Lateral Raises" -> "Cable Seated Lateral Raise", "Rumanian Deadlift" -> "Romanian Deadlift", dll.
 */
export const findMatchingMasterExercise = (targetEx, masterList = defaultMasterExercises) => {
  if (!targetEx) return null;
  const rawId = targetEx.originalId || targetEx.id;
  const rawName = cleanExerciseNameForMatching(targetEx.name);

  // 1. Cocokkan berdasarkan ID
  if (rawId !== undefined && rawId !== null) {
    const byId = masterList.find(m => String(m.id || m.exerciseId) === String(rawId));
    if (byId) return byId;

    // 1b. Cocokkan ID via exerciseAliasMap jika targetEx membawa originalId/id
    if (exerciseAliasMap) {
      const aliasTarget = exerciseAliasMap[String(rawId)];
      if (aliasTarget) {
        const cleanAlias = aliasTarget.replace(/^edb-/, '');
        const byAliasMap = masterList.find(m => 
          String(m.id) === aliasTarget || 
          String(m.id) === cleanAlias || 
          String(m.exerciseId) === cleanAlias || 
          String(m.exerciseId) === aliasTarget
        );
        if (byAliasMap) return byAliasMap;
      }
    }
  }

  if (!rawName) return null;

  // 2. Cocokkan nama persis / setelah normalisasi typo
  const byExact = masterList.find(m => cleanExerciseNameForMatching(m.name) === rawName);
  if (byExact) return byExact;

  // 2b. Cocokkan dari field aliases di masterList bila ada
  const byMasterAlias = masterList.find(m => Array.isArray(m.aliases) && m.aliases.some(a => cleanExerciseNameForMatching(a) === rawName));
  if (byMasterAlias) return byMasterAlias;

  // 3. Cocokkan ALIAS KANONIKAL RESMI SAJA (tanpa mencaplok variasi berbeda!)
  const canonicalAliases = {
    // Lat Pulldown
    'lat pulldown': 'Wide-Grip Lat Pulldown',
    'wide grip lat pulldown': 'Wide-Grip Lat Pulldown',
    'wide grip lat pull down': 'Wide-Grip Lat Pulldown',
    
    // Bench Press
    'flat dumbbell bench press': 'Dumbbell Bench Press',
    'dumbbell flat bench press': 'Dumbbell Bench Press',
    'db bench press': 'Dumbbell Bench Press',
    'barbell bench press': 'Barbell Bench Press - Medium Grip',
    'flat barbell bench press': 'Barbell Bench Press - Medium Grip',
    'barbell flat bench press': 'Barbell Bench Press - Medium Grip',
    'barbell incline bench press': 'Barbell Incline Bench Press - Medium Grip',
    'incline barbell bench press': 'Barbell Incline Bench Press - Medium Grip',
    'barbell incline bench press medium grip': 'Barbell Incline Bench Press - Medium Grip',
    'incline smith machine press': 'Smith Machine Incline Bench Press',
    'sm flat bench press': 'Smith Machine Bench Press',
    'smith machine flat bench press': 'Smith Machine Bench Press',

    // Deadlift
    'romanian deadlift': 'Romanian Deadlift',
    'rumanian deadlift': 'Romanian Deadlift',
    'rdl': 'Romanian Deadlift',
    'barbell rdl': 'Romanian Deadlift',
    'barbell romanian deadlift': 'Romanian Deadlift',
    'smith machine romanian deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff-legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg rdl': 'Smith Machine Romanian Deadlift',
    'smith machine stiff-legged rdl': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg romanian deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff legged romanian deadlift': 'Smith Machine Romanian Deadlift',
    'sm stiff leg deadlift': 'Smith Machine Romanian Deadlift',
    'sm stiff leg rdl': 'Smith Machine Romanian Deadlift',
    'sm stiff-legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith rdl': 'Smith Machine Romanian Deadlift',
    'sm rdl': 'Smith Machine Romanian Deadlift',
    'sm romanian deadlift': 'Smith Machine Romanian Deadlift',
    'sm romanian deadlift rdl': 'Smith Machine Romanian Deadlift',
    'smith machine romanian deadlift rdl': 'Smith Machine Romanian Deadlift',

    // Lunges & Squats
    'dumbbell walking lunges': ['Dumbbell Walking Lunges', 'Dumbbell Lunges'],
    'dumbbell walking lunge': ['Dumbbell Walking Lunges', 'Dumbbell Lunges'],
    'walking lunges': ['Dumbbell Walking Lunges', 'Dumbbell Lunges'],
    'walking lunge': ['Dumbbell Walking Lunges', 'Dumbbell Lunges'],
    'dumbbell lunges': ['Dumbbell Lunges', 'Dumbbell Walking Lunges'],
    'dumbbell lunge': ['Dumbbell Lunges', 'Dumbbell Walking Lunges'],
    'db bulgarian split squat': 'Split Squat with Dumbbells',
    'dumbbell goblet squat': 'Goblet Squat',

    // Lateral Raise
    'standing cable lateral raise': 'Standing Cable Lateral Raise',
    'standing cable lateral raises': 'Standing Cable Lateral Raise',
    'cable lateral raise': 'Standing Cable Lateral Raise',
    'cable lateral raises': 'Standing Cable Lateral Raise',
    'cable side lateral raise': 'Standing Cable Lateral Raise',
    'cable side lateral raises': 'Standing Cable Lateral Raise',
    'side lateral raise': 'Side Lateral Raise',
    'side lateral raises': 'Side Lateral Raise',
    'dumbbell lateral raise': 'Side Lateral Raise',
    'dumbbell lateral raises': 'Side Lateral Raise',
    'dumbbell side lateral raise': 'Side Lateral Raise',
    'lateral raise': 'Side Lateral Raise',
    'lateral raises': 'Side Lateral Raise',

    // Delts / Rows / Pushdown / Pulls / Curls
    'cable rear delt fly': 'Cable Rear Delt Fly',
    'cross cable rear delt': 'Cable Rear Delt Fly',
    'cross cable rear delt fly': 'Cable Rear Delt Fly',
    'cable rear delt flyes': 'Cable Rear Delt Fly',
    'cable seated row': 'Seated Cable Rows',
    'cable seated rows': 'Seated Cable Rows',
    'seated cable row': 'Seated Cable Rows',
    'pull through': 'Pull Through',
    'cable pull through': 'Pull Through',
    'cable pull thru': 'Pull Through',
    'cable hip abduction': 'Cable Hip Abduction',
    'standing cable hip abduction': 'Cable Hip Abduction',
    'triceps pushdown': 'Triceps Pushdown',
    'cable triceps pushdown': 'Triceps Pushdown',
    'tricep pushdown': 'Triceps Pushdown',
    'overhead cable triceps extension': 'Cable Rope Overhead Triceps Extension',
    'dumbbell alternate bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell alternating bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell biceps curl': 'Dumbbell Alternate Bicep Curl',
    'bicep curl': 'Dumbbell Alternate Bicep Curl',
    'biceps curl': 'Dumbbell Alternate Bicep Curl',
    'bicep cable curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'biceps cable curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'cable bicep curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'cable biceps curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'standing cable curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'standing bicep cable curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'standing biceps cable curl': ['Standing Biceps Cable Curl', 'Biceps Cable Curl'],
    'high cable curl': 'High Cable Curls',
    'high cable curls': 'High Cable Curls',
    'dumbbell wrist curl': 'Palms-Up Dumbbell Wrist Curl Over A Bench',

    // Calves
    'standing calf raise': 'Rocking Standing Calf Raise',
    'seated dumbbell calf raise': 'Seated Calf Raise',

    // Cardio
    'treadmill': 'Treadmill',
    'treadmill running': 'Treadmill',
    'running on treadmill': 'Treadmill',
    'trail running': ['Trail Running', 'Trail Running/Walking', 'Trail Running Walking'],
    'trail run': ['Trail Running', 'Trail Running/Walking', 'Trail Running Walking'],
    'jogging': 'Jogging / Running',
    'running': 'Jogging / Running',
    'jogging running': 'Jogging / Running',
    'jogging / running': 'Jogging / Running',
  };

  const canonicalEntry = canonicalAliases[rawName];
  if (canonicalEntry) {
    const cands = Array.isArray(canonicalEntry) ? canonicalEntry : [canonicalEntry];
    for (const cand of cands) {
      const candClean = cleanExerciseNameForMatching(cand);
      const byCanonical = masterList.find(m => cleanExerciseNameForMatching(m.name) === candClean);
      if (byCanonical) return byCanonical;
      const byMasterAlias = masterList.find(m => Array.isArray(m.aliases) && m.aliases.some(a => cleanExerciseNameForMatching(a) === candClean));
      if (byMasterAlias) return byMasterAlias;
    }
  }

  return null;
};

/**
 * Menormalkan objek latihan ke nama dan atribut kanonikal master resmi.
 * Menjamin sinkronisasi nama tanpa menimpa variasi spesifik (seperti Deficit, Incline, Rope, Cable Curl, dll.):
 *  - "Lat Pulldown" -> "Wide-Grip Lat Pulldown"
 *  - "Cross Cable Rear Delt" -> "Cable Rear Delt Fly"
 *  - "Dumbbell Biceps Curl" / "Biceps Curl" -> "Dumbbell Alternate Bicep Curl" (bukan Cable Curl / Barbell Curl)
 *  - "Rumanian Deadlift" / "RDL" -> "Romanian Deadlift" (bukan Deficit RDL / Smith RDL)
 *  - "Flat Dumbbell Bench Press" -> "Dumbbell Bench Press" (bukan Incline DB Press)
 *  - "Cable Lateral Raises" -> "Standing Cable Lateral Raise" (bukan Dumbbell Lateral Raise / Seated Cable Raise)
 *  - "Cable Pull Through" -> "Pull Through"
 *  - "Cable Triceps Pushdown" -> "Triceps Pushdown" (bukan Rope Overhead Extension)
 */
export const canonicalizeExercise = (ex) => {
  if (!ex) return ex;
  const masterMatch = findMatchingMasterExercise(ex, defaultMasterExercises);
  let name = ex.name || '';
  const locName = cleanExerciseNameForMatching(name);

  // Exact alias mapping: HANYA ubah jika nama persis alias resminya
  if (locName === 'lat pulldown' || locName === 'wide grip lat pulldown' || locName === 'wide grip lat pull down') {
    name = 'Wide-Grip Lat Pulldown';
  } else if (locName === 'cable rear delt fly' || locName === 'cross cable rear delt' || locName === 'cross cable rear delt fly' || locName === 'cable rear delt flyes') {
    name = 'Cable Rear Delt Fly';
  } else if (locName === 'romanian deadlift from deficit' || locName === 'rdl from deficit' || locName === 'deficit rdl') {
    name = 'Romanian Deadlift from Deficit';
  } else if (
    locName === 'sm romanian deadlift' ||
    locName === 'smith machine romanian deadlift' ||
    locName === 'smith rdl' ||
    locName === 'sm rdl' ||
    locName === 'smith machine rdl' ||
    locName === 'sm romanian deadlift rdl' ||
    locName === 'smith machine stiff-legged deadlift' ||
    locName === 'smith machine stiff legged deadlift' ||
    locName === 'smith machine stiff leg deadlift' ||
    locName === 'smith machine stiff leg rdl' ||
    locName === 'smith machine stiff-legged rdl' ||
    locName === 'sm stiff leg deadlift' ||
    locName === 'sm stiff leg rdl' ||
    locName === 'sm stiff-legged deadlift' ||
    locName === 'smith machine stiff leg romanian deadlift' ||
    locName === 'smith machine stiff legged romanian deadlift'
  ) {
    name = 'Smith Machine Romanian Deadlift';
  } else if (locName === 'romanian deadlift' || locName === 'rumanian deadlift' || locName === 'rdl' || locName === 'barbell rdl' || locName === 'barbell romanian deadlift') {
    name = 'Romanian Deadlift';
  } else if (locName === 'flat dumbbell bench press' || locName === 'dumbbell flat bench press' || locName === 'db bench press') {
    name = 'Dumbbell Bench Press';
  } else if (locName === 'standing cable hip abduction' || locName === 'cable hip abduction' || locName === 'cable hip abductions') {
    name = 'Cable Hip Abduction';
  } else if (locName === 'cable pull through' || locName === 'cable pull thru' || locName === 'pull through') {
    name = 'Pull Through';
  } else if (locName === 'standing cable lateral raise' || locName === 'standing cable lateral raises' || locName === 'cable lateral raise' || locName === 'cable lateral raises' || locName === 'cable side lateral raise' || locName === 'cable side lateral raises') {
    name = 'Standing Cable Lateral Raise';
  } else if (locName === 'cable seated lateral raise' || locName === 'seated cable lateral raise' || locName === 'seated cable lateral raises') {
    name = 'Cable Seated Lateral Raise';
  } else if (locName === 'seated side lateral raise' || locName === 'seated dumbbell lateral raise' || locName === 'seated dumbbell lateral raises' || locName === 'seated lateral raise' || locName === 'seated lateral raises') {
    name = 'Seated Side Lateral Raise';
  } else if (locName === 'side lateral raise' || locName === 'side lateral raises' || locName === 'dumbbell lateral raise' || locName === 'dumbbell lateral raises' || locName === 'dumbbell side lateral raise' || locName === 'dumbbell side lateral raises' || locName === 'lateral raise' || locName === 'lateral raises') {
    name = 'Side Lateral Raise';
  } else if (locName === 'treadmill running' || locName === 'running on treadmill' || locName === 'treadmill') {
    name = 'Treadmill';
  } else if (locName === 'trail running' || locName === 'trail run') {
    name = 'Trail Running';
  } else if (locName === 'jogging' || locName === 'running' || locName === 'jogging running' || locName === 'jogging / running') {
    name = 'Jogging / Running';
  } else if (locName === 'cable triceps pushdown' || locName === 'triceps pushdown' || locName === 'tricep pushdown') {
    name = 'Triceps Pushdown';
  } else if (locName === 'dumbbell biceps curl' || locName === 'dumbbell bicep curl' || locName === 'biceps curl' || locName === 'bicep curl' || locName === 'dumbbell alternate bicep curl' || locName === 'dumbbell alternating bicep curl') {
    name = 'Dumbbell Alternate Bicep Curl';
  } else if (locName === 'dumbbell walking lunge' || locName === 'walking lunge') {
    name = 'Dumbbell Walking Lunges';
  } else if (locName === 'biceps cable curl' || locName === 'bicep cable curl' || locName === 'cable bicep curl' || locName === 'cable biceps curl' || locName === 'standing cable curl' || locName === 'standing bicep cable curl' || locName === 'standing biceps cable curl') {
    name = 'Standing Biceps Cable Curl';
  } else if (masterMatch && masterMatch.name && masterMatch.id === (ex.originalId || ex.id)) {
    name = masterMatch.name;
  }

  const instId = (ex.instructions_id && ex.instructions_id.length > 0)
    ? ex.instructions_id
    : (masterMatch?.instructions_id && masterMatch.instructions_id.length > 0)
      ? masterMatch.instructions_id
      : ex.instructions || masterMatch?.instructions;

  const instEn = (ex.instructions_en && ex.instructions_en.length > 0)
    ? ex.instructions_en
    : (masterMatch?.instructions_en && masterMatch.instructions_en.length > 0)
      ? masterMatch.instructions_en
      : ex.instructions || masterMatch?.instructions;

  return {
    ...ex,
    name,
    videoUrl: masterMatch?.videoUrl || ex.videoUrl || '',
    thumbnailUrl: masterMatch?.thumbnailUrl || ex.thumbnailUrl || masterMatch?.gifUrl || ex.gifUrl || '',
    gifUrl: masterMatch?.gifUrl || ex.gifUrl || '',
    ytVideo: masterMatch?.ytVideo || ex.ytVideo || '',
    instructions: instId || instEn,
    instructions_id: instId,
    instructions_en: instEn,
    ...(masterMatch ? {
      target: (ex.target && ex.target.length > 0) ? ex.target : masterMatch.target,
      equipment: ex.equipment || masterMatch.equipment,
      type: ex.type || masterMatch.type,
    } : {})
  };
};

export const defaultPrograms = [
  {
    "id": "prog-1",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Sel"
    ],
    "name": "Upper 1",
    "exercises": [
      {
        "id": 101,
        "name": "Smith Machine Incline Bench Press",
        "sets": 4,
        "reps": 12,
        "target": [
          "Dada Atas",
          "Deltoid Depan",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Incline_Bench_Press.mp4"
      },
      {
        "id": 102,
        "name": "Seated Cable Rows",
        "sets": 4,
        "reps": 12,
        "target": [
          "Punggung Atas",
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz",
        "videoUrl": "/exercise-assets/edb-Seated_Cable_Rows.mp4 /exercise-assets/youtube-backup/edb-Seated_Cable_Rows.mp4"
      },
      {
        "id": 103,
        "name": "Dumbbell Bench Press",
        "sets": 3,
        "reps": 12,
        "target": [
          "Dada Tengah",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Bench_Press.mp4"
      },
      {
        "id": 104,
        "name": "Standing Cable Lateral Raise",
        "sets": 3,
        "reps": 12,
        "target": [
          "Deltoid Samping"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.mp4"
      },
      {
        "id": 105,
        "name": "Triceps Pushdown",
        "sets": 3,
        "reps": 10,
        "target": [
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne",
        "videoUrl": "/exercise-assets/edb-Triceps_Pushdown.mp4 /exercise-assets/youtube-backup/edb-Triceps_Pushdown.mp4"
      },
      {
        "id": 106,
        "name": "Dumbbell Alternate Bicep Curl",
        "sets": 3,
        "reps": 10,
        "target": [
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Alternate_Bicep_Curl.mp4"
      },
      {
        "id": 107,
        "name": "Cardio",
        "sets": 1,
        "reps": 0,
        "duration": 15,
        "target": [
          "Cardio"
        ],
        "type": "cardio",
        "defaultWeight": 0,
        "equipment": "Stationary Bike",
        "ytVideo": ""
      }
    ]
  },
  {
    "id": "prog-2",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Rab"
    ],
    "name": "Lower 1",
    "exercises": [
      {
        "id": 108,
        "name": "Smith Machine Squat",
        "sets": 3,
        "reps": 10,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 0,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Squat.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Squat.mp4"
      },
      {
        "id": 109,
        "name": "Romanian Deadlift",
        "sets": 4,
        "reps": 12,
        "target": [
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Barbell",
        "ytVideo": "https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6",
        "videoUrl": "/exercise-assets/edb-Romanian_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Romanian_Deadlift.mp4"
      },
      {
        "id": 110,
        "name": "Dumbbell Walking Lunges",
        "sets": 3,
        "reps": 12,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "",
        "videoUrl": ""
      },
      {
        "id": 111,
        "name": "Rocking Standing Calf Raise",
        "sets": 4,
        "reps": 12,
        "target": [
          "Calves"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Barbell",
        "ytVideo": "https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Rocking_Standing_Calf_Raise.mp4"
      },
      {
        "id": 112,
        "name": "Cable Crunch",
        "sets": 4,
        "reps": 20,
        "target": [
          "Core"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Cable_Crunch.mp4"
      }
    ]
  },
  {
    "id": "prog-3",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Jum"
    ],
    "name": "Upper 2",
    "exercises": [
      {
        "id": 113,
        "name": "Wide-Grip Lat Pulldown",
        "sets": 4,
        "reps": 12,
        "target": [
          "Lats",
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Machine",
        "ytVideo": "https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Wide-Grip_Lat_Pulldown.mp4"
      },
      {
        "id": 114,
        "name": "Dumbbell Shoulder Press",
        "sets": 4,
        "reps": 12,
        "target": [
          "Deltoid Depan",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Shoulder_Press.mp4"
      },
      {
        "id": 124,
        "name": "Dumbbell Shrug",
        "sets": 4,
        "reps": 12,
        "target": [
          "Traps",
          "Leher"
        ],
        "type": "weight",
        "defaultWeight": 15,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Dumbbell_Shrug.mp4"
      },
      {
        "id": 115,
        "name": "Smith Machine Bench Press",
        "sets": 3,
        "reps": 12,
        "target": [
          "Dada Tengah",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 7.5,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Bench_Press.mp4"
      },
      {
        "id": 116,
        "name": "Cable Rear Delt Fly",
        "sets": 4,
        "reps": 12,
        "target": [
          "Deltoid Belakang"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak",
        "videoUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly_1.mp4 /exercise-assets/edb-Cable_Rear_Delt_Fly_2.mp4 /exercise-assets/youtube-backup/edb-Cable_Rear_Delt_Fly_1.mp4",
        "thumbnailUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp",
        "gifUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp"
      },
      {
        "id": 117,
        "name": "Cable Rope Overhead Triceps Extension",
        "sets": 3,
        "reps": 12,
        "target": [
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_",
        "videoUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.mp4 /exercise-assets/youtube-backup/edb-Cable_Rope_Overhead_Triceps_Extension.mp4"
      },
      {
        "id": 118,
        "name": "Standing Biceps Cable Curl",
        "sets": 3,
        "reps": 12,
        "target": [
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj",
        "videoUrl": "/exercise-assets/youtube-backup/edb-High_Cable_Curls.mp4"
      },
      {
        "id": 125,
        "name": "Palms-Up Dumbbell Wrist Curl Over A Bench",
        "sets": 3,
        "reps": 15,
        "target": [
          "Forearm"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/0-c4s051u6E?si=K-4Z9iKq2d8r0N1M",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4"
      }
    ]
  },
  {
    "id": "prog-4",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Min"
    ],
    "name": "Lower 2",
    "exercises": [
      {
        "id": 119,
        "name": "Split Squat with Dumbbells",
        "sets": 3,
        "reps": 10,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn",
        "videoUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.mp4 /exercise-assets/youtube-backup/edb-Split_Squat_with_Dumbbells.mp4"
      },
      {
        "id": 120,
        "name": "Smith Machine Romanian Deadlift",
        "sets": 4,
        "reps": 12,
        "target": [
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Romanian_Deadlift.mp4"
      },
      {
        "id": 121,
        "name": "Cable Hip Abduction",
        "sets": 3,
        "reps": 15,
        "target": [
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 15,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Pull_Through.mp4"
      },
      {
        "id": 122,
        "name": "Seated Calf Raise",
        "sets": 4,
        "reps": 20,
        "target": [
          "Calves"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Machine",
        "ytVideo": "https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Seated_Calf_Raise.mp4"
      },
      {
        "id": 123,
        "name": "Plank",
        "sets": 3,
        "duration": 30,
        "reps": 0,
        "target": [
          "Core"
        ],
        "type": "time",
        "defaultWeight": 0,
        "equipment": "Body Weight",
        "ytVideo": "https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Plank.mp4"
      }
    ]
  }
];

export const defaultWarmupVideos = "https://youtu.be/_6-k5-w1bZw https://youtu.be/khOmp34A_tA https://youtu.be/9UYVecB2_08";
export const defaultCooldownVideos = "https://youtu.be/NUIMZ4IcBy8 https://youtu.be/YQAkbKxJnaQ";

export const muscleDictionary = {
  'chest_upper': { EN: 'Upper Chest', ID: 'Dada Atas' },
  'chest_mid': { EN: 'Mid Chest', ID: 'Dada Tengah' },
  'chest_lower': { EN: 'Lower Chest', ID: 'Dada Bwh' },
  'back_upper': { EN: 'Upper Back', ID: 'Punggung Atas' },
  'lats': { EN: 'Lats', ID: 'Punggung Bwh' },
  'deltoid_front': { EN: 'Front Delt', ID: 'Bahu Dpn' },
  'deltoid_lateral': { EN: 'Lateral Delt', ID: 'Bahu Samping' },
  'deltoid_rear': { EN: 'Rear Delt', ID: 'Bahu Blk' },
  'trapezius': { EN: 'Traps', ID: 'Traps' },
  'neck': { EN: 'Neck', ID: 'Leher' },
  'biceps': { EN: 'Biceps', ID: 'Biceps' },
  'triceps': { EN: 'Triceps', ID: 'Triceps' },
  'forearm': { EN: 'Forearm', ID: 'Lengan Bawah' },
  'quadriceps': { EN: 'Quads', ID: 'Paha Dpn' },
  'hamstring': { EN: 'Hamstrings', ID: 'Paha Blk' },
  'glutes': { EN: 'Glutes', ID: 'Bokong' },
  'adductors': { EN: 'Adductors', ID: 'Paha Dlm' },
  'abductors': { EN: 'Abductors', ID: 'Paha Luar' },
  'calves': { EN: 'Calves', ID: 'Betis' },
  'core': { EN: 'Core / Abs', ID: 'Perut / Core' },
  'cardio': { EN: 'Cardio', ID: 'Kardio' },
  'full_body': { EN: 'Full Body', ID: 'Seluruh Tubuh' }
};

export const muscleOptions = Object.keys(muscleDictionary);

export const normalizeMuscleKey = (str) => {
  if (!str) return 'full_body';
  if (typeof str !== 'string') str = String(str);
  if (muscleDictionary[str]) return str;
  const s = str.toLowerCase().trim();
  if (s.includes('dada atas') || s.includes('upper chest')) return 'chest_upper';
  if (s.includes('dada tengah') || s.includes('mid chest')) return 'chest_mid';
  if (s.includes('dada bawah') || s.includes('lower chest')) return 'chest_lower';
  if (s.includes('punggung atas') || s.includes('upper back') || s.includes('mid back') || s.includes('middle back') || s.includes('punggung tengah')) return 'back_upper';
  if (s.includes('lats') || s.includes('sayap') || s.includes('lower back') || s.includes('punggung bawah')) return 'lats';
  if (s.includes('forearm') || s.includes('lengan bawah')) return 'forearm';
  if (s.includes('deltoid depan') || s.includes('front delt')) return 'deltoid_front';
  if (s.includes('deltoid samping') || s.includes('lateral delt') || s === 'lateral') return 'deltoid_lateral';
  if (s.includes('deltoid belakang') || s.includes('rear delt') || s === 'rear') return 'deltoid_rear';
  if (s.includes('traps') || s.includes('trapezius')) return 'trapezius';
  if (s.includes('leher') || s.includes('neck')) return 'neck';
  if (s.includes('biceps')) return 'biceps';
  if (s.includes('triceps')) return 'triceps';
  if (s.includes('quads') || s.includes('paha depan')) return 'quadriceps';
  if (s.includes('hams') || s.includes('paha belakang')) return 'hamstring';
  if (s.includes('glutes') || s.includes('bokong')) return 'glutes';
  if (s.includes('adductors') || s.includes('paha dlm') || s.includes('paha dalam')) return 'adductors';
  if (s.includes('abductors') || s.includes('paha luar')) return 'abductors';
  if (s.includes('calves') || s.includes('betis')) return 'calves';
  if (s.includes('core') || s.includes('abs') || s.includes('perut') || s.includes('abdominal')) return 'core';
  if (s.includes('cardio') || s.includes('kardio')) return 'cardio';
  return 'full_body';
};

export const formatTarget = (t, language = 'ID') => {
  // muscleDictionary keys-nya 'EN'/'ID' uppercase — normalisasi di sini supaya kalau ada
  // state bahasa kesimpan lowercase (pernah kejadian saat reset logout), badge target otot
  // tidak diam-diam kosong lagi.
  const langKey = (language || 'ID').toUpperCase();
  if (Array.isArray(t)) {
    return t.map(m => {
        const key = normalizeMuscleKey(m);
        return muscleDictionary[key] ? muscleDictionary[key][langKey] : m;
    }).join(', ');
  }
  const key = normalizeMuscleKey(t);
  return muscleDictionary[key] ? muscleDictionary[key][langKey] : (t || 'Lainnya');
};

export const getLocalYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Kartu "terjadwal" di WorkoutTab/CalendarTab dibikin dengan id komposit
// `projected_${programId}_${YYYY-MM-DD}`. Sebelumnya di-parse balik pakai
// `.replace('projected_','').split('_')[0]` — itu ngambil cuma SEGMEN PERTAMA sebelum
// underscore, jadi rusak buat program bikinan AI yang id-nya sendiri punya underscore
// (mis. `routine_ai_1783708143704_0` jadi kepotong cuma `routine`). Regex ini strip
// prefix & suffix tanggal SAJA, id di tengahnya (apa pun isinya) tetap utuh.
export const resolveProjectedProgramId = (id) => {
  return String(id || '')
    .replace(/^projected_/, '')
    .replace(/_\d{4}-\d{2}-\d{2}$/, '');
};

// Satu-satunya sumber daftar sesi per tanggal. WorkoutTab & CalendarTab dulu punya
// salinan logika ini masing-masing dan sudah keburu beda: versi WorkoutTab lupa baca
// `deletedProjected`, jadi sesi yang dihapus di kalender tetap nongol di tab latihan.
// Semua penambahan aturan harus di sini, jangan disalin lagi ke halaman.
const DAY_MAP = { 0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };

// `deletedProjected` = penanda "sesi terjadwal ini sudah dihapus user" per tanggal.
// Bentuknya MAP ber-key programId (nilai `true`), alasannya sama persis dengan `workouts`:
// array tidak bisa di-merge Firestore, jadi dua device yang menghapus sesi berbeda di tanggal
// yang sama akan saling menimpa. Sebagai map, Firestore menggabungkan per-key.
// Data lama berbentuk array masih dibaca — normalisasi cuma di dua fungsi ini.
// Konsekuensi merge map: key yang tidak disebut dibiarkan hidup. Kalau nanti ada fitur
// "batalkan hapus", key-nya harus dikirim eksplisit sebagai deleteField(), sama seperti sesi.
export const deletedProjectedMap = (dp) => {
  if (Array.isArray(dp)) return Object.fromEntries(dp.map(id => [String(id), true]));
  if (dp && typeof dp === 'object') return { ...dp };
  return {};
};

export const hasDeletedProjected = (dayData) =>
  Object.keys(deletedProjectedMap(dayData?.deletedProjected)).length > 0;

/**
 * Cari latihan yang dimaksud sebuah KUNCI LOG, dari peta id -> latihan.
 *
 * Kunci log punya beberapa bentuk yang hidup berdampingan:
 *   "101"                                    id angka polos
 *   "101-prog-1"                             id angka + id sesi (sesi program)
 *   "3fa85f64-5717-4562-b3fc-2c963f66afa6"   id UUID (dari Tambah/Ganti Latihan)
 *   "3fa85f64-...-afa6-w1"                   id UUID + id sesi
 *   "123-1786258529614"                      latihan ekstra (id + stempel waktu)
 *
 * Cara lama `Number(key.split('-')[0])` benar HANYA untuk dua bentuk pertama. Untuk id UUID ia
 * memotong di tanda hubung pertama lalu `Number("3fa85f64")` = NaN, latihannya tidak ketemu, dan
 * seluruh datanya DIAM-DIAM HILANG dari grafik progres — bukan salah hitung, tapi tidak muncul
 * sama sekali. Setiap latihan yang pernah ditambahkan/diganti user kena.
 *
 * Di sini dicoba dari yang paling panjang: kunci utuh dulu, baru dikupas satu potong dari
 * belakang. Urutan itu penting — kalau dari yang terpendek, UUID akan tercocokkan ke potongan
 * pertamanya dan bisa nyasar ke latihan lain.
 */
export const exerciseAliasMap = {
  '101': 'edb-Smith_Machine_Incline_Bench_Press',
  '102': 'edb-Seated_Cable_Rows',
  '103': 'edb-Dumbbell_Bench_Press',
  '104': 'edb-Standing_Cable_Lateral_Raise',
  '105': 'edb-Triceps_Pushdown',
  '106': 'edb-Dumbbell_Alternate_Bicep_Curl',
  '107': 'edb-107',
  '108': 'edb-Smith_Machine_Squat',
  '109': 'edb-Romanian_Deadlift',
  '110': 'edb-Dumbbell_Lunges',
  '111': 'edb-Rocking_Standing_Calf_Raise',
  '112': 'edb-Cable_Crunch',
  '113': 'edb-Wide-Grip_Lat_Pulldown',
  '114': 'edb-Dumbbell_Shoulder_Press',
  '115': 'edb-Smith_Machine_Bench_Press',
  '116': 'edb-Cable_Rear_Delt_Fly',
  '117': 'edb-Cable_Rope_Overhead_Triceps_Extension',
  '118': 'edb-Standing_Biceps_Cable_Curl',
  '119': 'edb-Split_Squat_with_Dumbbells',
  '120': 'edb-Smith_Machine_Stiff-Legged_Deadlift',
  '121': 'edb-Cable_Hip_Abduction',
  '122': 'edb-Seated_Calf_Raise',
  '123': 'edb-Plank',
  '124': 'edb-Dumbbell_Shrug',
  '125': 'edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench',
  '126': 'edb-126',
  '127': 'edb-127',
  '128': 'edb-128',
  '129': 'edb-129',
  '130': 'edb-130',
  '131': 'edb-131',
  '132': 'edb-Elliptical_Trainer',
  '133': 'edb-133',
  '134': 'edb-Goblet_Squat',
  '135': 'edb-Barbell_Bench_Press_-_Medium_Grip',
  '136': 'edb-136',
  '137': 'edb-137',
  '138': 'edb-138',
  '139': 'edb-139',
  '140': 'edb-Pull_Through',
  '141': 'edb-Trail_Running_Walking',
  '142': 'edb-Barbell_Incline_Bench_Press_-_Medium_Grip'
};

export const resolveLoggedExercise = (logKey, exLookup) => {
  if (logKey === null || logKey === undefined || !exLookup) return undefined;
  const key = String(logKey);
  if (exLookup[key]) return exLookup[key];
  if (exerciseAliasMap[key] && exLookup[exerciseAliasMap[key]]) {
    return exLookup[exerciseAliasMap[key]];
  }

  const parts = key.split('-');
  for (let i = parts.length - 1; i > 0; i--) {
    const head = parts.slice(0, i).join('-');
    if (exLookup[head]) return exLookup[head];
    if (exerciseAliasMap[head] && exLookup[exerciseAliasMap[head]]) {
      return exLookup[exerciseAliasMap[head]];
    }
  }
  return undefined;
};

/**
 * Pisahkan log satu HARI menjadi "milik sesi yang sedang disimpan" dan "sisa".
 *
 * `exerciseLogs`, `skippedExercises`, dan `extraExercises` adalah state SATU HARI, bukan satu
 * sesi. Dulu handleSaveWorkout memperlakukan semuanya sebagai milik sesi yang disimpan: log
 * treadmill di sesi Ekstra yang belum disimpan ikut ditulis ke `log` sesi beban, lalu
 * `extraExercises` dikosongkan — kartu Ekstra "Belum disimpan" di kalender lenyap dan
 * treadmillnya hilang permanen.
 *
 * Cara mengenali pemilik sebuah kunci:
 *  - Latihan ekstra: kuncinya PERSIS id di `extraExercises` (`${libId}-${stempelWaktu}`).
 *  - Sesi program: WorkoutTab merakit id majemuk `${ex.id}-${w.id}`, jadi kuncinya berakhiran
 *    `-${workoutId}`.
 *
 * Kalau tidak ada satu kunci pun yang cocok dengan sufiks itu (riwayat lama berkunci polos "101"),
 * SEMUA kunci non-ekstra dianggap milik sesi itu. Fallback ini disengaja: sesi yang tersimpan
 * dengan log kosong jauh lebih merusak daripada sesi yang lognya kelebihan.
 *
 * Lihat juga resolveLoggedExercise di atas soal lima bentuk kunci — jangan pernah
 * `key.split('-')[0]`.
 */
export const splitSessionLogs = (exerciseLogs, { progId, workoutId, extraExercises, sessionExercises } = {}) => {
  const semua = exerciseLogs || {};
  const idEkstra = new Set((extraExercises || []).map(ex => String(ex?.id)));
  const idSession = sessionExercises && sessionExercises.length > 0
    ? new Set(sessionExercises.map(ex => String(ex?.id)))
    : null;
  const kunci = Object.keys(semua);

  let milik;
  if (progId === 'extra') {
    milik = new Set(kunci.filter(k => idEkstra.has(String(k))));
  } else {
    const nonEkstra = kunci.filter(k => !idEkstra.has(String(k)));
    const sufiks = [workoutId, progId].filter(Boolean).map(id => `-${id}`);
    const cocok = sufiks.length > 0
      ? nonEkstra.filter(k => sufiks.some(s => String(k).endsWith(s)))
      : [];

    if (cocok.length > 0) {
      milik = new Set(cocok);
    } else if (idSession && idSession.size > 0) {
      milik = new Set(nonEkstra.filter(k => {
        const rawId = String(k).includes('-') ? String(k).slice(0, String(k).lastIndexOf('-')) : String(k);
        return idSession.has(String(k)) || idSession.has(rawId);
      }));
    } else {
      milik = new Set(nonEkstra);
    }
  }

  const milikSesi = {};
  const sisa = {};
  kunci.forEach(k => { (milik.has(k) ? milikSesi : sisa)[k] = semua[k]; });
  return { milikSesi, sisa };
};

// Field bioData yang PEMILIKNYA Lomeal, bukan Logym. Lomeal menulis langsung ke history_years
// Logym (lihat lomeal-app/src/utils/biometricSync.js) untuk SEMUA hari yang berubah, termasuk hari
// lampau — jadi salurannya sudah benar dan Logym cukup berhenti menimpanya.
//
// Tanda tangannya: Lomeal menaruh boolean `true` di _manualFlags, sedangkan simpanan manual Logym
// sendiri menaruh ANGKA yang diketik user (lihat handleSaveManualData di DashboardTab). Perbedaan
// itulah yang dipakai membedakan pemiliknya tanpa perlu mengubah repo Lomeal.
//
// Kalau hari itu TIDAK dimiliki Lomeal, isian manual Logym tetap hidup — itu jalur untuk sumber
// lain (mis. MyFitnessPal lewat Health Connect).
export const isLomealOwned = (bioData, field) => bioData?._manualFlags?.[field] === true;

// Basis angka manual sebuah field, apa pun yang menuliskannya. Logym menyimpan angkanya di
// _manualFlags; Lomeal cuma menyimpan `true` di situ dan angkanya di bioData. Tanpa pembedaan ini
// `Number(true)` = 1, dan override kalori dari Lomeal runtuh jadi 1 kkal.
export const manualFieldValue = (bioData, field) => {
  const flag = bioData?._manualFlags?.[field];
  if (flag === undefined) return 0;
  if (flag === true) return Number(bioData?.[field]) || 0;
  return Number(flag) || 0;
};

/**
 * Payload ringkasan aktivitas Logym untuk disinkronkan ke dokumen root user (`logym_users/{uid}`)
 * agar aplikasi Lomeal dapat membaca jumlah sesi/latihan dan kalori terbakar hari ini secara live.
 */
export const buildLogymSyncPayload = (history, userWeight = 70, targetDateStr = null) => {
  const todayStr = targetDateStr || getLocalYMD(new Date());
  const todayData = history?.[todayStr] || {};
  const completedWorkouts = (todayData.workouts || []).filter(w => w?.status === 'completed');

  let completedExercisesCount = 0;
  completedWorkouts.forEach(w => {
    const exs = w.overriddenExercises || w.exercises || [];
    const log = w.log || {};
    exs.forEach(ex => {
      const sLog = log[ex.id] || Object.entries(log).find(([k]) => k === String(ex.id) || k.startsWith(`${ex.id}-`))?.[1];
      if (sLog && Object.values(sLog).some(s => s?.done && !s?.skipped)) {
        completedExercisesCount++;
      }
    });
  });

  const activityKcal = Number(todayData.bioData?.activityCalories) || 0;

  return {
    logymSync: {
      today: {
        ymd: todayStr,
        kcal: activityKcal,
        workoutCalories: activityKcal,
        workoutsCount: completedWorkouts.length,
        sessionsCount: completedWorkouts.length,
        exercisesCount: completedExercisesCount,
        updatedAt: Date.now()
      }
    }
  };
};

export const getDayWorkouts = (history, programs, activePlanIds, dateStr) => {
  const dData = history?.[dateStr] || {};
  const historical = Array.isArray(dData.workouts) ? dData.workouts : [];
  const deletedProjected = deletedProjectedMap(dData.deletedProjected);

  const validHistorical = historical.filter(w => {
    if (w.status === 'completed' || w.programId === 'adhoc') {
      if (w.programId === 'adhoc' && (!w.exercises || w.exercises.length === 0)) return false;
      return true;
    }
    const p = programs.find(prog => prog.id === w.programId);
    if (!p) return false; // program aslinya sudah dihapus
    return activePlanIds.includes(p.planId || 'custom');
  });

  // URUTAN: sesi program dulu, sesi Ekstra paling bawah.
  //
  // Dulu urutannya cuma "yang tersimpan dulu, yang terjadwal ditempel di belakang". Sesi Ekstra
  // adalah entri tersimpan, sedangkan sesi utama sering masih berstatus terjadwal — jadi Ekstra
  // naik ke atas sesi utamanya sendiri. Ekstra itu tambahan di luar program; tempatnya di bawah,
  // apa pun status sesi utamanya.
  const result = validHistorical.filter(w => w.programId !== 'adhoc');
  const ekstra = validHistorical.filter(w => w.programId === 'adhoc');

  if (activePlanIds.length > 0) {
    const dayName = DAY_MAP[new Date(dateStr).getDay()];
    programs
      .filter(p => activePlanIds.includes(p.planId || 'custom'))
      .filter(r => r.assignedDays && r.assignedDays.includes(dayName))
      .forEach(pr => {
        if (deletedProjected[String(pr.id)]) return;
        if (validHistorical.some(w => w.programId === pr.id)) return;
        result.push({
          id: `projected_${pr.id}_${dateStr}`,
          programId: pr.id,
          programName: pr.name,
          status: 'planned',
          isProjected: true,
          log: {}
        });
      });
  }

  result.push(...ekstra);

  // Pengaman render: buang id kembar (sisa program duplikat yang belum ke-upload bersih).
  const seen = new Set();
  return result.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
};

/**
 * Berapa hari TERJADWAL yang dilewatkan, dihitung mundur dari kemarin.
 *
 * Versi lama menghitung "hari sejak latihan terakhir selesai", bukan hari terjadwal yang
 * dilewatkan — program 3x seminggu otomatis menembus ambang 2 hari SETIAP MINGGU, sehingga
 * notifikasi "kamu bolos" muncul terus padahal jadwalnya diikuti sempurna.
 *
 * Hari ini sengaja tidak dihitung: harinya belum selesai, latihannya belum tentu dilewatkan.
 *
 * Semua tanggal diurai sebagai waktu LOKAL. `new Date('YYYY-MM-DD')` diurai sebagai tengah
 * malam UTC sementara Date.now() waktu lokal — di WIB (+7) itu menggeser hitungan sampai
 * satu hari penuh.
 */
export const countMissedScheduledDays = (history, programs, activePlanIds, todayYmd, maxLookback = 60) => {
  const hariLokal = (ymd) => new Date(`${ymd}T00:00:00`);
  const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Tanpa riwayat sama sekali, tidak ada yang bisa "dilewatkan": user baru bukan pembolos.
  // Tanpa batas ini, penelusuran berjalan sampai maxLookback dan menuduh pemakai hari pertama
  // sudah bolos belasan hari.
  const tanggalRiwayat = Object.keys(history || {}).sort();
  if (tanggalRiwayat.length === 0) return 0;
  const palingAwal = tanggalRiwayat[0];

  let missed = 0;
  const cursor = hariLokal(todayYmd);
  for (let i = 0; i < maxLookback; i++) {
    cursor.setDate(cursor.getDate() - 1); // mulai dari KEMARIN
    const ymd = ymdOf(cursor);
    if (ymd < palingAwal) break;                                // sebelum user mulai memakai app
    const workouts = getDayWorkouts(history, programs, activePlanIds, ymd);
    if (workouts.length === 0) continue;                        // hari istirahat, bukan bolos
    if (workouts.some(w => w.status === 'completed')) break;    // ketemu hari latihan — berhenti
    missed++;
  }
  return missed;
};

export const getVideoId = (url) => {
  if (!url) return null;
  try {
    const srcMatch = url.match(/src="([^"]+)"/);
    const urlToParse = srcMatch ? srcMatch[1] : url;
    const match = urlToParse.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  } catch (e) { return null;  }
};

/**
 * Saring pustaka menurut alat yang tersedia di gym aktif.
 *
 * DUA KEKECUALIAN, dan keduanya memperbaiki latihan yang selama ini hilang diam-diam:
 *
 * 1. BODY WEIGHT SELALU ADA. Kamu tidak pernah kekurangan badanmu sendiri. Selama ini Plank,
 *    Aerobic, HIIT, Pilates, Yoga, Jogging, dan Walking ikut lenyap dari "Ganti Latihan" begitu
 *    sebuah gym tidak mencentang "Body Weight" — sehingga plank cuma bisa dimasukkan lewat
 *    Latihan Ekstra dan tidak bisa menggantikan latihan yang sudah ada.
 *
 * 2. ALAT YANG TIDAK ADA DI equipmentOptions TIDAK PERNAH DISEMBUNYIKAN. Kalau sebuah nilai tidak
 *    bisa dicentang di GymManagerModal, ketidakhadirannya di daftar gym bukan keputusan user —
 *    itu cuma nilai yang tidak dikenal. Menyaringnya berarti menyembunyikan selamanya tanpa ada
 *    setelan apa pun yang bisa mengembalikannya. Yang kena: "Swimming (Renang)" (alat `Pool`)
 *    dan "Cycling / Sepeda" (alat `Bicycle`), plus SEMUA latihan online — translateEquipment
 *    mengembalikan Title Case dari nilai API apa pun, jadi sebagian besar jatuh di luar 32 opsi.
 */
export const filterByGymEquipment = (list, activeGym) => {
  const alat = activeGym?.equipment;
  if (alat === 'all' || !Array.isArray(alat)) return list || [];
  const dikenal = new Set(equipmentOptions);
  return (list || []).filter((ex) => {
    const eq = ex?.equipment;
    if (eq === 'Body Weight') return true;
    if (!dikenal.has(eq)) return true;
    return alat.includes(eq);
  });
};

/**
 * Deretan tanggal untuk strip kalender mingguan, `jumlahMinggu` minggu sekaligus.
 *
 * Di layar lebar satu baris tujuh hari menyisakan ruang kosong yang sia-sia, jadi jumlah
 * minggunya mengikuti lebar layar. Minggu tambahan diambil ke BELAKANG (minggu-minggu sebelumnya),
 * bukan ke depan: yang berguna saat menyisir catatan latihan adalah apa yang sudah dikerjakan,
 * bukan hari yang belum datang. Minggu berisi `baseDate` selalu jadi yang TERAKHIR.
 *
 * @param {Date} baseDate tanggal acuan
 * @param {number} weekStartDay 0 = Minggu, 1 = Senin
 * @param {number} jumlahMinggu berapa minggu dirender
 * @returns {Date[]} 7 x jumlahMinggu tanggal, urut lama -> baru
 */
export const weekStripDates = (baseDate, weekStartDay = 0, jumlahMinggu = 1) => {
  const n = Math.max(1, Math.floor(Number(jumlahMinggu) || 1));
  const dasar = baseDate instanceof Date && !Number.isNaN(baseDate.getTime()) ? baseDate : new Date();
  const geser = (dasar.getDay() - weekStartDay + 7) % 7;
  const mulai = new Date(dasar.getFullYear(), dasar.getMonth(), dasar.getDate() - geser - (n - 1) * 7);
  const keluar = [];
  for (let i = 0; i < n * 7; i++) {
    keluar.push(new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + i));
  }
  return keluar;
};
