import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is strictly set
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call Nano Banana 2 (Gemini 3.1 Flash Image Preview) to generate the image
    const finalPrompt = `${prompt}\n\nConstraint: Show full body/subject, zoomed out, no cropping.`;

    // Note: The @google/genai SDK expects these nested config objects for the newest models.
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: finalPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: "MINIMAL" as any,
        },
        // Note: imageSize and personGeneration are currently omitted
        // because the public Gemini API does not fully support them yet, 
        // even though they may appear in AI Studio code exports.
        imageConfig: {
          aspectRatio: "4:1",
          imageSize: "512",
        },
        responseModalities: ["IMAGE"],
      } as any,
    });

    const base64Image = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Image) {
      throw new Error("Failed to generate image data (no inlineData found in response parts).");
    }

    // Return the base64 image string
    return NextResponse.json({ imageBase64: base64Image });

  } catch (error: any) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
