import { getStoredKey } from '../apiKeyStore';

/**
 * Interface untuk Pollinations AI API - Fallback System Akasha
 */
export class PollinationsAPI {
    apiKey: string;
    // Endpoint gambar terbaru yang mendukung interleave prompt
    baseUrl: string = 'https://image.pollinations.ai/prompt';
    chatUrl: string = 'https://text.pollinations.ai/';

    constructor(apiKey = '') {
        this.apiKey = apiKey;
    }

    /**
     * List model Pollinations yang paling stabil buat vibes Genshin/Anime
     */
    getAvailableModels() {
        return [
            { name: "flux", description: "Flux Schnell (All-rounder)" },
            { name: "flux-anime", description: "Specialized Anime Model" },
            { name: "flux-realism", description: "Photo-realism" },
            { name: "any-dark", description: "Gothic/Dark Aesthetic" },
            { name: "turbo", description: "Speed-focused SDXL" }
        ];
    }

    /**
     * Generate Image via GET Request
     */
    async generate(params: { prompt: string, model?: string, width?: number, height?: number, seed?: number }) {
        const { prompt, model, width, height, seed } = params;
        
        // 1. SANITASI PROMPT (Optimized for 2026)
        // Kita hapus karakter yang bisa ngerusak URL tapi tetep jaga deskripsi visual
        const cleanPrompt = prompt
            .replace(/[\/\\#\?%]/g, ' ') 
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 800); // Batas aman URI length

        const finalPrompt = cleanPrompt || "masterpiece, genshin impact style, high quality";

        // 2. QUERY PARAMS
        const queryParams = new URLSearchParams({
            model: model || 'flux',
            width: (width || 1024).toString(),
            height: (height || 1024).toString(),
            seed: (seed || Math.floor(Math.random() * 1000000)).toString(),
            nologo: 'true',
            enhance: 'true' 
        });

        const url = `${this.baseUrl}/${encodeURIComponent(finalPrompt)}?${queryParams.toString()}`;

        // 3. FETCH WITH RETRY
        const headers: Record<string, string> = {};
        if (this.apiKey && this.apiKey.length > 5) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        try {
            let response = await fetch(url, { method: 'GET', headers });

            // Jika error auth, coba tanpa key (Pollinations seringkali free)
            if ((response.status === 401 || response.status === 403) && headers['Authorization']) {
                console.warn("[Akasha Pollinations] Auth failed, trying public lane...");
                response = await fetch(url, { method: 'GET' });
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error("Response is not an image");

            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e: any) {
            console.error("[Pollinations Engine Error]:", e);
            throw e;
        }
    }

    /**
     * Chat Interface (Standard OpenAI Format)
     */
    async chat(model: string, messages: any[]) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey && this.apiKey.length > 5) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(this.chatUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model || 'openai', // Pollinations memetakan model mereka ke nama-nama ini
                messages: messages,
                temperature: 0.8,
                jsonMode: false
            })
        });

        if (!response.ok) throw new Error(`Chat API Error ${response.status}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }
}

// --- ADAPTERS ---

const getClient = () => {
    // REVISI: Ganti process.env ke import.meta.env
    const key = getStoredKey('pollinations') || import.meta.env.VITE_POLLINATIONS_API_KEY || '';
    return new PollinationsAPI(key);
};

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const client = getClient();
    // Normalisasi model ID untuk Pollinations
    let targetModel = model.toLowerCase();
    if (targetModel.includes('gpt')) targetModel = 'openai';
    if (targetModel.includes('mistral') || targetModel.includes('llama')) targetModel = 'mistral';

    try {
        return await client.chat(targetModel, messages);
    } catch (e: any) {
        throw new Error(`Akasha Fallback Chat Failed: ${e.message}`);
    }
};

export const handlePollinationsImageSynthesis = async (
    prompt: string, 
    modelId: string = 'flux', 
    width: number = 1024, 
    height: number = 1024
): Promise<string | null> => {
    const client = getClient();
    return await client.generate({ prompt, model: modelId, width, height });
};

export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    // Karena Pollinations belum punya native video API yang stabil di browser,
    // Kita buat "Pseudo-Video" atau High-End Realism shot sebagai fallback visual.
    console.log("[Akasha] Routing video request to Pollinations High-Fidelity generator.");
    return handlePollinationsImageSynthesis(
        `${prompt}, cinematic motion, hyper-realistic, 8k, video frame`, 
        "flux-realism", 
        1280, 
        720
    );
};
