"use client";

import { useState, useRef } from "react";
import ImageProcessor from "@/components/ImageProcessor";
import { useCharacterHistory } from "@/hooks/useCharacterHistory";
import { useBackgroundHistory } from "@/hooks/useBackgroundHistory";
import { useNarrationHistory } from "@/hooks/useNarrationHistory";
import GameDataForm from "@/components/GameDataForm";
import MasterListData from "@/components/MasterListData";
import { MonsterMasterData, monsterMasterRepository } from "@/data/repository/MonsterMasterRepository";
import { useEffect } from "react";
import { BACKGROUND_STYLE_CATEGORIES, BackgroundStyle, BACKGROUND_ATMOSPHERES } from "@/data/backgroundStyles";
import { CHARACTER_STYLE_CATEGORIES } from "@/data/characterStyles";
import { GEMINI_TTS_VOICES } from "@/data/voices";
import { mergeWavFiles, estimateWavDuration } from "@/lib/wavUtils";

const CORE_LAYOUT_PROMPT =
  "Sprite sheet with exactly four evenly spaced horizontal poses of the same character. The character must be drawn SMALL and CENTERED within each pose space, leaving plenty of empty white space around it to ensure absolutely no cropping. Do NOT draw boxes, borders, or panels separating the poses. Solid white background.";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [animationStyle, setAnimationStyle] = useState("");
  // Character Style states. Key is category ID, value is array of selected style values
  const [selectedCharStyles, setSelectedCharStyles] = useState<Record<string, string[]>>({
    "basic": ["Cartoon style, cell shaded, high contrast"], // Default
    "outline": ["clear THICK black outer lines on the character only, High contrast contour"] // Default
  });
  
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
  const [viewMode, setViewMode] = useState<'generate' | 'background' | 'narration' | 'manage'>('generate');
  const [selectedForMaster, setSelectedForMaster] = useState<string | null>(null);
  const [editMonster, setEditMonster] = useState<MonsterMasterData | null>(null);
  const [masterMonsters, setMasterMonsters] = useState<MonsterMasterData[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { history, isLoading: isCharsLoading, saveToHistory: saveCharToHistory, deleteFromHistory: deleteCharFromHistory } = useCharacterHistory();
  const { backgrounds, isLoading: isBgsLoading, saveToHistory: saveBgToHistory, deleteFromHistory: deleteBgFromHistory } = useBackgroundHistory();
  const { narrations, isLoading: isNarrationsLoading, saveNarration, deleteNarration, markAsUsedInMerge } = useNarrationHistory();

  // Narration states
  const [narrationText, setNarrationText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [narrationStyle, setNarrationStyle] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [isSavingNarration, setIsSavingNarration] = useState(false);
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const audioRef = useRef<HTMLAudioElement>(null);
  // Merge states
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeSilenceDuration, setMergeSilenceDuration] = useState(0.5);
  const [mergedAudioBase64, setMergedAudioBase64] = useState<string | null>(null);

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

  const generateStylePromptStr = () => {
    const allSelectedValues = Object.values(selectedCharStyles).flat();
    return allSelectedValues.length > 0 ? `${allSelectedValues.join(", ")}` : "";
  };

  const plannedPrompt = prompt ? `${prompt}${animationStyle ? `\n[Animation: ${animationStyle} loop]` : ""}\n\n[Style]\n${generateStylePromptStr()}\n\n[Layout]\n${CORE_LAYOUT_PROMPT}` : "";

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
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
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
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
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

  const loadFromHistory = (item: { imageUrl?: string; imageBase64?: string; prompt?: string }) => {
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
            onClick={() => setViewMode('narration')}
            className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${viewMode === 'narration' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🎙️ ナレーション
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

        {/* --- Character Style Selection --- */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            デザインスタイル (Style Options)
          </label>
          <div className="space-y-4">
            {CHARACTER_STYLE_CATEGORIES.map(category => (
              <div key={category.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs font-bold text-gray-500 mb-2 flex justify-between items-center">
                  <span>{category.name}</span>
                  <span className="text-[10px] font-normal bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                    {category.allowMultiple ? "複数選択可" : "1つのみ選択可"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.styles.map(style => {
                    const isSelected = (selectedCharStyles[category.id] || []).includes(style.value);
                    return (
                      <button
                        key={style.value}
                        onClick={() => {
                          setSelectedCharStyles(prev => {
                            const currentList = prev[category.id] || [];
                            if (category.allowMultiple) {
                              // Toggle
                              return {
                                ...prev,
                                [category.id]: isSelected 
                                  ? currentList.filter(v => v !== style.value)
                                  : [...currentList, style.value]
                              };
                            } else {
                              // Exclusive (replace or unselect if it was already selected to allow none)
                              return {
                                ...prev,
                                [category.id]: isSelected ? [] : [style.value]
                              };
                            }
                          });
                        }}
                        className={`px-3 py-1.5 text-xs rounded transition-colors border ${
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-600 font-bold" 
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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

      {viewMode === 'narration' && (
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-sm">
        {/* テキスト入力 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            1. ナレーション原稿 (Narration Text)
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            rows={5}
            placeholder="ここにナレーション原稿を入力してください..."
            value={narrationText}
            onChange={(e) => setNarrationText(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">日本語は自動検出されます。</p>
        </div>

        {/* ボイス選択 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            2. ボイス選択 (Voice)
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setVoiceGenderFilter('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${voiceGenderFilter === 'all' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              すべて
            </button>
            <button
              onClick={() => setVoiceGenderFilter('female')}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${voiceGenderFilter === 'female' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              ♀ 女性
            </button>
            <button
              onClick={() => setVoiceGenderFilter('male')}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${voiceGenderFilter === 'male' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              ♂ 男性
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {GEMINI_TTS_VOICES
              .filter(v => voiceGenderFilter === 'all' || v.gender === voiceGenderFilter)
              .map(voice => (
              <button
                key={voice.name}
                onClick={() => setSelectedVoice(voice.name)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  selectedVoice === voice.name
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
                }`}
                title={voice.tone}
              >
                <span>{voice.gender === 'female' ? '♀' : '♂'} {voice.label}</span>
                <span className="block text-[10px] opacity-70">{voice.tone}</span>
              </button>
            ))}
          </div>
        </div>

        {/* スタイル指示 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            3. スタイル指示（オプション）
          </label>
          <div className="flex gap-2 mb-3 flex-wrap">
            {[
              { label: "明るく", value: "Say cheerfully" },
              { label: "落ち着いて", value: "Say calmly and soothingly" },
              { label: "ウィスパー", value: "Say in a soft whisper" },
              { label: "ドラマチック", value: "Say dramatically with emotion" },
              { label: "ニュースキャスター風", value: "Say like a professional news anchor" },
              { label: "ナレーター風", value: "Say like a documentary narrator, with gravitas" },
              { label: "ゆっくり", value: "Say slowly and deliberately" },
              { label: "早口で", value: "Say quickly with excitement" },
            ].map(preset => (
              <button
                key={preset.value}
                onClick={() => setNarrationStyle(preset.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                  narrationStyle === preset.value
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-amber-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            placeholder="自由にスタイルを指定（例: Say in a spooky whisper）"
            value={narrationStyle}
            onChange={(e) => setNarrationStyle(e.target.value)}
          />
        </div>

        {/* 生成ボタン */}
        <button
          onClick={async () => {
            if (!narrationText) return;
            setIsGeneratingAudio(true);
            setNarrationError(null);
            setGeneratedAudioBase64(null);
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 120_000); // 120秒タイムアウト
              const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: narrationText,
                  voiceName: selectedVoice,
                  stylePrompt: narrationStyle || undefined,
                }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || "音声生成に失敗しました");
              }
              setGeneratedAudioBase64(data.audioBase64);
            } catch (err: unknown) {
              console.error(err);
              if (err instanceof DOMException && err.name === "AbortError") {
                setNarrationError("音声生成がタイムアウトしました。テキストを短くして再試行してください。");
              } else if (err instanceof TypeError && (err.message === "fetch failed" || err.message === "Failed to fetch")) {
                setNarrationError("サーバーとの通信に失敗しました。音声生成に時間がかかりすぎた可能性があります。テキストを短くして再試行してください。");
              } else {
                setNarrationError(err instanceof Error ? err.message : "不明なエラーが発生しました");
              }
            } finally {
              setIsGeneratingAudio(false);
            }
          }}
          disabled={!narrationText || isGeneratingAudio}
          className="w-full py-4 mt-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
        >
          {isGeneratingAudio ? "音声生成中..." : "🎙️ 音声を生成する"}
        </button>

        {narrationError && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-lg">
            {narrationError}
          </div>
        )}

        {/* 生成結果プレビュー */}
        {generatedAudioBase64 && (
          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">🔊 生成プレビュー</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <audio
                ref={audioRef}
                controls
                className="w-full mb-4"
                src={`data:audio/wav;base64,${generatedAudioBase64}`}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `data:audio/wav;base64,${generatedAudioBase64}`;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    link.download = `narration_${timestamp}.wav`;
                    link.click();
                  }}
                  className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  📥 WAVダウンロード
                </button>
                <button
                  onClick={async () => {
                    if (!generatedAudioBase64) return;
                    setIsSavingNarration(true);
                    try {
                      await saveNarration({
                        text: narrationText,
                        voiceName: selectedVoice,
                        stylePrompt: narrationStyle || undefined,
                        audioBase64: generatedAudioBase64,
                      });
                      alert("ナレーションを保存しました！");
                    } catch (err) {
                      console.error("Failed to save narration:", err);
                      setNarrationError("保存に失敗しました。");
                    } finally {
                      setIsSavingNarration(false);
                    }
                  }}
                  disabled={isSavingNarration}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isSavingNarration ? "保存中..." : "💾 履歴に保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ナレーション履歴 */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">ナレーション履歴</h2>
            {narrations.length >= 2 && (
              <button
                onClick={() => {
                  setIsMergeMode(!isMergeMode);
                  setSelectedForMerge([]);
                  setMergedAudioBase64(null);
                }}
                className={`px-4 py-2 text-sm rounded-lg font-bold transition-all ${
                  isMergeMode
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {isMergeMode ? '✕ 結合モード終了' : '🔗 音声を結合'}
              </button>
            )}
          </div>

          {/* 結合パネル */}
          {isMergeMode && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800 mb-3 font-medium">
                結合したいナレーションを選択してください（選択順に結合されます）
              </p>
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm text-gray-700 font-medium">音声間の無音:</label>
                <div className="flex gap-2">
                  {[0, 0.5, 1, 1.5, 2, 3].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setMergeSilenceDuration(sec)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        mergeSilenceDuration === sec
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {sec === 0 ? 'なし' : `${sec}秒`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectedForMerge.length < 2) return;
                    // 選択順にBase64データを取得
                    const wavList = selectedForMerge
                      .map(id => narrations.find(n => n.id === id))
                      .filter((n): n is NonNullable<typeof n> => n != null)
                      .map(n => n.audioBase64);
                    try {
                      const merged = mergeWavFiles(wavList, mergeSilenceDuration);
                      setMergedAudioBase64(merged);
                    } catch (err) {
                      console.error('Merge failed:', err);
                      setNarrationError('音声の結合に失敗しました。');
                    }
                  }}
                  disabled={selectedForMerge.length < 2}
                  className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔗 {selectedForMerge.length}件を結合
                </button>
                {selectedForMerge.length > 0 && (
                  <button
                    onClick={() => setSelectedForMerge([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    選択解除
                  </button>
                )}
                {selectedForMerge.length > 0 && (
                  <span className="text-xs text-gray-400">
                    合計 約 {Math.round(selectedForMerge
                      .map(id => narrations.find(n => n.id === id))
                      .filter((n): n is NonNullable<typeof n> => n != null)
                      .reduce((sum, n) => sum + estimateWavDuration(n.audioBase64), 0)
                      + mergeSilenceDuration * Math.max(0, selectedForMerge.length - 1)
                    )}秒
                  </span>
                )}
              </div>

              {/* 結合プレビュー */}
              {mergedAudioBase64 && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-amber-100">
                  <p className="text-sm font-bold text-gray-700 mb-2">🔊 結合プレビュー</p>
                  <audio
                    controls
                    className="w-full mb-3"
                    src={`data:audio/wav;base64,${mergedAudioBase64}`}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `data:audio/wav;base64,${mergedAudioBase64}`;
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                        link.download = `narration_merged_${timestamp}.wav`;
                        link.click();
                      }}
                      className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      📥 結合WAVダウンロード
                    </button>
                    <button
                      onClick={async () => {
                        if (!mergedAudioBase64) return;
                        setIsSavingNarration(true);
                        try {
                          const mergedTexts = selectedForMerge
                            .map(id => narrations.find(n => n.id === id))
                            .filter((n): n is NonNullable<typeof n> => n != null)
                            .map(n => n.text);
                          await saveNarration({
                            text: `[結合] ${mergedTexts.join(' / ')}`,
                            voiceName: 'merged',
                            stylePrompt: `${selectedForMerge.length}件結合 (間隔:${mergeSilenceDuration}秒)`,
                            audioBase64: mergedAudioBase64,
                          });
                          await markAsUsedInMerge([...selectedForMerge]);
                          setSelectedForMerge([]);
                          setMergedAudioBase64(null);
                          alert('結合した音声を保存しました！');
                        } catch (err) {
                          console.error('Failed to save merged narration:', err);
                          setNarrationError('結合音声の保存に失敗しました。');
                        } finally {
                          setIsSavingNarration(false);
                        }
                      }}
                      disabled={isSavingNarration}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {isSavingNarration ? '保存中...' : '💾 履歴に保存'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isNarrationsLoading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : narrations.length === 0 ? (
            <p className="text-gray-500">ナレーションの履歴はありません。</p>
          ) : (
            <div className="space-y-4">
              {narrations.map((item, index) => {
                const mergeIndex = selectedForMerge.indexOf(item.id);
                const isSelectedForMerge = mergeIndex !== -1;
                const isMergedItem = item.voiceName === 'merged';
                const isUsedInMerge = item.usedInMerge === true && !isMergedItem;
                return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-all ${
                    isSelectedForMerge
                      ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-300'
                      : isMergedItem
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50'
                        : isUsedInMerge
                          ? 'border-green-300 bg-green-50/60'
                          : 'border-gray-200'
                  }`}
                >
                  {isMergedItem && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                        🔗 結合音声
                      </span>
                    </div>
                  )}
                  {isUsedInMerge && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                        ✓ 結合済み
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      {isMergeMode && (
                        <button
                          onClick={() => {
                            setMergedAudioBase64(null);
                            setSelectedForMerge(prev =>
                              isSelectedForMerge
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          className={`mt-0.5 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                            isSelectedForMerge
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-gray-300 text-transparent hover:border-amber-400'
                          }`}
                        >
                          {isSelectedForMerge ? mergeIndex + 1 : ''}
                        </button>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 mb-1 line-clamp-2">{item.text}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                            🎙️ {item.voiceName}
                          </span>
                          {item.stylePrompt && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                              {item.stylePrompt}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(item.createdAt).toLocaleString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <audio
                    controls
                    className="w-full mb-2"
                    src={`data:audio/wav;base64,${item.audioBase64}`}
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `data:audio/wav;base64,${item.audioBase64}`;
                          link.download = `narration_${item.id.slice(0, 8)}.wav`;
                          link.click();
                        }}
                        className="text-[11px] text-green-600 hover:text-green-800 font-bold"
                      >
                        📥 ダウンロード
                      </button>
                      <button
                        onClick={() => {
                          setNarrationText(item.text);
                          setSelectedVoice(item.voiceName);
                          setNarrationStyle(item.stylePrompt || "");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[11px] text-blue-500 hover:text-blue-700 font-bold"
                      >
                        🔄 再利用
                      </button>
                    </div>
                    <button
                      onClick={() => deleteNarration(item.id)}
                      className="text-[11px] text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </div>
                );
              })}
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
