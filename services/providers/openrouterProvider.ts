import { getAvailableKeys, markKeyExhausted } from '../apiKeyStore';

const BASE_URL = "https://openrouter.ai/api/v1";
// Fallback URL yang lebih aman buat metadata OpenRouter
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : "https://akasha-terminal.web.app";
const SITE_NAME = "Akasha Terminal AI";

/**
 * Helper: Eksekusi request ke OpenRouter dengan rotasi key.
 * Menangani kasus saldo habis (402) dan limit (429).
 */
async function executeOpenRouterWithRotation<T>(
    operation: (key: string) => Promise<T>
): Promise<T> {
    const keys = getAvailableKeys('openrouter');
    if (keys.length === 0) {
        throw new Error("Akasha Vault: No OpenRouter keys found. Please check your settings.");
    }

    let lastError: any;

    for (const apiKey of keys) {
        try {
            return await operation(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorStr = error.message?.toLowerCase() || "";
            
            // OpenRouter biasanya melempar 402 kalau saldo credits di akun lo 0.
            const isExhausted = 
                errorStr.includes('402') || 
                errorStr.includes('429') || 
                errorStr.includes('insufficient') || 
                errorStr.includes('credit');

            if (isExhausted) {
                console.warn(`[Akasha OpenRouter] Key ${apiKey.substring(0, 8)}... exhausted/no-credits. Rotating...`);
                markKeyExhausted(apiKey);
                continue; // Coba key berikutnya
            } else {
                throw error; // Lempar kalau errornya bersifat fatal (misal: prompt diblokir)
            }
        }
    }
    throw new Error(`OpenRouter Resonance Failure: ${lastError?.message || "All keys failed"}`);
}

/**
 * Handle Chat Request
 */
export const handleOpenRouterTextRequest = async (modelId: string, messages: any[]) => {
    return executeOpenRouterWithRotation(async (apiKey) => {
        // Gunakan AbortController buat cegah request gantung terlalu lama
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 detik timeout

        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME,
                },
                body: JSON.stringify({
                    model: modelId || "google/gemini-2.0-flash-001", // Default model 2026
                    messages: messages,
                    temperature: 0.8,
                    top_p: 0.9,
                    // Tambahan: include_reasoning buat model kayak DeepSeek R1 via OpenRouter
                    include_reasoning: true 
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const msg = errorData.error?.message || response.statusText;
                
                // Bungkus status code ke dalam message agar terbaca oleh rotation logic
                throw new Error(`${status}: ${msg}`);
            }

            const data = await response.json();
            
            // OpenRouter mengembalikan content atau terkadang reasoning_content
            const choice = data.choices?.[0]?.message;
            return choice?.reasoning_content 
                ? `${choice.reasoning_content}\n\n${choice.content}` 
                : (choice?.content || "");

        } catch (e: any) {
            if (e.name === 'AbortError') throw new Error("408: Request Timeout pada OpenRouter");
            throw e;
        }
    });
};

/**
 * Handle Image Synthesis via OpenRouter (Flux, Stable Diffusion, etc.)
 */
export const handleOpenRouterImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    return executeOpenRouterWithRotation(async (apiKey) => {
        // Mapping resolusi (OpenRouter Image API mengikuti standar provider aslinya)
        const sizeMap: Record<string, string> = { 
            "1:1": "1024x1024", 
            "16:9": "1280x720", 
            "9:16": "720x1280" 
        };

        const response = await fetch(`${BASE_URL}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                'X-Title': SITE_NAME,
            },
            body: JSON.stringify({
                model: modelId || "black-forest-labs/flux-schnell",
                prompt: prompt,
                size: sizeMap[aspectRatio] || "1024x1024",
                response_format: "url"
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`${response.status}: ${errorData.error?.message || "Image Gen Failed"}`);
        }

        const data = await response.json();
        return data.data?.[0]?.url || null;
    });
};

/**
 * Handle Video Generation Placeholder
 */
export const handleOpenRouterVideoGeneration = async (model: string, prompt: string, image?: string): Promise<string | null> => {
    // OpenRouter mulai mendukung model video, tapi endpointnya sering berbeda.
    // Kita arahkan ke fallback system agar user tidak stuck.
    throw new Error("501: OpenRouter Video API is in early access. Rerouting to Akasha Fallback...");
};
