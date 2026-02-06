import { AI_MODELS, IMAGE_GEN_MODELS, ASPECT_RATIOS, PERSONAS, ART_STYLES, VIDEO_GEN_MODELS, APP_KNOWLEDGE_BASE } from '../data';
import { ApiKeyData, VoiceConfig, Persona } from '../types';
import { 
    handleGoogleTextRequest, 
    handleGoogleImageSynthesis, 
    handleGoogleTTS,
    handleGoogleVideoGeneration
} from './providers/googleProvider';
import { handleOpenAITextRequest, handleOpenAIImageSynthesis, handleOpenAIVideoGeneration } from './providers/openaiProvider';
import { handleOpenRouterTextRequest, handleOpenRouterImageSynthesis, handleOpenRouterVideoGeneration } from './providers/openrouterProvider';
import { handlePollinationsTextRequest, handlePollinationsImageSynthesis, handlePollinationsVideoGeneration } from './providers/pollinationsProvider';
import { handlePuterTextRequest, handlePuterImageSynthesis, handlePuterVideoGeneration } from './providers/puterProvider';

// Library Google AI
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getStoredKey } from './apiKeyStore';

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

/**
 * HELPER: Ambil Google Key secara reaktif
 */
const getActiveGoogleKey = () => {
    return getStoredKey('google') || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
};

/**
 * VISUAL DNA ENCODER: Mengoptimalkan prompt gambar berdasarkan context persona & gambar referensi
 */
