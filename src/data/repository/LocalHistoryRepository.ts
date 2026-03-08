import { CharacterHistoryItem, CharacterHistoryRepository } from "./CharacterHistoryRepository";

const STORAGE_KEY = "chara_maker_history";

export class LocalHistoryRepository implements CharacterHistoryRepository {
  private getHistoryFromStorage(): CharacterHistoryItem[] {
    if (typeof window === "undefined") return [];
    
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private saveHistoryToStorage(history: CharacterHistoryItem[]) {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }

  async getAll(): Promise<CharacterHistoryItem[]> {
    // Simulate async network request
    return new Promise((resolve) => {
      setTimeout(() => {
        const history = this.getHistoryFromStorage();
        resolve(history.sort((a, b) => b.createdAt - a.createdAt)); // Newest first
      }, 50);
    });
  }

  async save(item: Omit<CharacterHistoryItem, "id" | "createdAt">): Promise<CharacterHistoryItem> {
    return new Promise((resolve) => {
      const newItem: CharacterHistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      const history = this.getHistoryFromStorage();
      history.push(newItem);
      this.saveHistoryToStorage(history);

      setTimeout(() => resolve(newItem), 50);
    });
  }

  async delete(id: string): Promise<void> {
    return new Promise((resolve) => {
      let history = this.getHistoryFromStorage();
      history = history.filter(item => item.id !== id);
      this.saveHistoryToStorage(history);
      setTimeout(() => resolve(), 50);
    });
  }
}

// Ensure pseudo-singleton for the app
export const historyRepository = new LocalHistoryRepository();
