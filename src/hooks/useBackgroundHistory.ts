"use client";

import { useState, useEffect } from "react";
import { BackgroundHistoryItem } from "@/data/repository/BackgroundHistoryRepository";
import { backgroundRepository } from "@/data/repository/FirestoreBackgroundRepository";

export function useBackgroundHistory() {
  const [backgrounds, setBackgrounds] = useState<BackgroundHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await backgroundRepository.getAll();
      setBackgrounds(data);
    } catch (error) {
      console.error("Failed to fetch background history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const saveToHistory = async (
    prompt: string, 
    aspectRatio: string, 
    imageBase64: string,
    details?: { style?: string; styleValue?: string; detailedPrompt?: string; atmosphere?: string }
  ) => {
    await backgroundRepository.save({ 
      prompt, 
      aspectRatio, 
      imageBase64,
      ...details
    });
    await fetchHistory();
  };

  const deleteFromHistory = async (id: string) => {
    await backgroundRepository.delete(id);
    await fetchHistory();
  };

  return {
    backgrounds,
    isLoading,
    saveToHistory,
    deleteFromHistory,
    refreshHistory: fetchHistory,
  };
}
