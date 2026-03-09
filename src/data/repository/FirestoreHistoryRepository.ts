import { CharacterHistoryItem, CharacterHistoryRepository } from "./CharacterHistoryRepository";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore/lite";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

const COLLECTION_NAME = "characters";

export class FirestoreHistoryRepository implements CharacterHistoryRepository {
  async getAll(): Promise<CharacterHistoryItem[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CharacterHistoryItem[];
  }

  async save(item: Omit<CharacterHistoryItem, "id" | "createdAt">): Promise<CharacterHistoryItem> {
    let finalImageUrl = item.imageUrl;

    if (item.imageBase64 && !finalImageUrl) {
      const storageRef = ref(storage, `characters/${Date.now()}_${crypto.randomUUID()}.webp`);
      await uploadString(storageRef, item.imageBase64, 'base64', { contentType: 'image/webp' });
      finalImageUrl = await getDownloadURL(storageRef);
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      prompt: item.prompt,
      imageUrl: finalImageUrl || null,
      createdAt: Date.now(),
    });

    return {
      id: docRef.id,
      prompt: item.prompt,
      imageUrl: finalImageUrl || undefined,
      createdAt: Date.now(),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.imageUrl) {
          try {
            const imageRef = ref(storage, data.imageUrl);
            await deleteObject(imageRef);
          } catch (e) {
            console.error("Failed to delete image from Storage:", e);
          }
        }
      }
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Failed to delete history item:", e);
      throw e;
    }
  }
}

export const historyRepository = new FirestoreHistoryRepository();
