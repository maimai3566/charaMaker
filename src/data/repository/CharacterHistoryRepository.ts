export interface CharacterHistoryItem {
  id: string;
  prompt: string;
  imageBase64: string; // The raw 16:9 base64 image
  createdAt: number;
}

export interface CharacterHistoryRepository {
  getAll(): Promise<CharacterHistoryItem[]>;
  save(item: Omit<CharacterHistoryItem, "id" | "createdAt">): Promise<CharacterHistoryItem>;
  delete(id: string): Promise<void>;
}
