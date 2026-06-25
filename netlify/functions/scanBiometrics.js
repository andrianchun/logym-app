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

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const apiResponse = await new Promise((resolve, reject) => {
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

        if (apiResponse.statusCode !== 200) {
            // Check for rate limit
            if (apiResponse.statusCode === 429) {
                 return {
                    statusCode: 429,
                    body: JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' })
                 };
            }
            return {
                statusCode: apiResponse.statusCode,
                body: JSON.stringify({ error: 'Failed to call Gemini API', details: apiResponse.body })
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
