export async function extractBiometricsFromImage(base64Image, mimeType, userApiKey = null) {
    try {
        if (userApiKey && userApiKey.trim() !== '') {
            // Client-side fallback: direct to Google Gemini API
            const prompt = `Extract biometric and activity data from this image. 
Return ONLY a valid JSON object matching the exact keys below. Use numeric values, except for 'sleep' which should be a string (e.g. "7h 30m"). If a value is not found, omit the key or set it to null.
Do NOT wrap the response in markdown code blocks. Just return the raw JSON object.
Expected keys:
{
  "steps": number,
  "activeMinutes": number,
  "activityCalories": number,
  "sleep": string,
  "energyScore": number,
  "weight": number,
  "bodyFat": number,
  "muscleMass": number,
  "heartRate": number,
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

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userApiKey.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error('RATE_LIMIT_EXCEEDED');
                }
                const errData = await res.text();
                throw new Error(`Google API Error: ${errData}`);
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
                const errData = await res.json();
                throw new Error(errData.error || 'Unknown server error');
            }

            return await res.json();
        }
    } catch (error) {
        console.error("AI Vision Error:", error);
        throw error;
    }
}
