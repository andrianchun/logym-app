import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Shared API keys sekarang hidup di backend (functions/.env), bukan di bundle client.
// Alur: key pribadi user dipanggil langsung dari browser; tanpa key -> proxy Cloud Functions.

export async function extractBiometricsFromImage(base64Image, mimeType, userApiKeys = [], aiProvider = 'google', aiModel = 'gemini-3.5-flash', setKeyStatuses = null) {
    const keys = Array.isArray(userApiKeys) ? userApiKeys : [userApiKeys];
    const validKeys = keys.filter(k => k && typeof k === 'string' && k.trim() !== '');

    let providerKeys = [];
    if (aiProvider === 'google') providerKeys = validKeys.filter(k => !k.trim().startsWith('sk-'));
    else if (aiProvider === 'openai') providerKeys = validKeys.filter(k => k.trim().startsWith('sk-') && !k.trim().startsWith('sk-ant'));

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

    if (providerKeys.length > 0) {
        let lastError = null;

        for (let i = 0; i < providerKeys.length; i++) {
            const key = providerKeys[i].trim();
            try {
                let res = null;
                let rawText = '';
                let errorMsg = 'Unknown server error';
                
                if (aiProvider === 'google') {
                    const payload = {
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Image } }
                            ]
                        }]
                    };
                    const googleModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
                    const preferredModel = googleModels.includes(aiModel) ? aiModel : 'gemini-3.5-flash';
                    const modelFallbackChain = [preferredModel, ...googleModels.filter(m => m !== preferredModel)];

                    let visionResult = null;
                    for (let mIdx = 0; mIdx < modelFallbackChain.length; mIdx++) {
                        const model = modelFallbackChain[mIdx];
                        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const isLastModel = mIdx === modelFallbackChain.length - 1;
                        if ((res.status === 404 || res.status === 403 || res.status === 400 || res.status === 429 || res.status === 503) && !isLastModel) {
                            continue; // Try next model for this key
                        }
                        if (!res.ok) {
                            if (res.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
                            rawText = await res.text();
                            throw new Error(`Google API Error (${res.status}): ${rawText.substring(0, 50)}`);
                        }
                        visionResult = res;
                        break;
                    }
                    if (!visionResult) throw new Error('All Gemini models failed for this key.');
                    res = visionResult;
                } else if (aiProvider === 'openai') {
                    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
                    const model = validModels.includes(aiModel) ? aiModel : 'gpt-4o-mini';
                    const payload = {
                        model: model,
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: prompt },
                                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                                ]
                            }
                        ],
                        response_format: { type: 'json_object' }
                    };
                    res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify(payload)
                    });
                } else if (aiProvider === 'anthropic') {
                    const validModels = ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'];
                    const model = validModels.includes(aiModel) ? aiModel : 'claude-haiku-4-5';
                    const payload = {
                        model: model,
                        max_tokens: 1024,
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
                                    { type: 'text', text: prompt }
                                ]
                            }
                        ]
                    };
                    res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                        body: JSON.stringify(payload)
                    });
                }

                if (!res || !res.ok) {
                    if (res && !rawText) rawText = await res.text();
                    throw new Error(errorMsg + " " + rawText.substring(0, 50));
                }

                const data = await res.json();
                let extractedText = '';
                if (aiProvider === 'google') extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                else if (aiProvider === 'openai') extractedText = data.choices?.[0]?.message?.content || '{}';
                else if (aiProvider === 'anthropic') extractedText = data.content?.[0]?.text || '{}';
                
                extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
                return JSON.parse(extractedText);

            } catch (err) {
                console.error(`AI Vision Error (Key ${i + 1}/${providerKeys.length}):`, err);
                lastError = err;
                
                const errMsg = err.message || '';
                const statusMatch = errMsg.match(/\((\d{3})\)/);
                const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
                const isFallbackable =
                    (statusCode !== null && (statusCode === 401 || statusCode === 403 || statusCode === 429 || statusCode >= 500)) ||
                    errMsg.includes('RATE_LIMIT_EXCEEDED') || errMsg.includes('Failed to fetch') ||
                    errMsg.includes('All Gemini models failed');

                if (isFallbackable && setKeyStatuses) {
                    setKeyStatuses(prev => ({ ...prev, [key]: Date.now() }));
                }

                if (!isFallbackable) {
                    throw err;
                }
            }
        }

    }

    // Tanpa key pribadi, atau semua key pribadi gagal: pakai backend proxy (shared keys di server)
    try {
        const call = httpsCallable(functions, 'aiVision', { timeout: 120000 });
        const res = await call({
            imageBase64: base64Image,
            mimeType: mimeType || 'image/jpeg',
            prompt,
            provider: aiProvider,
            model: aiModel
        });
        let extractedText = res.data?.text || '{}';
        extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        return JSON.parse(extractedText);
    } catch (backendErr) {
        console.error('AI Vision backend proxy error:', backendErr);
        throw new Error(backendErr.message || 'Ekstraksi AI gagal. Coba lagi nanti.');
    }
}
