import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const { text, targetLang, context } = await req.json();

    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const promptText = `
      You are a professional game localizer. Translate the following game character text to ${targetLang === 'en' ? 'English' : 'Japanese'}.
      
      Context: ${context}
      Text to translate: "${text}"

      Respond ONLY with the translated text. No quotes, no explanations.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: promptText,
    });
    
    const translatedText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return NextResponse.json({ translatedText });

  } catch (error: any) {
    console.error("Error translating text:", error);
    return NextResponse.json({ error: "Failed to translate text" }, { status: 500 });
  }
}