const describeVisualTransformation = async (prompt: string, images: string[], persona?: Persona): Promise<string> => {
    if (prompt.includes('http') || !prompt.trim()) return prompt;

    const apiKey = getActiveGoogleKey();
    if (!apiKey || apiKey.length < 10) return prompt;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        const imageParts = images.map(img => {
            const [header, data] = img.split(',');
            return { 
                inlineData: { 
                    mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', 
                    data: data.replace(/[\n\r\s]/g, '') 
                } 
            };
        });

        const instruction = `[VISUAL DNA ENCODER] 
Subject: ${persona?.name || 'Character'}. 
Visual DNA: ${persona?.visualSummary || 'High-detail anime'}. 
Context: ${prompt}. 
Task: Create a highly detailed image prompt. Maintain consistent features.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent([instruction, ...imageParts]);
        const response = await res.response;
        return response.text().trim() || prompt;
    } catch (e) {
        console.warn("[Akasha DNA] Optimization skipped due to key or connection issue.");
        return prompt;
    }
};

// --- CORE GENERATION FUNCTIONS ---

export const generateImage = async (
    prompt: string, 
    personaId: string = "", 
    sourceImages: string[] = [], 
    _u?: any, 
    sourceModelId: string = 'gemini-2.0-flash-exp', 
    aspectRatio: string = "1:1", 
    style: string = ""
): Promise<string | null> => {
    const modelCfg = IMAGE_GEN_MODELS.find(m => m.id === sourceModelId) || { provider: 'google' };
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const persona = PERSONAS.find(p => p.id === personaId);
    
    // 1. Optimize Prompt (DNA Encoding)
    let finalPrompt = prompt;
    if (personaId && persona) {
        const visualContext = await describeVisualTransformation(prompt, sourceImages, persona);
        finalPrompt = `${persona.visualSummary}, ${visualContext}`;
    }
    
    // Append Art Style
    const masterStyle = ART_STYLES.find(s => s.id === style)?.prompt || "masterpiece, 8k resolution, cinematic lighting";
    finalPrompt = `${finalPrompt}, ${masterStyle}`;

    // 2. Routing Logic
    try {
        switch(provider) {
            case 'google': return await handleGoogleImageSynthesis(sourceModelId, finalPrompt, aspectRatio, sourceImages);
            case 'openai': return await handleOpenAIImageSynthesis(finalPrompt, aspectRatio, sourceModelId);
            case 'openrouter': return await handleOpenRouterImageSynthesis(sourceModelId, finalPrompt, aspectRatio);
            case 'puter': return await handlePuterImageSynthesis(finalPrompt, sourceModelId);
            default:
                const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
                return await handlePollinationsImageSynthesis(finalPrompt, sourceModelId, ratioCfg.width, ratioCfg.height);
        }
    } catch (e) {
        console.error(`[Akasha] Primary Gen Error (${provider}):`, e);
        
        // AUTO-FALLBACK TO POLLINATIONS
        if (provider !== 'pollinations') {
            const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
            const simplePrompt = finalPrompt.substring(0, 450); // Safe length for URL
            return await handlePollinationsImageSynthesis(simplePrompt, 'flux', ratioCfg.width, ratioCfg.height);
        }
        throw e;
    }
};

export const chatWithAI = async (
    modelId: string, 
    history: any[], 
    message: string, 
    systemInstruction: string, 
    userContext: string = "", 
    images: ImageAttachment[] = [],
    videos: ImageAttachment[] = [],
    audioData?: { base64: string, mimeType: string }
) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const finalSystemPrompt = `${APP_KNOWLEDGE_BASE}\n\n[CONTEXT]\n${userContext}\n\n[PERSONA]\n${systemInstruction}`;

    try {
        if (provider === 'google') {
            const contents = history.map(h => ({
                role: h.role === 'model' ? 'model' : 'user',
                parts: [{ text: h.content || "" }]
            }));
            
            const currentParts: any[] = [];
            if (images.length > 0) images.forEach(img => currentParts.push({ inlineData: img.inlineData }));
            if (videos.length > 0) videos.forEach(vid => currentParts.push({ inlineData: vid.inlineData }));
            if (audioData) currentParts.push({ inlineData: { mimeType: audioData.mimeType, data: audioData.base64 } });
            currentParts.push({ text: message || " " });

            contents.push({ role: 'user', parts: currentParts });
            return await handleGoogleTextRequest(modelId, contents, finalSystemPrompt);
        } 
        
        // Standard Format (OpenAI, OpenRouter, etc.)
        const messages = [
            { role: "system", content: finalSystemPrompt }, 
            ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })), 
            { role: "user", content: message }
        ];

        switch(provider) {
            case 'openai': return { text: await handleOpenAITextRequest(modelId, messages), metadata: null };
            case 'openrouter': return { text: await handleOpenRouterTextRequest(modelId, messages), metadata: null };
            case 'puter': return { text: await handlePuterTextRequest(modelId, messages), metadata: null };
            default: return { text: await handlePollinationsTextRequest(modelId, messages), metadata: null };
        }
    } catch (e) {
        console.error(`[Akasha] Provider ${provider} Error:`, e);
        throw e;
    }
};

export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-2'): Promise<string | null> => {
    const modelCfg = VIDEO_GEN_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();

    try {
        if (provider === 'google') return await handleGoogleVideoGeneration(prompt, image, modelId);
        if (provider === 'openai') return await handleOpenAIVideoGeneration(prompt, image);
        if (provider === 'pollinations') return await handlePollinationsVideoGeneration(prompt);
        // Add more providers as needed
        return await handlePollinationsVideoGeneration(prompt); 
    } catch (e) {
        if (provider !== 'pollinations') return await handlePollinationsVideoGeneration(prompt);
        throw e;
    }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const apiKey = getActiveGoogleKey();
    if (!apiKey) return text;

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent(`Translate to ${targetLanguage} (Output only result): ${text}`);
        return res.response.text().trim() || text;
    } catch { return text; }
};

export const analyzePersonaFromImage = async (base64Image: string) => {
    const apiKey = getActiveGoogleKey();
    if (!apiKey) throw new Error("Akasha Vision requires a Google API Key in Vault.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const [header, data] = base64Image.split(',');
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent([
            { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data } },
            { text: "Analyze character. Return JSON: { name, description, personality, background, speechStyle, voiceSuggestion, visualSummary }" }
        ]);
        const text = res.response.text();
        return JSON.parse(text.replace(/```json|```/g, ''));
    } catch (e) {
        throw new Error("Vision analysis failed. Key might be invalid or limited.");
    }
};
