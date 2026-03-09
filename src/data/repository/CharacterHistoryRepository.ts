export interface CharacterHistoryItem {
  id: string;
  prompt: string;
  imageBase64?: string; // For local backward compatibility
  imageUrl?: string;    // For Firebase Storage
  createdAt: number;
}

export interface CharacterHistoryRepository {
  getAll(): Promise<CharacterHistoryItem[]>;
  save(item: Omit<CharacterHistoryItem, "id" | "createdAt">): Promise<CharacterHistoryItem>;
  delete(id: string): Promise<void>;
}
