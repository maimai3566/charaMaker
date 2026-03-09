import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const { element, stage, designPrompt } = await req.json();

    const promptText = `
      You are a creative game designer. Suggest a cool name and a short description for a monster character in a mobile game.
      
      CRITICAL REQUIREMENT: The name and description MUST align with the specified "Element". 
      For example, if Element is "FLOWER", do NOT use words related to "Fire" or "Thunder" even if the Design Concept suggests them.
      
      Attributes:
      - Element: ${element} (MOST IMPORTANT)
      - Evolution Stage: ${stage}
      - Design Concept: ${designPrompt}

      Please provide the response in the following JSON format:
      {
        "nameJa": "日本語の名前",
        "nameEn": "English Name",
        "descriptionJa": "日本語の短い説明文(20文字程度)",
        "descriptionEn": "Short English description"
      }
      Respond ONLY with the JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: promptText,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");
    
    const suggestion = JSON.parse(jsonMatch[0]);
    return NextResponse.json(suggestion);

  } catch (error: any) {
    console.error("Error suggesting name:", error);
    return NextResponse.json({ error: "Failed to suggest name" }, { status: 500 });
  }
}
