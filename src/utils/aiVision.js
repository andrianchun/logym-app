export async function extractBiometricsFromImage(base64Image, mimeType, userApiKey = null) {
    try {
        if (userApiKey && userApiKey.trim() !== '') {
            // Client-side fallback: direct to Google Gemini API
            const prompt = `You are a highly advanced medical and fitness data extractor. Analyze the provided image, which may be a screenshot of a health app, a smart scale app (like Zepp Life, Mi Fit, Garmin, Huawei Health, Renpho), a smartwatch screen, or a medical document.
Extract all numerical biometric data and fitness metrics you can find.
Pay close attention to all available fields like Body Score, BMR, Visceral Fat, Body Water, Protein, Body Age, etc.
Format your response STRICTLY as a valid JSON object matching this schema. Use null if a field is completely missing or cannot be inferred.
Ensure numbers are extracted accurately (e.g., 56.6 instead of 566).
For sleep, use "Hh Mm" format (e.g., "7h 30m").

{
  "weight": number (kg),
  "height": number (cm),
  "bmi": number,
  "bodyFat": number (%),
  "muscleMass": number (kg),
  "musclePercent": number (%),
  "boneMass": number (kg),
  "visceralFat": number,
  "waterPercent": number (%),
  "proteinPercent": number (%),
  "bmr": number (kcal),
  "bodyAge": number,
  "bodyScore": number,
  "bellyCircumference": number (cm),
  "steps": number,
  "activeMinutes": number,
  "activityCalories": number,
  "sleep": string,
  "energyScore": number,
  "heartRate": number,
  "minHeartRate": number,
  "maxHeartRate": number,
  "weeklySessions": number,
  "weeklyDuration": number,
  "bloodPressure": string
}`;
            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType || 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }]
            };

            const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
            let res = null;
            let rawText = '';
            let errorMsg = 'Unknown server error';

            for (const model of modelsToTry) {
                try {
                    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey.trim()}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        break; // Berhasil! Keluar dari loop
                    }

                    if (res.status === 429) {
                        throw new Error('RATE_LIMIT_EXCEEDED');
                    }

                    rawText = await res.text();
                    errorMsg = `Server Error (${res.status}) on ${model}: ${rawText.substring(0, 50)}...`;
                    
                    try {
                        const errData = JSON.parse(rawText);
                        if (errData && errData.error) errorMsg = errData.error.message || errData.error;
                    } catch (e) {}

                    // Jika error 503 (Unavailable) atau 404 (Not Found), biarkan loop mencoba model berikutnya
                    if (res.status !== 503 && res.status !== 404) {
                        throw new Error(errorMsg); // Error fatal lain, langsung berhenti
                    }
                } catch (err) {
                    if (err.message === 'RATE_LIMIT_EXCEEDED' || (errorMsg && err.message !== errorMsg && err.message !== 'RATE_LIMIT_EXCEEDED')) {
                        throw err; // Lempar error network atau rate limit
                    }
                }
            }

            if (!res || !res.ok) {
                throw new Error(errorMsg);
            }

            const data = await res.json();
            let extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            return JSON.parse(extractedText);

        } else {
            // Server-side default: use Netlify Function proxy
            const res = await fetch('/.netlify/functions/scanBiometrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64Image,
                    mimeType: mimeType || 'image/jpeg'
                })
            });

            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error('RATE_LIMIT_EXCEEDED');
                }
                
                // Baca sebagai text sekali saja (mencegah 'body stream already read' error)
                const rawText = await res.text();
                let errorMsg = `Server Error (${res.status}): ${rawText.substring(0, 50)}...`;
                
                try {
                    // Coba parse jadi JSON, kalau valid dan ada error message, pakai itu
                    const errData = JSON.parse(rawText);
                    if (errData && errData.error) errorMsg = errData.error;
                } catch (parseErr) {
                    // Biarkan errorMsg sebagai plain text jika bukan JSON
                }
                throw new Error(errorMsg);
            }

            return await res.json();
        }
    } catch (error) {
        console.error("AI Vision Error:", error);
        throw error;
    }
}
