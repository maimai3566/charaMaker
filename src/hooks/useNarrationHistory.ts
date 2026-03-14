"use client";

import { useState, useEffect, useCallback } from "react";
import { NarrationItem } from "@/data/repository/NarrationRepository";
import { narrationRepository } from "@/data/repository/LocalNarrationRepository";

export function useNarrationHistory() {
  const [narrations, setNarrations] = useState<NarrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNarrations = useCallback(async () => {
    try {
      const items = await narrationRepository.getAll();
      setNarrations(items);
    } catch (e) {
      console.error("Failed to load narration history:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNarrations();
  }, [fetchNarrations]);

  const saveNarration = useCallback(
    async (item: Omit<NarrationItem, "id" | "createdAt">) => {
      const saved = await narrationRepository.save(item);
      setNarrations((prev) => [saved, ...prev]);
      return saved;
    },
    []
  );

  const deleteNarration = useCallback(async (id: string) => {
    await narrationRepository.delete(id);
    setNarrations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * 指定したIDのナレーションを「結合に使用済み」としてマークする。
   * DBとローカルstateの両方を更新する。
   */
  const markAsUsedInMerge = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map((id) => narrationRepository.update(id, { usedInMerge: true }))
    );
    setNarrations((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, usedInMerge: true } : item
      )
    );
  }, []);

  return {
    narrations,
    isLoading,
    saveNarration,
    deleteNarration,
    markAsUsedInMerge,
  };
}
