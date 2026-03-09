import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from "firebase/firestore/lite";

const COLLECTION_NAME = "monsters_master";

export interface MonsterMasterData {
  id: string; // Document ID (e.g., egg_fire)
  name: { ja: string; en: string };
  element: string; // FIRE, GRASS, WATER, FLOWER, THUNDER
  evolutionStage: string; // EGG, STAGE_1, etc.
  spriteUrl: string;
  description: { ja: string; en: string };
  evolution_paths?: Record<string, string>;
  hp: number;
  atk: number;
  def: number;
  int_stat: number;
  spd: number;
  lck: number;
  createdAt: number;
}

export class FirestoreMonsterMasterRepository {
  async save(id: string, data: Omit<MonsterMasterData, "id" | "createdAt">): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, {
      ...data,
      createdAt: Date.now(), // update or create
    }, { merge: true });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async getById(id: string): Promise<MonsterMasterData | null> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const doc = snapshot.docs.find(d => d.id === id);
    if (!doc) return null;
    return { id: doc.id, ...doc.data() } as MonsterMasterData;
  }

  async getAll(): Promise<MonsterMasterData[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MonsterMasterData[];
  }
}

export const monsterMasterRepository = new FirestoreMonsterMasterRepository();
