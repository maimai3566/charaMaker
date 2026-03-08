"use client";

import { useState } from "react";
import ImageProcessor from "@/components/ImageProcessor";
import { useCharacterHistory } from "@/hooks/useCharacterHistory";

const PRESET_PROMPT = 
  "Sprite sheet, exactly 4 evenly spaced horizontal frames. Fully visible zoomed-out subject, no cropping. Plain white background, clear THICK outer lines (thick outlines).";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [animationStyle, setAnimationStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { history, isLoading, saveToHistory, deleteFromHistory } = useCharacterHistory();

  const plannedPrompt = prompt ? `${prompt}${animationStyle ? `\n[Animation: ${animationStyle} loop]` : ""}\n\n${PRESET_PROMPT}` : "";

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImageBase64(null);
    setCopySuccess(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: plannedPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImageBase64(data.imageBase64);
      // Save the generated item to local history (saving just the user prompt, not the giant preset)
      await saveToHistory(`${prompt} (${animationStyle || '待機'})`, data.imageBase64);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadFromHistory = (imageBase64: string) => {
    setGeneratedImageBase64(imageBase64);
    // Note: We don't restore the exact prompt string here since it's combined, 
    // but the user can see the image
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = async () => {
    if (!plannedPrompt) return;
    try {
      await navigator.clipboard.writeText(plannedPrompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Chara-Maker</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            デザインの指定（Character/Subject Prompt）
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={3}
            placeholder="例: 星柄がついた卵。"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アニメーションの動き（Animation Style）
          </label>
          <div className="flex gap-4 mb-3 flex-wrap">
            <button 
              onClick={() => setAnimationStyle("Walking cycle")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Walking") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              歩く
            </button>
            <button 
              onClick={() => setAnimationStyle("Sleeping")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Sleeping") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              寝る
            </button>
            <button 
              onClick={() => setAnimationStyle("Nodding yes")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Nodding") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              うなずく
            </button>
            <button 
              onClick={() => setAnimationStyle("Shaking head no")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Shaking") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              首を振る
            </button>
            <button 
              onClick={() => setAnimationStyle("Bouncing up and down")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Bouncing") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              跳ねる
            </button>
            <button 
              onClick={() => setAnimationStyle("Running cycle")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Running") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              走る
            </button>
            <button 
              onClick={() => setAnimationStyle("Stretching vertically and squashing")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Stretching") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              上下に伸び縮み
            </button>
            <button 
              onClick={() => setAnimationStyle("Wobbling left and right, unstable")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Wobbling") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              ふらふらする
            </button>
          </div>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            placeholder="自由に動きを指定することも可能です (例: 呼吸している, 回転している)"
            value={animationStyle}
            onChange={(e) => setAnimationStyle(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt || isGenerating}
          className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
        >
          {isGenerating ? "生成中... (Generating)" : "画像を生成する (Generate)"}
        </button>

        {error && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Display the planned prompt */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg relative">
          <h3 className="text-sm font-bold text-gray-700 mb-2">送信予定のプロンプト (Planned Prompt)</h3>
          <textarea
            readOnly
            value={plannedPrompt}
            className="w-full bg-white border border-gray-300 p-3 rounded text-xs text-gray-600 h-24 focus:outline-none cursor-text"
            placeholder="プロンプトを入力するとここに送信内容が表示されます..."
          />
          <button
            onClick={copyToClipboard}
            className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs transition-colors"
          >
            {copySuccess ? "コピーしました！" : "コピー"}
          </button>
        </div>

        {/* Display the raw generated image and processor */}
        {generatedImageBase64 && (
          <div className="mt-8 border-t pt-8">
             <h2 className="text-xl font-bold mb-4">スプライトシート構築 (Sprite Sheet Processing)</h2>
            <ImageProcessor base64Image={generatedImageBase64} />
          </div>
        )}
      </div>

      {/* History UI */}
      <div className="mt-8 w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">生成履歴 (History)</h2>
        {isLoading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500">履歴はありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {history.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex flex-col items-center shadow-sm">
                <img 
                  src={`data:image/png;base64,${item.imageBase64}`} 
                  alt="History thumbnail" 
                  className="w-full h-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => loadFromHistory(item.imageBase64)}
                />
                <p className="text-xs mt-3 text-gray-600 line-clamp-2 w-full text-left" title={item.prompt}>
                  {item.prompt}
                </p>
                <div className="mt-4 w-full flex justify-between">
                  <button 
                    onClick={() => loadFromHistory(item.imageBase64)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    選択
                  </button>
                  <button 
                    onClick={() => deleteFromHistory(item.id)} 
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
