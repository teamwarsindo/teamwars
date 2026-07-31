import { GoogleGenAI } from '@google/genai';

// Inisialisasi SDK dengan API Key dari environment variable
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
