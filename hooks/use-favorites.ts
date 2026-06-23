"use client";

import { useState } from "react";
import type { FoodProductSummary } from "@/lib/foods/types";
import { getFavoriteIdsAction, getFavoriteProductsAction } from "@/lib/actions/foods";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<FoodProductSummary[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  async function loadFavoriteIds() {
    const ids = await getFavoriteIdsAction();
    setFavoriteIds(new Set(ids));
  }

  async function loadFavorites() {
    const products = await getFavoriteProductsAction();
    setFavoriteProducts(products);
    setFavoritesLoaded(true);
  }

  // Call after a successful toggleFavoriteAction to keep local state in sync
  function applyToggleResult(productId: string, isFavorited: boolean, product?: FoodProductSummary) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(productId);
      else next.delete(productId);
      return next;
    });
    if (favoritesLoaded) {
      if (isFavorited && product) {
        setFavoriteProducts((prev) => [...prev, product]);
      } else if (!isFavorited) {
        setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    }
  }

  return {
    favoriteIds,
    setFavoriteIds,
    favoriteProducts,
    setFavoriteProducts,
    favoritesLoaded,
    loadFavoriteIds,
    loadFavorites,
    applyToggleResult,
  };
}
