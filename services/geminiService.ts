import { GoogleGenAI, Type } from "@google/genai";
import { GeminiBlockResponse } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Analyzes an image (scanned page) to extract text blocks and translate them.
 * Preserves layout information.
 */
export const analyzeAndTranslateImage = async (
  base64Image: string,
  mimeType: string,
  targetLang: string
): Promise<GeminiBlockResponse> => {
  
  const prompt = `
    You are a strictly controlled OCR and Translation engine for scanned documents.
    1. Analyze the image and detect ALL text blocks.
    2. Extract the text exactly as it appears (OCR).
    3. Translate the text to ${targetLang}.
    4. Provide a bounding box for each block as [ymin, xmin, ymax, xmax] where values are percentages (0-100) of the page dimensions.
    5. Detect if the text is BOLD (isBold: true).
    6. Classify the block type as 'text', 'heading' (for titles/headers), or 'table_cell' (for data inside tables).
    7. For TABLE CELLS, it is CRITICAL to keep them as separate blocks to preserve the grid structure.
    8. Return ONLY a JSON object with a "blocks" array.
    9. Do NOT add any markdown formatting or explanation.
    
    Structure:
    {
      "blocks": [
        { 
          "text": "original...", 
          "translatedText": "translated...", 
          "box": [10, 10, 20, 50],
          "isBold": true,
          "type": "heading"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                  box: { 
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "ymin, xmin, ymax, xmax in percent"
                  },
                  isBold: { type: Type.BOOLEAN },
                  type: { type: Type.STRING, enum: ['text', 'heading', 'table_cell'] }
                },
                required: ["text", "translatedText", "box"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as GeminiBlockResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};