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
    const { prompt, aspectRatio } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call Nano Banana 2 (Gemini 3.1 Flash Image Preview) to generate the image
    const finalPrompt = prompt;

    // Note: The @google/genai SDK expects these nested config objects for the newest models.
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: finalPrompt,
      config: {
        thinkingConfig: {
          thinkingLevel: "MINIMAL" as any,
        },
        imageConfig: {
          aspectRatio: aspectRatio || "4:1",
          imageSize: "512",
        },
        responseModalities: ["IMAGE"],
      } as any,
    });

    const candidate = response.candidates?.[0];
    const base64Image = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Image) {
      console.error("Gemini Response Error:", JSON.stringify(response, null, 2));
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;
      let errorMessage = "Failed to generate image data (no inlineData found in response parts).";
      
      if (finishReason === "SAFETY") {
        errorMessage = "安全フィルターにより生成が中断されました。プロンプトを見直してください。 (Safety Filter triggered)";
      } else if (finishReason === "RECITATION") {
        errorMessage = "著作権等の制限により生成が中断されました。 (Recitation/Copyright trigger)";
      } else if (finishReason) {
        errorMessage = `生成が中断されました (理由: ${finishReason})`;
      }

      throw new Error(errorMessage);
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
