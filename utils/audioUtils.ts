
/**
 * AUDIO UTILITIES
 * Centralized logic for WAV headers, Base64 handling, and Audio Context DSP.
 */

// Convert Base64 string to Blob
export const base64ToBlob = (base64: string, type = 'audio/wav'): Blob | null => {
  try {
    const cleanBase64 = base64.replace(/[\n\r]/g, '');
    const binStr = atob(cleanBase64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type });
  } catch (e) { 
    console.error("Audio Blob conversion failed", e);
    return null; 
  }
};

// Generate Synthetic Reverb Impulse Response
export const createReverbImpulse = (ctx: AudioContext, duration: number, decay: number): AudioBuffer => {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const L = impulse.getChannelData(0);
    const R = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i / length;
        const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        L[i] = val;
        R[i] = val;
    }
    return impulse;
};

// Add RIFF WAVE Header to Raw PCM Data
// FIXED: Penanganan buffer besar menggunakan perulangan chunking untuk mencegah "Maximum call stack size exceeded"
export const addWavHeader = (base64PCM: string, sampleRate: number = 24000, numChannels: number = 1): string => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const samples = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      samples[i] = binaryString.charCodeAt(i);
    }

    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length, true);

    const headerBytes = new Uint8Array(wavHeader);
    const wavBytes = new Uint8Array(headerBytes.length + samples.length);
    wavBytes.set(headerBytes, 0);
    wavBytes.set(samples, headerBytes.length);

    // FIXED: Gunakan pendekatan chunking untuk memproses buffer besar
    let binary = '';
    const chunk_size = 8192;
    for (let i = 0; i < wavBytes.length; i += chunk_size) {
      binary += String.fromCharCode.apply(null, Array.from(wavBytes.subarray(i, i + chunk_size)));
    }
    
    return btoa(binary);

  } catch (e) {
    console.error("CRITICAL: Error constructing WAV header:", e);
    return base64PCM; 
  }
};

// Fallback Raw PCM Decoder
export const decodeRawPCM = (arrayBuffer: ArrayBuffer, ctx: AudioContext): AudioBuffer => {
    const sampleRate = 24000;
    let offset = 0;
    // Deteksi apakah data memiliki header WAV atau PCM murni
    if (arrayBuffer.byteLength > 44) {
        const view = new DataView(arrayBuffer);
        if (view.getUint8(0) === 82 && view.getUint8(1) === 73) offset = 44; // "RI" from "RIFF"
    }

    const int16View = new Int16Array(arrayBuffer.slice(offset));
    const float32Data = new Float32Array(int16View.length);
    
    for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0; 
    }

    const buffer = ctx.createBuffer(1, float32Data.length, sampleRate);
    buffer.getChannelData(0).set(float32Data);
    return buffer;
};
