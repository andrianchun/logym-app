const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { imageBase64, mimeType } = body;
        
        if (!imageBase64) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Image data is missing' }) };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server API key missing' }) };
        }

        const prompt = `You are a highly advanced medical and fitness data extractor. Analyze the provided image, which may be a screenshot of a health app, a smart scale app (like Zepp Life, Mi Fit, Garmin, Huawei Health, Renpho), a smartwatch screen, or a medical document.
Extract all numerical biometric data and fitness metrics you can find.
Pay close attention to all available fields like Body Score, BMR, Visceral Fat, Body Water, Protein, Body Age, etc.
Format your response STRICTLY as a valid JSON object matching this schema. Use null if a field is completely missing or cannot be inferred.
Ensure numbers are extracted accurately (e.g., 56.6 instead of 566).
For sleep, use "Hh Mm" format (e.g., "7h 30m").

{
  "weight": number (kg),
  "height": number (cm),
  "bodyFat": number (%),
  "muscleMass": number (kg),
  "musclePercent": number (%),
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

        const payload = JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    }
                ]
            }]
        });

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
        let apiResponse = null;

        for (const model of modelsToTry) {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                port: 443,
                path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };

            apiResponse = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        resolve({ statusCode: res.statusCode, body: data });
                    });
                });
                req.on('error', (e) => reject(e));
                req.write(payload);
                req.end();
            });

            if (apiResponse.statusCode === 200) {
                break; // Berhasil, keluar dari loop
            }
            if (apiResponse.statusCode === 429) {
                return { statusCode: 429, body: JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }) };
            }
            // Jika error 503 (Unavailable) atau 404 (Not Found), lanjut ke iterasi loop model berikutnya
            if (apiResponse.statusCode !== 503 && apiResponse.statusCode !== 404) {
                 break; // Berhenti jika error lain yang tidak bisa difix dengan ganti model
            }
        }

        if (apiResponse.statusCode !== 200) {
            let errMsg = 'Failed to call Gemini API';
            try {
                const parsed = JSON.parse(apiResponse.body);
                if (parsed.error && parsed.error.message) errMsg = parsed.error.message;
            } catch (e) {}
            
            return {
                statusCode: apiResponse.statusCode,
                body: JSON.stringify({ error: errMsg, details: apiResponse.body })
            };
        }

        const jsonRes = JSON.parse(apiResponse.body);
        let extractedText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        // Strip markdown backticks if Gemini ignores instruction
        extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        // Validate JSON
        let parsedData = {};
        try {
            parsedData = JSON.parse(extractedText);
        } catch(e) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to parse AI JSON', rawText: extractedText })
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedData)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.toString() })
        };
    }
};
