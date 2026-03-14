export interface NarrationItem {
  id: string;
  text: string;
  voiceName: string;
  stylePrompt?: string;
  audioBase64: string; // WAV audio as Base64
  createdAt: number;
  usedInMerge?: boolean; // 結合に使用された音声かどうか
}

export interface NarrationRepository {
  getAll(): Promise<NarrationItem[]>;
  save(item: Omit<NarrationItem, "id" | "createdAt">): Promise<NarrationItem>;
  update(id: string, fields: Partial<Pick<NarrationItem, "usedInMerge">>): Promise<void>;
  delete(id: string): Promise<void>;
}
