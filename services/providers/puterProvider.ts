
/**
 * PUTER.JS PROVIDER
 * Robust integration with Puter.com Cloud AI.
 */

declare const puter: any;

export const handlePuterTextRequest = async (model: string, messages: any[]) => {
    if (typeof puter === 'undefined') {
        throw new Error("Puter.js not loaded. Check internet connection.");
    }

    try {
        // Puter expects {role, content} objects
        const formattedMessages = messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
        }));

        const response = await puter.ai.chat(formattedMessages, { model: model });
        
        // Normalize response
        if (typeof response === 'string') return response;
        return response?.message?.content || response?.content || JSON.stringify(response);

    } catch (e: any) {
        console.error("Puter Text Error:", e);
        throw new Error(`Puter Cloud Error: ${e.message || 'Connection Severed'}`);
    }
};

export const handlePuterImageSynthesis = async (prompt: string, modelId?: string): Promise<string | null> => {
    if (typeof puter === 'undefined') return null;

    try {
        const imageElement = await puter.ai.txt2img(prompt);
        // Puter often returns an Image Element, we need the source string (URL or Base64)
        if (imageElement && imageElement.src) {
            return imageElement.src;
        }
        return null;
    } catch (e) {
        console.error("Puter Image Error:", e);
        return null;
    }
};

export const handlePuterVideoGeneration = async (prompt: string): Promise<string | null> => {
    // Puter does not have a public Video API yet.
    // We return a high-quality "Keyframe" image as a fallback to prevent app crashes.
    console.warn("Puter Video: Fallback to Keyframe Image.");
    const keyframePrompt = `(Cinematic Video Keyframe) ${prompt}, motion blur, 16:9, high fidelity`;
    return await handlePuterImageSynthesis(keyframePrompt);
};
