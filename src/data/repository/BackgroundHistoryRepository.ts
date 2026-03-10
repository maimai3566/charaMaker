export interface BackgroundHistoryItem {
  id: string;
  prompt: string;
  aspectRatio: string;
  imageBase64?: string;
  imageUrl?: string;
  createdAt: number;
  // New detail fields
  style?: string;          // e.g. "ファンタジー風"
  styleValue?: string;     // e.g. "fantasy style"
  detailedPrompt?: string; // The raw user input
  atmosphere?: string;     // The atmosphere text (JP or EN)
}

export interface BackgroundHistoryRepository {
  getAll(): Promise<BackgroundHistoryItem[]>;
  save(item: Omit<BackgroundHistoryItem, "id" | "createdAt">): Promise<BackgroundHistoryItem>;
  delete(id: string): Promise<void>;
}
