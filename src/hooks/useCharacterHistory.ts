"use client";

import { useState, useEffect } from "react";
import { CharacterHistoryItem } from "@/data/repository/CharacterHistoryRepository";
import { historyRepository } from "@/data/repository/LocalHistoryRepository";

export function useCharacterHistory() {
  const [history, setHistory] = useState<CharacterHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    const data = await historyRepository.getAll();
    setHistory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const saveToHistory = async (prompt: string, imageBase64: string) => {
    await historyRepository.save({ prompt, imageBase64 });
    await fetchHistory();
  };

  const deleteFromHistory = async (id: string) => {
    await historyRepository.delete(id);
    await fetchHistory();
  };

  return {
    history,
    isLoading,
    saveToHistory,
    deleteFromHistory,
  };
}
