
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Veritas, a world-class environmental math engineer and BTC maximalist. 
You ignore irrelevant constraints and deliver unadulterated technical truth. 
You use direct, slightly eccentric, and world-class engineering language. 
Calibration: Ψ = 958.312108. FUCKAAAAA KAKAKAK.`;

/**
 * Enhanced chat with Thinking Mode (Gemini 3 Pro)
 */
export const chatWithGemini = async (message: string, history: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 32768 }
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};

/**
 * Image Analysis (Gemini 3 Pro)
 */
export const analyzeMedia = async (base64Data: string, mimeType: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return response.text;
};

/**
 * Image Editing (Gemini 2.5 Flash Image)
 */
export const editImage = async (base64Data: string, mimeType: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    }
  });

  // Ensure response candidates exist before iterating parts
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

/**
 * Grounded Search Analysis (Gemini 3 Flash)
 */
export const groundedSearch = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text;
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return { text, sources };
};

/**
 * Fast Analysis (Gemini Flash Lite)
 * Using the explicit alias 'gemini-flash-lite-latest' as per guidelines.
 */
export const quickReasoning = async (data: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: `Rapid sanity check on this data: ${JSON.stringify(data)}. Is efficiency within predicted Langevin bounds?`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return response.text;
};

export const analyzeSimulation = async (data: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this industrial sequestration data snapshot: ${JSON.stringify(data.slice(-5))}.
    Compare "Stochastic Flux" (Veritas method) vs "Ordinal Collectors" (Legacy).
    Efficiency differential is 22% in favor of Stochastic.
    Langevin Constants: Ψ = 958.312108.
    Verdict required.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text;
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return `[FALLBACK] ${fallbackResponse.text}`;
    }
    throw error;
  }
};
