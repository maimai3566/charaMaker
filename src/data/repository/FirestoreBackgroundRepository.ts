import { BackgroundHistoryItem, BackgroundHistoryRepository } from "./BackgroundHistoryRepository";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore/lite";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

const COLLECTION_NAME = "backgrounds";

export class FirestoreBackgroundRepository implements BackgroundHistoryRepository {
  async getAll(): Promise<BackgroundHistoryItem[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BackgroundHistoryItem[];
  }

  async save(item: Omit<BackgroundHistoryItem, "id" | "createdAt">): Promise<BackgroundHistoryItem> {
    let finalImageUrl = item.imageUrl;

    if (item.imageBase64 && !finalImageUrl) {
      const storageRef = ref(storage, `backgrounds/${Date.now()}_${crypto.randomUUID()}.webp`);
      await uploadString(storageRef, item.imageBase64, 'base64', { contentType: 'image/webp' });
      finalImageUrl = await getDownloadURL(storageRef);
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      prompt: item.prompt,
      aspectRatio: item.aspectRatio,
      imageUrl: finalImageUrl || null,
      createdAt: Date.now(),
      style: item.style || null,
      styleValue: item.styleValue || null,
      detailedPrompt: item.detailedPrompt || null,
      atmosphere: item.atmosphere || null,
    });

    return {
      id: docRef.id,
      prompt: item.prompt,
      aspectRatio: item.aspectRatio,
      imageUrl: finalImageUrl || undefined,
      createdAt: Date.now(),
      style: item.style,
      styleValue: item.styleValue,
      detailedPrompt: item.detailedPrompt,
      atmosphere: item.atmosphere,
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
            console.error("Failed to delete background from Storage:", e);
          }
        }
      }
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Failed to delete background history item:", e);
      throw e;
    }
  }
}

export const backgroundRepository = new FirestoreBackgroundRepository();
