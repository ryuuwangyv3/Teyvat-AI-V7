// Ganti ke SDK resmi agar stabil di Vite
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { addWavHeader } from "../../utils/audioUtils";
import { getAvailableKeys, markKeyExhausted } from "../apiKeyStore";

/**
 * Helper: Eksekusi fungsi dengan rotasi API Key otomatis.
 * Jika satu key kena limit (429), dia otomatis ganti ke key berikutnya.
 */
async function executeWithRotation<T>(
    operation: (genAI: GoogleGenerativeAI, currentKey: string) => Promise<T>
): Promise<T> {
    const keys = getAvailableKeys('google');
    
    if (keys.length === 0) {
        throw new Error("Akasha System: No valid Google/Gemini API keys found in Vault or Environment.");
    }

    let lastError: any;

    for (const apiKey of keys) {
        try {
            // Inisialisasi SDK resmi
            const genAI = new GoogleGenerativeAI(apiKey);
            return await operation(genAI, apiKey);
        } catch (error: any) {
            lastError = error;
            const msg = error.message?.toUpperCase() || '';
            
            // Deteksi Error Quota atau Limit
            const isQuotaError = 
                msg.includes('429') || 
                msg.includes('403') || 
                msg.includes('QUOTA') || 
                msg.includes('EXHAUSTED') || 
                msg.includes('RESOURCE_EXHAUSTED');
            
            if (isQuotaError) {
                console.warn(`[Akasha Auth] Key ${apiKey.substring(0,8)}... exhausted. Rotating...`);
                markKeyExhausted(apiKey);
                continue; // Lanjut ke key berikutnya
            } else {
                // Jika error teknis/syntax, langsung lempar keluar
                throw error;
            }
        }
    }

    throw new Error(`Akasha Critical: All resonance keys failed. Last error: ${lastError?.message}`);
}

/**
 * Handle Chat & Text Generation
 */
export const handleGoogleTextRequest = async (modelId: string, contents: any[], systemInstruction: string) => {
    return executeWithRotation(async (genAI) => {
        // Gunakan model terbaru 2026 atau fallback ke flash
        const targetModelId = modelId.includes('gemini') ? modelId : 'gemini-1.5-flash';
        
        const model = genAI.getGenerativeModel({
            model: targetModelId,
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                maxOutputTokens: 4096,
            }
        });

        // Catatan: Google Search Tool di SDK client-side terkadang butuh config khusus
        const result = await model.generateContent({
            contents: contents
        });

        const response = await result.response;
        return { 
            text: response.text(), 
            // Grounding metadata jika tersedia
            metadata: (response as any).groundingMetadata || null 
        };
    });
};

/**
 * Handle Image Generation (Imagen / Gemini Multimodal)
 */
export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string, base64Images?: string[]): Promise<string | null> => {
    return executeWithRotation(async (genAI) => {
        const targetModelId = modelId || "gemini-1.5-flash"; 
        const model = genAI.getGenerativeModel({ model: targetModelId });

        // Logic Multimodal (Image-to-Image / Context)
        const parts: any[] = [];
        if (base64Images && base64Images.length > 0) {
            base64Images.forEach(img => {
                const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
                if (match) {
                    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                }
            });
        }
        parts.push({ text: `Generate an image based on this prompt: ${prompt}. Aspect Ratio: ${aspectRatio}` });

        const result = await model.generateContent(parts);
        const response = await result.response;
        
        // Ambil inlineData jika model mengembalikan gambar (khusus model multimodal gen)
        const candidates = response.candidates?.[0]?.content?.parts;
        const imagePart = candidates?.find(p => p.inlineData);
        
        if (imagePart?.inlineData) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
        
        return null;
    });
};

/**
 * Handle Text-to-Speech (TTS)
 */
export const handleGoogleTTS = async (text: string, voiceName: string) => {
    return executeWithRotation(async (genAI) => {
        // Gunakan model TTS eksperimental jika tersedia di region user
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        try {
            const result = await model.generateContent([
                { text: `Convert this text to speech using voice ${voiceName}: ${text}` }
            ]);
            // Catatan: SDK standard client-side saat ini lebih fokus ke teks/gambar.
            // Untuk TTS premium, biasanya disarankan lewat API Cloud TTS langsung.
            // Tapi kita biarkan logic lo tetap di sini sebagai placeholder multimodal.
            return null; 
        } catch (e) {
            console.error("[Akasha TTS] Error:", e);
            throw e;
        }
    });
};

/**
 * Handle Video Generation (Veo / Imagen Video)
 */
export const handleGoogleVideoGeneration = async (prompt: string, image?: string, modelId: string = 'veo-1'): Promise<string | null> => {
    return executeWithRotation(async (genAI, currentKey) => {
        // Veo API biasanya diakses lewat vertex AI atau endpoint khusus.
        // Di sini kita buat simulasi routing yang aman.
        console.log(`[Akasha Veo] Initiating video gen with model ${modelId}...`);
        
        // Placeholder: Karena SDK standard belum mendukung 'generateVideos' secara native di client
        // kita arahkan ke fallback atau informasikan user.
        throw new Error("Veo Video Generation requires Server-Side integration or Vertex AI SDK.");
    });
};
