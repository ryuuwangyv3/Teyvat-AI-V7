import OpenAI from 'openai';
import { getAvailableKeys, markKeyExhausted } from '../apiKeyStore';

/**
 * Helper: Eksekusi dengan rotasi otomatis khusus OpenAI.
 * Menangani kuota (429) dan masalah autentikasi (401).
 */
async function executeOpenAIWithRotation<T>(
    operation: (client: OpenAI) => Promise<T>
): Promise<T> {
    const keys = getAvailableKeys('openai');
    
    if (keys.length === 0) {
        throw new Error("Akasha Terminal: No valid OpenAI API keys found.");
    }

    let lastError: any;

    for (const apiKey of keys) {
        try {
            const client = new OpenAI({
                apiKey: apiKey,
                // WAJIB buat Vite/React karena kita manggil dari browser
                dangerouslyAllowBrowser: true 
            });
            return await operation(client);
        } catch (error: any) {
            lastError = error;
            
            // OpenAI mengembalikan error status di properti 'status'
            const status = error.status || (error as any).response?.status;
            
            // 429: Rate Limit/Quota, 401: Invalid Key, 403: Country Not Supported
            if (status === 429 || status === 401 || status === 403) {
                console.warn(`[Akasha OpenAI] Key failure (${status}). Rotating resonance...`);
                markKeyExhausted(apiKey);
                continue; // Coba key berikutnya
            } else {
                // Jika error 400 (Bad Request) atau lainnya, jangan rotasi, lempar errornya
                throw error;
            }
        }
    }
    throw new Error(`OpenAI All-Keys Failure: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Handle Chat & Text Generation (GPT-4o, etc.)
 */
export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    return executeOpenAIWithRotation(async (client) => {
        // Deep copy messages biar nggak ngerusak data aslinya
        const processedMessages = messages.map(msg => ({ ...msg }));
        
        // Inject identity jika belum ada
        const sysMsg = processedMessages.find(m => m.role === 'system');
        if (sysMsg) {
            sysMsg.content += "\n\n[IDENTITY]: You are Akasha Terminal, an elite neural interface.";
        }

        const completion = await client.chat.completions.create({
            model: model || "gpt-4o", // Default ke flagship model
            messages: processedMessages,
            temperature: 0.8,
            max_tokens: 2048,
        });

        return completion.choices[0]?.message?.content || "";
    });
};

/**
 * Handle Image Synthesis (DALL-E 3)
 */
export const handleOpenAIImageSynthesis = async (
    prompt: string, 
    aspectRatio: string, 
    modelId: string = "dall-e-3"
): Promise<string | null> => {
    return executeOpenAIWithRotation(async (client) => {
        // Mapping resolusi DALL-E 3
        const sizeMap: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = { 
            "1:1": "1024x1024", 
            "16:9": "1792x1024", 
            "9:16": "1024x1792" 
        };

        const response = await client.images.generate({
            model: modelId,
            prompt: prompt,
            n: 1,
            size: sizeMap[aspectRatio] || "1024x1024",
            quality: "hd", // "hd" lebih bagus buat vibes Genshin lo
            response_format: "url"
        });

        return response.data[0]?.url || null;
    });
};

/**
 * Handle Video Generation (Sora/Preview)
 */
export const handleOpenAIVideoGeneration = async (prompt: string, image?: string): Promise<string | null> => {
    // Sebagai Peer, gue jujur aja: Sora API itu masih sangat terbatas (enterprise-only).
    // Kita lempar error supaya otomatis pake Fallback Pollinations di aiService.ts
    throw new Error("Sora API is currently restricted. Switching to Akasha Fallback System...");
};
