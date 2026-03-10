"use client";

import { useState } from "react";
import ImageProcessor from "@/components/ImageProcessor";
import { useCharacterHistory } from "@/hooks/useCharacterHistory";
import { useBackgroundHistory } from "@/hooks/useBackgroundHistory";
import GameDataForm from "@/components/GameDataForm";
import MasterListData from "@/components/MasterListData";
import { MonsterMasterData, monsterMasterRepository } from "@/data/repository/MonsterMasterRepository";
import { useEffect } from "react";
import { BACKGROUND_STYLE_CATEGORIES, BackgroundStyle, BACKGROUND_ATMOSPHERES } from "@/data/backgroundStyles";

const PRESET_PROMPT =
  "Sprite sheet with exactly four evenly spaced horizontal poses of the same character. The character must be drawn SMALL and CENTERED within each pose space, leaving plenty of empty white space around it to ensure absolutely no cropping. Do NOT draw boxes, borders, or panels separating the poses. Solid white background, clear THICK black outer lines on the character only. Cartoon style. High contrast.";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [animationStyle, setAnimationStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageSource, setGeneratedImageSource] = useState<string | null>(null);
  const [processedWebP, setProcessedWebP] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [lastUsedPrompt, setLastUsedPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Background states
  const [bgPrompt, setBgPrompt] = useState("");
  const [bgAspectRatio, setBgAspectRatio] = useState("9:16");
  const [bgGeneratedImage, setBgGeneratedImage] = useState<string | null>(null);
  const [bgProcessedWebP, setBgProcessedWebP] = useState<string | null>(null);
  const [selectedBgStyleCategory, setSelectedBgStyleCategory] = useState<number | null>(null);
  const [selectedBgStyle, setSelectedBgStyle] = useState<BackgroundStyle | null>(null);
  const [bgAtmosphere, setBgAtmosphere] = useState("");

  // New states for Manage Mode
  const [viewMode, setViewMode] = useState<'generate' | 'background' | 'manage'>('generate');
  const [selectedForMaster, setSelectedForMaster] = useState<string | null>(null);
  const [editMonster, setEditMonster] = useState<MonsterMasterData | null>(null);
  const [masterMonsters, setMasterMonsters] = useState<MonsterMasterData[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { history, isLoading: isCharsLoading, saveToHistory: saveCharToHistory, deleteFromHistory: deleteCharFromHistory } = useCharacterHistory();
  const { backgrounds, isLoading: isBgsLoading, saveToHistory: saveBgToHistory, deleteFromHistory: deleteBgFromHistory } = useBackgroundHistory();

  const fetchMasterData = async () => {
    try {
      const data = await monsterMasterRepository.getAll();
      setMasterMonsters(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [refreshTrigger, viewMode]);

  // Filter out history items that are already in master data (by spriteUrl)
  const registeredUrls = new Set(masterMonsters.map(m => m.spriteUrl));
  const filteredHistory = history.filter(item => {
    const url = item.imageUrl || (item.imageBase64 ? `data:image/webp;base64,${item.imageBase64}` : "");
    return !registeredUrls.has(url);
  });

  const plannedPrompt = prompt ? `${prompt}${animationStyle ? `\n[Animation: ${animationStyle} loop]` : ""}\n\n${PRESET_PROMPT}` : "";

  const plannedBgPrompt = (() => {
    if (!bgPrompt) return "";
    const stylePart = selectedBgStyle ? `${selectedBgStyle.value}, ` : "";
    const atmospherePart = bgAtmosphere ? `, ${bgAtmosphere}` : "";
    return `${stylePart}${bgPrompt}${atmospherePart}`;
  })();

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImageSource(null);
    setProcessedWebP(null);
    setIsFromHistory(false);
    setCopySuccess(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: plannedPrompt, aspectRatio: "4:1" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImageSource(`data:image/png;base64,${data.imageBase64}`);
      setLastUsedPrompt(`${prompt} (${animationStyle || '待機'})`);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBackground = async () => {
    if (!bgPrompt) return;

    setIsGenerating(true);
    setError(null);
    setBgGeneratedImage(null);
    setBgProcessedWebP(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: plannedBgPrompt, aspectRatio: bgAspectRatio }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const imgSource = `data:image/png;base64,${data.imageBase64}`;
      setBgGeneratedImage(imgSource);
      
      // Automatic conversion to WebP for backgrounds
      const img = new Image();
      img.src = imgSource;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const webp = canvas.toDataURL("image/webp", 0.8).split(",")[1];
          setBgProcessedWebP(webp);
        }
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProcessedImage = (webpBase64: string) => {
    // Just store the processed WebP in state to enable the save button
    setProcessedWebP(webpBase64);
  };

  const handleSaveToFirebase = async () => {
    if (!processedWebP) return;
    setIsSaving(true);
    try {
      await saveCharToHistory(lastUsedPrompt, processedWebP);
      setIsFromHistory(true); // Treat as 'from history' once saved so button hides
    } catch (err) {
      console.error("Failed to save to history:", err);
      setError("Firebaseへの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBgToFirebase = async () => {
    if (!bgProcessedWebP) return;
    setIsSaving(true);
    try {
      const details = {
        style: selectedBgStyle?.label,
        styleValue: selectedBgStyle?.value,
        detailedPrompt: bgPrompt,
        atmosphere: bgAtmosphere,
      };
      await saveBgToHistory(plannedBgPrompt, bgAspectRatio, bgProcessedWebP, details);
      setBgGeneratedImage(null); // Clear to show it was "saved"
      setBgProcessedWebP(null);
      setBgPrompt("");
      setSelectedBgStyleCategory(null);
      setSelectedBgStyle(null);
      setBgAtmosphere("");
      alert("背景画像を保存しました！");
    } catch (err) {
      console.error("Failed to save background:", err);
      setError("背景の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const loadFromHistory = (item: any) => { // Use 'any' or proper type CharacterHistoryItem
    const source = item.imageUrl || (item.imageBase64 ? `data:image/webp;base64,${item.imageBase64}` : "");
    if (!source) return;
    setGeneratedImageSource(source);
    setIsFromHistory(true);

    if (item.prompt) {
      const match = item.prompt.match(/^(.*?)\s*\((.*?)\)$/);
      if (match && match.length === 3) {
        setPrompt(match[1]);
        const anim = match[2] === '待機' ? '' : match[2];
        setAnimationStyle(anim);
      } else {
        setPrompt(item.prompt);
        setAnimationStyle("");
      }
    }

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

  const handleEdit = (monster: MonsterMasterData) => {
    setSelectedForMaster(monster.spriteUrl);
    setEditMonster(monster);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm mb-6 flex justify-between items-center border-b-4 border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Chara-Maker & CMS</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setViewMode('generate'); setSelectedForMaster(null); }}
            className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${viewMode === 'generate' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🎨 画像生成モード
          </button>
          <button
            onClick={() => { setViewMode('background'); setBgGeneratedImage(null); }}
            className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${viewMode === 'background' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🖼️ 背景生成モード
          </button>
          <button
            onClick={() => setViewMode('manage')}
            className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${viewMode === 'manage' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🗄️ ゲームデータ作成
          </button>
        </div>
      </div>

      {viewMode === 'generate' && (
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
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
            <button
              onClick={() => setAnimationStyle("Breathing slowly, chest expanding and contracting")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Breathing") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              息をする
            </button>
            <button
              onClick={() => setAnimationStyle("Shivering and trembling rapidly")}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${animationStyle.startsWith("Shivering") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
            >
              震える
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
        {generatedImageSource && (
          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">スプライトシート構築 (Sprite Sheet Processing)</h2>
            <ImageProcessor 
              imageSource={generatedImageSource} 
              onProcessed={isFromHistory ? undefined : handleProcessedImage} 
              isFromHistory={isFromHistory}
            />
            
            {/* Manual Save Button */}
            {!isFromHistory && processedWebP && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSaveToFirebase}
                  disabled={isSaving}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? "保存中... (Saving)" : "画像を登録 (Firebaseへ保存)"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {viewMode === 'background' && (
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            1. スタイルを選択 (Style)
          </label>
          <div className="flex gap-2 flex-wrap mb-4">
            {BACKGROUND_STYLE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedBgStyleCategory(cat.id === selectedBgStyleCategory ? null : cat.id);
                  setSelectedBgStyle(null);
                }}
                className={`px-4 py-2 text-xs rounded-full border transition-all ${selectedBgStyleCategory === cat.id ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {selectedBgStyleCategory && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
              <div className="flex gap-2 flex-wrap">
                {BACKGROUND_STYLE_CATEGORIES.find(c => c.id === selectedBgStyleCategory)?.styles.map(style => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedBgStyle(style)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${selectedBgStyle?.value === style.value ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-700 border-gray-200 hover:border-green-300"}`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            2. 詳細なデザインを指定 (Background Prompt)
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
            rows={3}
            placeholder="例: 神秘的な森。木漏れ日が差している。ファンタジー風。"
            value={bgPrompt}
            onChange={(e) => setBgPrompt(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            3. 雰囲気・ライティングを指定 (Atmosphere/Lighting)
          </label>
          <div className="flex gap-2 mb-3 flex-wrap">
            {BACKGROUND_ATMOSPHERES.map(atm => (
              <button
                key={atm.value}
                onClick={() => setBgAtmosphere(atm.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${bgAtmosphere === atm.value ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-green-200"}`}
              >
                {atm.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
            placeholder="例: soft, airy, translucent"
            value={bgAtmosphere}
            onChange={(e) => setBgAtmosphere(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            4. アスペクト比 (Aspect Ratio)
          </label>
          <div className="flex gap-3 flex-wrap">
            {["1:1", "4:3", "3:4", "16:9", "9:16", "4:1"].map(ratio => (
              <button
                key={ratio}
                onClick={() => setBgAspectRatio(ratio)}
                className={`px-4 py-2 text-sm rounded-lg border transition-all ${bgAspectRatio === ratio ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateBackground}
          disabled={!bgPrompt || isGenerating}
          className="w-full py-4 mt-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg"
        >
          {isGenerating ? "生成中..." : "背景を生成する"}
        </button>

        {/* Reference Images based on selection */}
        {selectedBgStyle && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              同じ条件の過去画像 (Reference Images)
            </h3>
            {(() => {
              const refs = backgrounds.filter(bg => 
                bg.styleValue === selectedBgStyle.value && 
                (bgAtmosphere ? bg.atmosphere === bgAtmosphere : true)
              ).slice(0, 4);
              
              if (refs.length === 0) return <p className="text-xs text-gray-400 italic">この条件での過去の生成物はありません。</p>;
              
              return (
                <div className="grid grid-cols-4 gap-3">
                  {refs.map(ref => (
                    <div key={ref.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                      <img src={ref.imageUrl} alt="Reference" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button 
                           onClick={() => {
                             setBgPrompt(ref.detailedPrompt || "");
                             setBgAtmosphere(ref.atmosphere || "");
                             setBgAspectRatio(ref.aspectRatio);
                           }}
                           className="text-[10px] bg-white text-gray-800 px-2 py-1 rounded font-bold"
                         >
                           再現する
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Display the planned background prompt */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg relative border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-2">送信予定のプロンプト (Planned Prompt)</h3>
          <p className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200 min-h-[3rem]">
            {plannedBgPrompt || "スタイルやデザインを選択・入力してください..."}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {bgGeneratedImage && (
          <div className="mt-8 border-t pt-8 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">生成プレビュー</h2>
            <div className={`relative border-4 border-gray-200 rounded-xl overflow-hidden shadow-lg bg-gray-50 flex items-center justify-center`}
                 style={{ 
                   width: "100%", 
                   maxWidth: bgAspectRatio === "9:16" ? "300px" : bgAspectRatio === "16:9" ? "600px" : "400px",
                   aspectRatio: bgAspectRatio.replace(":", "/") 
                 }}>
              <img src={bgGeneratedImage} alt="Generated background" className="w-full h-full object-contain" />
              {isGenerating && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-800">Processing...</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
               <button
                  onClick={handleSaveBgToFirebase}
                  disabled={isSaving || !bgProcessedWebP}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? "保存中..." : "この背景を登録する"}
                </button>
            </div>
          </div>
        )}

        {/* Background History */}
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">背景履歴 (Background History)</h2>
          {isBgsLoading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : backgrounds.length === 0 ? (
            <p className="text-gray-500">背景の履歴はありません。</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {backgrounds.map(bg => (
                <div key={bg.id} className="group relative border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={bg.imageUrl} alt={bg.prompt} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-[10px] text-gray-500 font-mono mb-1">{bg.aspectRatio}</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                       {bg.style && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded">{bg.style}</span>}
                       {bg.atmosphere && <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded">{bg.atmosphere}</span>}
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-1" title={bg.prompt}>{bg.detailedPrompt || bg.prompt}</p>
                    <div className="flex justify-between items-center mt-2">
                       <button
                         onClick={() => {
                           setBgPrompt(bg.detailedPrompt || bg.prompt);
                           if (bg.styleValue) {
                              const category = BACKGROUND_STYLE_CATEGORIES.find(c => c.styles.some(s => s.value === bg.styleValue));
                              if (category) {
                                setSelectedBgStyleCategory(category.id);
                                const style = category.styles.find(s => s.value === bg.styleValue);
                                if (style) setSelectedBgStyle(style);
                              }
                           }
                           setBgAtmosphere(bg.atmosphere || "");
                           setBgAspectRatio(bg.aspectRatio);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                         }}
                         className="text-[10px] text-blue-500 hover:text-blue-700 font-bold"
                       >
                         再利用
                       </button>
                       <button
                         onClick={() => deleteBgFromHistory(bg.id)}
                         className="text-[10px] text-red-400 hover:text-red-600"
                       >
                         削除
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {viewMode === 'manage' && (
        <div className="w-full max-w-4xl space-y-8">
          {selectedForMaster && (
            <GameDataForm 
              imageUrl={selectedForMaster} 
              editMonster={editMonster}
              allMonsterIds={masterMonsters.map(m => m.id)}
              designPrompt={prompt}
              onCancel={() => {
                setSelectedForMaster(null);
                setEditMonster(null);
              }}
              onSuccess={() => {
                alert(editMonster ? "データを更新しました！" : "マスターデータへの登録が完了しました！");
                setSelectedForMaster(null);
                setEditMonster(null);
                setRefreshTrigger(prev => prev + 1);
              }}
            />
          )}

          <MasterListData 
            onEdit={handleEdit} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {/* History UI (Only show for Character mode) */}
      {viewMode === 'generate' && (
      <div className="mt-8 w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">キャラクター履歴 (Character History)</h2>
        <p className="text-xs text-gray-400 mb-4">※登録済みの画像はここには表示されません</p>
        {isCharsLoading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-gray-500">対象の履歴はありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredHistory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex flex-col items-center shadow-sm">
                <img
                  src={item.imageUrl || (item.imageBase64 ? `data:image/webp;base64,${item.imageBase64}` : "")}
                  alt="History thumbnail"
                  className="w-full h-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => loadFromHistory(item)}
                />
                <p className="text-xs mt-3 text-gray-600 line-clamp-2 w-full text-left" title={item.prompt}>
                  {item.prompt}
                </p>
                <div className="mt-4 w-full flex justify-between">
                  {viewMode === 'generate' ? (
                     <button
                       onClick={() => loadFromHistory(item)}
                       className="text-sm text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1 rounded"
                     >
                       プロンプト読込
                     </button>
                  ) : (
                      <button
                        onClick={() => {
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                           setSelectedForMaster(item.imageUrl || (item.imageBase64 ? `data:image/webp;base64,${item.imageBase64}` : ""));
                           // Extract original prompt from history item
                           if (item.prompt) {
                             const match = item.prompt.match(/^(.*?)\s*\((.*?)\)$/);
                             setPrompt(match ? match[1] : item.prompt);
                           }
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-3 py-1 rounded"
                      >
                        マスター登録へ
                      </button>
                  )}
                  <button
                    onClick={() => deleteCharFromHistory(item.id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium px-2"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </main>
  );
}
