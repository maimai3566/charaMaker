import { NarrationItem, NarrationRepository } from "./NarrationRepository";

const DB_NAME = "chara_maker_db";
const STORE_NAME = "narrations";
const DB_VERSION = 1;

/**
 * IndexedDBベースのナレーション永続化実装。
 * localStorageと異なり、大容量の音声データも安全に保存できる。
 * コード変更・ページリロード・ブラウザ再起動でもデータは失われない。
 */
export class LocalNarrationRepository implements NarrationRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("IndexedDB is not available on the server"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async getAll(): Promise<NarrationItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: NarrationItem[] = request.result;
        // 新しい順にソート
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => {
        console.error("Failed to get narrations:", request.error);
        reject(request.error);
      };
    });
  }

  async save(item: Omit<NarrationItem, "id" | "createdAt">): Promise<NarrationItem> {
    const db = await this.openDB();
    const newItem: NarrationItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(newItem);

      request.onsuccess = () => resolve(newItem);
      request.onerror = () => {
        console.error("Failed to save narration:", request.error);
        reject(request.error);
      };
    });
  }

  async update(id: string, fields: Partial<Pick<NarrationItem, "usedInMerge">>): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as NarrationItem | undefined;
        if (!existing) {
          console.error(`Narration not found for update: ${id}`);
          resolve(); // 見つからなくても失敗にしない（削除済みの可能性）
          return;
        }
        const updated = { ...existing, ...fields };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => {
          console.error("Failed to update narration:", putRequest.error);
          reject(putRequest.error);
        };
      };
      getRequest.onerror = () => {
        console.error("Failed to get narration for update:", getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to delete narration:", request.error);
        reject(request.error);
      };
    });
  }
}

export const narrationRepository = new LocalNarrationRepository();
