import { useState, useEffect } from "react";
import { MonsterMasterData, monsterMasterRepository } from "@/data/repository/MonsterMasterRepository";

interface GameDataFormProps {
  imageUrl: string;
  onCancel: () => void;
  onSuccess: () => void;
  editMonster?: MonsterMasterData | null;
  allMonsterIds?: string[];
  designPrompt?: string;
}

export default function GameDataForm({ imageUrl, onCancel, onSuccess, editMonster, allMonsterIds = [], designPrompt = "" }: GameDataFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [id, setId] = useState(editMonster?.id || "");
  const [nameJa, setNameJa] = useState(editMonster?.name.ja || "");
  const [nameEn, setNameEn] = useState(editMonster?.name.en || "");
  const [element, setElement] = useState(editMonster?.element || "FIRE");
  const [evolutionStage, setEvolutionStage] = useState(editMonster?.evolutionStage || "EGG");
  const [descriptionJa, setDescriptionJa] = useState(editMonster?.description.ja || "");
  const [descriptionEn, setDescriptionEn] = useState(editMonster?.description.en || "");
  const [hp, setHp] = useState(editMonster?.hp ?? 10);
  const [atk, setAtk] = useState(editMonster?.atk ?? 5);
  const [def, setDef] = useState(editMonster?.def ?? 5);
  const [intStat, setIntStat] = useState(editMonster?.int_stat ?? 5);
  const [spd, setSpd] = useState(editMonster?.spd ?? 5);
  const [lck, setLck] = useState(editMonster?.lck ?? 5);
  const [evolutionPathsStr, setEvolutionPathsStr] = useState(editMonster?.evolution_paths ? JSON.stringify(editMonster.evolution_paths, null, 2) : "");

  // Reset state when editMonster changes
  useEffect(() => {
    setId(editMonster?.id || "");
    setNameJa(editMonster?.name.ja || "");
    setNameEn(editMonster?.name.en || "");
    setElement(editMonster?.element || "FIRE");
    setEvolutionStage(editMonster?.evolutionStage || "EGG");
    setDescriptionJa(editMonster?.description.ja || "");
    setDescriptionEn(editMonster?.description.en || "");
    setHp(editMonster?.hp ?? 10);
    setAtk(editMonster?.atk ?? 5);
    setDef(editMonster?.def ?? 5);
    setIntStat(editMonster?.int_stat ?? 5);
    setSpd(editMonster?.spd ?? 5);
    setLck(editMonster?.lck ?? 5);
    setEvolutionPathsStr(editMonster?.evolution_paths ? JSON.stringify(editMonster.evolution_paths, null, 2) : "");
    setError(null);
  }, [editMonster, imageUrl]);

  const handleGenerateId = () => {
    setIsGeneratingId(true);
    try {
      const elemPrefix = element.toLowerCase();
      let stagePrefix = "egg";
      if (evolutionStage === "STAGE_1") stagePrefix = "st1";
      else if (evolutionStage === "STAGE_2") stagePrefix = "st2";

      const prefix = `${elemPrefix}_${stagePrefix}_`;
      
      // Find max number for this prefix
      const matchingIds = allMonsterIds.filter(mid => mid.startsWith(prefix));
      let maxNum = 0;
      
      matchingIds.forEach(mid => {
        const parts = mid.split('_');
        const numPart = parts[parts.length - 1];
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });

      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      setId(`${prefix}${nextNum}`);
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Path selection helpers
  const [newPathKey, setNewPathKey] = useState("");
  const [selectedPathId, setSelectedPathId] = useState("");

  const addPath = () => {
    if (!newPathKey || !selectedPathId) return;
    try {
      const current = evolutionPathsStr.trim() ? JSON.parse(evolutionPathsStr) : {};
      current[newPathKey] = selectedPathId;
      setEvolutionPathsStr(JSON.stringify(current, null, 2));
      setNewPathKey("");
      setSelectedPathId("");
    } catch (e) {
      alert("現在のJSONが不正なため追加できません。");
    }
  };

  const handleSuggestName = async () => {
    setIsSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ element, stage: evolutionStage, designPrompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNameJa(data.nameJa);
      setNameEn(data.nameEn);
      setDescriptionJa(data.descriptionJa);
      setDescriptionEn(data.descriptionEn);
    } catch (e) {
      setError("AIによる提案に失敗しました。");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleTranslate = async (text: string, targetLang: 'ja' | 'en', field: 'name' | 'desc') => {
    if (!text) return;
    setIsTranslating(`${field}-${targetLang}`);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          targetLang, 
          context: `Character ${field} for a ${element} element monster` 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (field === 'name') {
        if (targetLang === 'en') setNameEn(data.translatedText);
        else setNameJa(data.translatedText);
      } else {
        if (targetLang === 'en') setDescriptionEn(data.translatedText);
        else setDescriptionJa(data.translatedText);
      }
    } catch (e) {
      setError("翻訳に失敗しました。");
    } finally {
      setIsTranslating(null);
    }
  };

  const handleSave = async () => {
    if (!id || !nameJa) {
      setError("ID、名前（日本語）は必須です。");
      return;
    }

    setIsSaving(true);
    setError(null);

    let evolution_paths = undefined;
    if (evolutionPathsStr.trim() !== "") {
      try {
        evolution_paths = JSON.parse(evolutionPathsStr);
      } catch (e) {
        setError("進化ルートのJSON形式が正しくありません。");
        setIsSaving(false);
        return;
      }
    }

    const dataToSave: Omit<MonsterMasterData, "id" | "createdAt"> = {
      name: { ja: nameJa, en: nameEn },
      element,
      evolutionStage,
      spriteUrl: imageUrl,
      description: { ja: descriptionJa, en: descriptionEn },
      hp: Number(hp),
      atk: Number(atk),
      def: Number(def),
      int_stat: Number(intStat),
      spd: Number(spd),
      lck: Number(lck),
      ...(evolution_paths ? { evolution_paths } : {})
    };

    try {
      await monsterMasterRepository.save(id, dataToSave);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save master data.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-2xl font-bold text-indigo-800">{editMonster ? "マスターデータ編集" : "マスターデータ登録"}</h2>
        <div className="flex gap-2">
          {!editMonster && (
            <button 
              onClick={handleSuggestName} 
              disabled={isSuggesting}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold hover:bg-purple-200 transition-colors"
            >
              {isSuggesting ? "考え中..." : "✨ AIに名前を考えてもらう"}
            </button>
          )}
          {editMonster && <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold">編集モード</div>}
        </div>
      </div>
      
      <div className="flex gap-6 mb-6">
        <div className="w-1/3">
          <div className="bg-gray-100 rounded-lg p-2 text-center">
             <img src={imageUrl} alt="Selected sprite" className="mx-auto rounded max-w-full h-auto object-contain" style={{maxHeight: '200px'}} />
          </div>
          <p className="text-xs text-center mt-2 text-gray-500">選択した画像</p>
        </div>
        
        <div className="w-2/3 grid grid-cols-2 gap-4">
           <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-xs font-bold text-gray-700">ID (英数字)</label>
               {!editMonster && (
                 <button 
                   onClick={handleGenerateId}
                   className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                 >
                   ID自動生成
                 </button>
               )}
             </div>
             <input 
               type="text" 
               value={id} 
               onChange={e => setId(e.target.value)} 
               placeholder="例: fire_egg_001" 
               className={`w-full border p-2 rounded text-sm ${editMonster ? 'bg-gray-100' : 'bg-indigo-50'}`}
               readOnly={!!editMonster}
             />
             {editMonster && <p className="text-[10px] text-gray-400 mt-1">※編集時はIDを変更できません</p>}
           </div>
           <div></div> {/* spacer */}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">名前 (JA)</label>
                <button 
                  onClick={() => handleTranslate(nameJa, 'en', 'name')}
                  disabled={!!isTranslating}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                >
                  {isTranslating === 'name-en' ? "..." : "英訳 ➔"}
                </button>
              </div>
              <input type="text" value={nameJa} onChange={e => setNameJa(e.target.value)} placeholder="ほのおのたまご" className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-300" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">名前 (EN)</label>
                <button 
                  onClick={() => handleTranslate(nameEn, 'ja', 'name')}
                  disabled={!!isTranslating}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                >
                  {isTranslating === 'name-ja' ? "..." : "← 和訳"}
                </button>
              </div>
              <input type="text" value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Fire Egg" className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-300" />
            </div>

           <div>
             <label className="block text-xs font-bold text-gray-700 mb-1">属性 (Element)</label>
             <select value={element} onChange={e => setElement(e.target.value)} className="w-full border p-2 rounded text-sm">
                <option value="FIRE">FIRE (炎)</option>
                <option value="WATER">WATER (水)</option>
                <option value="GRASS">GRASS (草)</option>
                <option value="THUNDER">THUNDER (雷)</option>
                <option value="FLOWER">FLOWER (花・大地)</option>
             </select>
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-700 mb-1">進化段階 (Stage)</label>
             <select value={evolutionStage} onChange={e => setEvolutionStage(e.target.value)} className="w-full border p-2 rounded text-sm">
                <option value="EGG">EGG (たまご)</option>
                <option value="STAGE_1">STAGE 1</option>
                <option value="STAGE_2">STAGE 2</option>
             </select>
           </div>
        </div>
      </div>

       <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-700">説明 (JA)</label>
              <button 
                onClick={() => handleTranslate(descriptionJa, 'en', 'desc')}
                disabled={!!isTranslating}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
              >
                {isTranslating === 'desc-en' ? "..." : "英訳 ➔"}
              </button>
            </div>
            <textarea value={descriptionJa} onChange={e => setDescriptionJa(e.target.value)} rows={2} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-300"></textarea>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-700">説明 (EN)</label>
              <button 
                onClick={() => handleTranslate(descriptionEn, 'ja', 'desc')}
                disabled={!!isTranslating}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
              >
                {isTranslating === 'desc-ja' ? "..." : "← 和訳"}
              </button>
            </div>
            <textarea value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} rows={2} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-300"></textarea>
          </div>
      </div>

      <div className="bg-gray-50 p-3 rounded mb-4">
        <label className="block text-xs font-bold text-gray-700 mb-2">初期ステータス</label>
        <div className="grid grid-cols-6 gap-2">
           <div>
             <span className="text-xs text-gray-500 block">HP</span>
             <input type="number" value={hp} onChange={e => setHp(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
           <div>
             <span className="text-xs text-gray-500 block">ATK</span>
             <input type="number" value={atk} onChange={e => setAtk(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
           <div>
             <span className="text-xs text-gray-500 block">DEF</span>
             <input type="number" value={def} onChange={e => setDef(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
           <div>
             <span className="text-xs text-gray-500 block">INT</span>
             <input type="number" value={intStat} onChange={e => setIntStat(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
           <div>
             <span className="text-xs text-gray-500 block">SPD</span>
             <input type="number" value={spd} onChange={e => setSpd(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
           <div>
             <span className="text-xs text-gray-500 block">LCK</span>
             <input type="number" value={lck} onChange={e => setLck(Number(e.target.value))} className="w-full border p-1 rounded text-sm" />
           </div>
        </div>
      </div>


      <div className="mb-6">
         <label className="block text-xs font-bold text-gray-700 mb-1">進化ルート (JSON形式 - 任意)</label>
         
         {/* ID Selection Helper */}
         <div className="bg-indigo-50 p-2 rounded mb-2 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">分岐条件 (MELEE, MAGIC等)</label>
              <input type="text" value={newPathKey} onChange={e => setNewPathKey(e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="MELEE" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">進化先IDを選択</label>
              <select value={selectedPathId} onChange={e => setSelectedPathId(e.target.value)} className="w-full p-1 border rounded text-xs bg-white">
                 <option value="">-- IDを選択 --</option>
                 {allMonsterIds.map(mid => <option key={mid} value={mid}>{mid}</option>)}
              </select>
            </div>
            <button onClick={addPath} type="button" className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold mb-[2px] h-[26px]">追加</button>
         </div>

         <textarea value={evolutionPathsStr} onChange={e => setEvolutionPathsStr(e.target.value)} placeholder='例: { "MELEE": "fire_knight_01", "MAGIC": "fire_mage_01" }' rows={3} className="w-full font-mono text-xs border p-2 rounded focus:ring-1 focus:ring-indigo-300"></textarea>
      </div>

      {error && <div className="text-red-500 text-sm mb-4 font-bold">{error}</div>}

      <div className="flex justify-end gap-3 border-t pt-4">
         <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-bold transition">キャンセル</button>
          <button onClick={handleSave} disabled={isSaving} className={`px-6 py-2 text-white rounded font-bold disabled:opacity-50 transition ${editMonster ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isSaving ? "保存中..." : (editMonster ? "データを更新" : "ゲームデータとして保存")}
          </button>
      </div>
    </div>
  );
}
