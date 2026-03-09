import { useEffect, useState, useMemo } from "react";
import { MonsterMasterData, monsterMasterRepository } from "@/data/repository/MonsterMasterRepository";

interface MasterListDataProps {
  onEdit: (monster: MonsterMasterData) => void;
  refreshTrigger: number;
}

type SortField = 'id' | 'name' | 'element' | 'evolutionStage' | 'hp' | 'atk' | 'def' | 'int_stat' | 'spd' | 'lck' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function MasterListData({ onEdit, refreshTrigger }: MasterListDataProps) {
  const [monsters, setMonsters] = useState<MonsterMasterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchMonsters = async () => {
    setIsLoading(true);
    try {
      const data = await monsterMasterRepository.getAll();
      setMonsters(data);
    } catch (e) {
      console.error("Failed to fetch monsters:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonsters();
  }, [refreshTrigger]);

  const sortedMonsters = useMemo(() => {
    return [...monsters].sort((a, b) => {
      let valA: any = a[sortField as keyof MonsterMasterData];
      let valB: any = b[sortField as keyof MonsterMasterData];

      // Handle nested name object
      if (sortField === 'name') {
        valA = a.name.ja;
        valB = b.name.ja;
      }

      const modifier = sortOrder === 'asc' ? 1 : -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * modifier;
      }
      
      if (valA < valB) return -1 * modifier;
      if (valA > valB) return 1 * modifier;
      return 0;
    });
  }, [monsters, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`本当にID: ${id} を削除しますか？`)) return;
    try {
      await monsterMasterRepository.delete(id);
      fetchMonsters();
    } catch (e) {
      alert("削除に失敗しました。");
    }
  };

  const handleStatChange = (id: string, field: keyof MonsterMasterData, value: number) => {
    setMonsters(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleInlineSave = async (monster: MonsterMasterData) => {
    setSavingId(monster.id);
    try {
      const { id, createdAt, ...data } = monster;
      await monsterMasterRepository.save(id, data);
    } catch (e) {
      alert("保存に失敗しました。");
    } finally {
      setSavingId(null);
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">⇅</span>;
    return <span className="text-indigo-600 ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  if (isLoading) return <div className="p-4 text-center">読み込み中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-bold text-gray-800">登録済みマスターデータ 一覧</h2>
        <div className="text-[10px] text-gray-400">
          並べ替え中: <span className="font-bold text-indigo-500">{sortField} ({sortOrder === 'asc' ? '昇順' : '降順'})</span>
        </div>
      </div>
      
      {monsters.length === 0 ? (
        <p className="text-gray-500 text-center py-8">登録されたデータはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 border-b w-24">画像</th>
                <th 
                  className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('id')}
                >
                  ID / 名前 <SortIndicator field="id" />
                </th>
                <th 
                  className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('element')}
                >
                  属性/段階 <SortIndicator field="element" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('hp')}
                >
                  HP <SortIndicator field="hp" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('atk')}
                >
                  ATK <SortIndicator field="atk" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('def')}
                >
                  DEF <SortIndicator field="def" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('int_stat')}
                >
                  INT <SortIndicator field="int_stat" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('spd')}
                >
                  SPD <SortIndicator field="spd" />
                </th>
                <th 
                  className="px-4 py-3 border-b w-16 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('lck')}
                >
                  LCK <SortIndicator field="lck" />
                </th>
                <th className="px-4 py-3 border-b text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMonsters.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden border border-gray-100 flex items-center justify-center">
                      <img 
                        src={m.spriteUrl} 
                        alt={m.name.ja} 
                        className="max-w-none h-16" 
                        style={{ 
                          objectFit: 'cover', 
                          objectPosition: 'left',
                          aspectRatio: '1/1'
                        }} 
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-[10px] text-indigo-500 font-bold">{m.id}</div>
                    <div className="font-bold text-sm text-gray-800">{m.name.ja}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 mb-1">
                      {m.element}
                    </span>
                    <div className="text-[10px] text-gray-500">{m.evolutionStage}</div>
                  </td>
                  
                  {[
                    { key: 'hp', color: 'bg-red-50' },
                    { key: 'atk', color: 'bg-orange-50' },
                    { key: 'def', color: 'bg-blue-50' },
                    { key: 'int_stat', color: 'bg-purple-50' },
                    { key: 'spd', color: 'bg-green-50' },
                    { key: 'lck', color: 'bg-yellow-50' }
                  ].map(stat => (
                    <td key={stat.key} className="px-1 py-3 text-center">
                      <input
                        type="number"
                        value={m[stat.key as keyof MonsterMasterData] as number}
                        onChange={(e) => handleStatChange(m.id, stat.key as keyof MonsterMasterData, Number(e.target.value))}
                        className={`w-12 p-1 text-center text-xs font-mono font-bold border rounded focus:ring-1 focus:ring-indigo-300 ${stat.color}`}
                      />
                    </td>
                  ))}

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleInlineSave(m)}
                        disabled={savingId === m.id}
                        className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 disabled:opacity-50"
                        title="ステータス更新"
                      >
                        {savingId === m.id ? "..." : "💾"}
                      </button>
                      <button
                        onClick={() => onEdit(m)}
                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        title="詳細編集"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 bg-red-50 text-red-500 rounded hover:bg-red-100"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-[10px] text-gray-400">※表の見出しをクリックすると並べ替えができます。ステータスを変更した後は 💾 ボタンで保存してください。</p>
    </div>
  );
}
