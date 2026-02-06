
/**
 * GEMINIGEN.AI PROXY NODE (Veo Integration)
 * High-performance video synthesis relay.
 */

// Use environment variable if available
const GEMINIGEN_API_KEY = process.env.GEMINIGEN_API_KEY;
const TARGET_URL = "https://api.geminigen.ai/uapi/v1/video-gen/veo";

export const handleGeminigenVideoGeneration = async (modelId: string, prompt: string, imageBase64?: string): Promise<string | null> => {
    if (!GEMINIGEN_API_KEY) {
        console.warn("[Akasha] Geminigen API Key is missing in environment variables.");
        throw new Error("Video Service Unconfigured (Missing Key)");
    }

    try {
        // Use a CORS proxy to bypass browser restrictions that cause "Failed to fetch"
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(TARGET_URL)}`;
        
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("model", modelId);
        formData.append("resolution", "720p");
        formData.append("aspect_ratio", "16:9");

        if (imageBase64) {
            // Convert base64 image data to Blob for FormData
            const [header, data] = imageBase64.split(',');
            const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
            const binary = atob(data);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
            const blob = new Blob([array], { type: mime });
            
            // Geminigen expects ref_images field for starting frames/reference images
            formData.append("ref_images", blob, `seed_artifact.${mime.split('/')[1]}`);
        }

        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
                "x-api-key": GEMINIGEN_API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Geminigen Link Severed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        /**
         * Geminigen Response Structure Handle
         * Expected: { success: true, data: { video_url: "..." } } or similar
         */
        const videoUrl = result.data?.video_url || result.video_url || result.url;
        
        return videoUrl || null;

    } catch (e: any) {
        console.error("[Akasha] Geminigen Synthesis Error:", e);
        return null;
    }
};
