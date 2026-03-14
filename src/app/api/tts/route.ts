import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// TTS生成は時間がかかるため、タイムアウトを延長（秒）
export const maxDuration = 120;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

/**
 * PCM生データにWAVヘッダーを付与してWAVファイルのBufferを生成する
 * Gemini TTSは 24kHz, 16bit, mono の PCM データを返す
 */
function createWavBuffer(pcmData: Buffer): Buffer {
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);        // Sub-chunk size (16 for PCM)
  header.writeUInt16LE(1, 20);         // Audio format (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export async function POST(req: Request) {
  try {
    const { text, voiceName, stylePrompt } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "テキストが必要です" },
        { status: 400 }
      );
    }

    if (!voiceName) {
      return NextResponse.json(
        { error: "ボイスの選択が必要です" },
        { status: 400 }
      );
    }

    // スタイル指示がある場合はプロンプトに含める
    const contents = stylePrompt
      ? `${stylePrompt}: "${text}"`
      : text;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: contents }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      } as any,
    });

    const candidate = response.candidates?.[0];
    const audioData = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      console.error("Gemini TTS Response Error:", JSON.stringify(response, null, 2));
      const finishReason = candidate?.finishReason;

      let errorMessage = "音声データの生成に失敗しました。";
      if (finishReason === "SAFETY") {
        errorMessage = "安全フィルターにより生成が中断されました。テキストを見直してください。";
      } else if (finishReason) {
        errorMessage = `生成が中断されました (理由: ${finishReason})`;
      }

      throw new Error(errorMessage);
    }

    // Base64のPCMデータをBufferに変換し、WAVヘッダーを付与
    const pcmBuffer = Buffer.from(audioData, "base64");
    const wavBuffer = createWavBuffer(pcmBuffer);
    const wavBase64 = wavBuffer.toString("base64");

    return NextResponse.json({ audioBase64: wavBase64 });

  } catch (error: any) {
    console.error("Error generating TTS audio:", error);
    return NextResponse.json(
      { error: error.message || "音声の生成に失敗しました" },
      { status: 500 }
    );
  }
}
