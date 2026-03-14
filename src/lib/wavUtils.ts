/**
 * WAV音声ファイルのクライアントサイドユーティリティ。
 * Gemini TTSが生成する 24kHz, 16bit, mono のWAVデータを扱う。
 */

const WAV_HEADER_SIZE = 44;
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

/**
 * Base64エンコードされたWAVデータからPCM生データ部分を抽出する
 */
function extractPcmFromWavBase64(wavBase64: string): Uint8Array {
  const binaryStr = atob(wavBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  // WAVヘッダー（44バイト）をスキップしてPCMデータのみ返す
  return bytes.slice(WAV_HEADER_SIZE);
}

/**
 * 指定秒数の無音PCMデータを生成する
 */
function createSilencePcm(durationSeconds: number): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * durationSeconds);
  // 16bit = 2バイト/サンプル、値0で無音
  return new Uint8Array(numSamples * NUM_CHANNELS * BYTES_PER_SAMPLE);
}

/**
 * PCMデータにWAVヘッダーを付与してUint8Arrayとして返す
 */
function createWavFromPcm(pcmData: Uint8Array): Uint8Array {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = NUM_CHANNELS * BYTES_PER_SAMPLE;
  const dataSize = pcmData.length;

  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + dataSize);
  const view = new DataView(buffer);

  // "RIFF"
  writeString(view, 0, "RIFF");
  view.setUint32(4, dataSize + WAV_HEADER_SIZE - 8, true);
  writeString(view, 8, "WAVE");

  // "fmt "
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // "data"
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCMデータをコピー
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, WAV_HEADER_SIZE);

  return wavBytes;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * 複数のWAV音声（Base64）を結合し、間に無音を挿入する。
 * 結果をBase64エンコードされたWAVとして返す。
 *
 * @param wavBase64List - Base64エンコードされたWAVデータの配列
 * @param silenceDurationSeconds - 各音声間に挿入する無音の秒数
 * @returns 結合されたWAVのBase64文字列
 */
export function mergeWavFiles(
  wavBase64List: string[],
  silenceDurationSeconds: number = 0
): string {
  if (wavBase64List.length === 0) {
    throw new Error("結合する音声がありません");
  }

  if (wavBase64List.length === 1 && silenceDurationSeconds <= 0) {
    return wavBase64List[0];
  }

  // 各WAVからPCMデータを抽出
  const pcmChunks: Uint8Array[] = [];
  const silencePcm = silenceDurationSeconds > 0
    ? createSilencePcm(silenceDurationSeconds)
    : null;

  for (let i = 0; i < wavBase64List.length; i++) {
    pcmChunks.push(extractPcmFromWavBase64(wavBase64List[i]));

    // 最後の音声以外には無音を挿入
    if (silencePcm && i < wavBase64List.length - 1) {
      pcmChunks.push(silencePcm);
    }
  }

  // 全PCMデータを結合
  const totalLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const mergedPcm = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of pcmChunks) {
    mergedPcm.set(chunk, offset);
    offset += chunk.length;
  }

  // WAVヘッダーを付与
  const wavBytes = createWavFromPcm(mergedPcm);

  // Base64に変換
  let binaryStr = "";
  for (let i = 0; i < wavBytes.length; i++) {
    binaryStr += String.fromCharCode(wavBytes[i]);
  }
  return btoa(binaryStr);
}

/**
 * WAV Base64データの再生時間（秒）を推定する
 */
export function estimateWavDuration(wavBase64: string): number {
  const totalBytes = Math.floor(wavBase64.length * 3 / 4); // Base64 → バイト数概算
  const pcmBytes = totalBytes - WAV_HEADER_SIZE;
  return pcmBytes / (SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE);
}
