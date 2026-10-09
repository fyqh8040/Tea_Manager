import { useState, useEffect, useMemo, useCallback } from 'react';
import { TeaItem, SystemStats, ItemType } from '../types/tea';
import { authFetch } from '../utils/api';
import { isDbSchemaError } from '../utils/formatters';

export function useTeaData(isAuthenticated: boolean, onUnauthorized: () => void) {
  const [items, setItems] = useState<TeaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | ItemType>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const parseItem = (item: any): TeaItem => {
    let flavor = item.flavor_profile;
    if (typeof flavor === 'string') {
      try {
        flavor = JSON.parse(flavor);
      } catch {
        flavor = undefined;
      }
    }

    let brewing = item.brewing_guide;
    if (typeof brewing === 'string') {
      try {
        brewing = JSON.parse(brewing);
      } catch {
        brewing = undefined;
      }
    }

    return {
      ...item,
      quantity: Number(item.quantity),
      price: Number(item.price || 0),
      unit_price: Number(item.unit_price || 0),
      capacity_ml: item.capacity_ml ? Number(item.capacity_ml) : undefined,
      rating: item.rating ? Number(item.rating) : 5,
      low_stock_threshold:
        item.low_stock_threshold !== undefined && item.low_stock_threshold !== null
          ? Number(item.low_stock_threshold)
          : undefined,
      flavor_profile: flavor,
      brewing_guide: brewing,
      created_at: Number(item.created_at)
    };
  };

  const fetchItems = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setDbError(null);

    try {
      const res = await authFetch('/api/data');
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Server error');

      const parsedItems: TeaItem[] = (json.data || []).map(parseItem);
      setItems(parsedItems);
    } catch (error: any) {
      console.error('Error fetching tea items:', error);
      if (isDbSchemaError(error.message)) {
        setDbError('TABLE_MISSING');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, onUnauthorized]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [isAuthenticated, fetchItems]);

  // Client-side filtering & search & tag
  const filteredItems = useMemo(() => {
    let result = items;
    if (filterType !== 'ALL') {
      result = result.filter((i) => i.type === filterType);
    }
    if (selectedTag !== 'ALL') {
      result = result.filter((i) => {
        if (!i.tags) return false;
        const tags = i.tags.split(',').map((t) => t.trim());
        return tags.includes(selectedTag);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.origin && i.origin.toLowerCase().includes(q)) ||
          (i.material && i.material.toLowerCase().includes(q)) ||
          (i.storage_location && i.storage_location.toLowerCase().includes(q)) ||
          (i.tags && i.tags.toLowerCase().includes(q)) ||
          (i.year && i.year.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filterType, selectedTag, searchQuery]);

  // Distinct tags list
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.tags) {
        item.tags.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set);
  }, [items]);

  // Aggregate Stats
  const stats: SystemStats = useMemo(() => {
    const lowCount = items.filter((i) => {
      if (i.low_stock_threshold !== undefined && i.low_stock_threshold !== null) {
        return i.quantity <= i.low_stock_threshold;
      }
      if (i.type === 'TEA' && i.quantity <= 1 && i.unit.includes('饼')) return true;
      if (i.type === 'TEA' && i.quantity <= 25 && i.unit.includes('克')) return true;
      return false;
    }).length;

    return {
      totalItems: items.length,
      totalValue: items.reduce((s, i) => s + (i.price || 0), 0),
      teaCount: items.filter((i) => i.type === 'TEA').length,
      teawareCount: items.filter((i) => i.type === 'TEAWARE').length,
      lowStockCount: lowCount
    };
  }, [items]);

  const saveItem = async (item: Partial<TeaItem>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({
          action: item.id ? 'update' : 'create',
          id: item.id,
          data: item
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失败');

      const savedData = json.data;
      if (savedData) {
        const parsed = parseItem(savedData);
        setItems((prev) => {
          const exists = prev.find((i) => i.id === parsed.id);
          if (exists) return prev.map((i) => (i.id === parsed.id ? parsed : i));
          return [parsed, ...prev];
        });
        return true;
      }
      return false;
    } catch (e: any) {
      if (isDbSchemaError(e.message)) {
        setDbError('TABLE_MISSING');
      } else {
        alert(`保存失败: ${e.message}`);
      }
      return false;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    if (!confirm('确认删除这件藏品吗？相关库存流水也将一并移除。')) return false;

    const previousItems = [...items];
    setItems((prev) => prev.filter((i) => i.id !== id));

    try {
      const res = await authFetch('/api/data?action=delete', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      return true;
    } catch (e: any) {
      alert(`删除失败: ${e.message}`);
      setItems(previousItems);
      return false;
    }
  };

  const updateStock = async (
    id: string,
    newQuantity: number,
    changeAmount: number,
    reason: string,
    note: string
  ): Promise<TeaItem | null> => {
    try {
      const res = await authFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'stock_update',
          id,
          newQuantity,
          changeAmount,
          reason,
          note
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '库存更新失败');

      const updated = json.data;
      if (updated) {
        const parsed = parseItem(updated);
        setItems((prev) => prev.map((i) => (i.id === id ? parsed : i)));
        return parsed;
      }
      return null;
    } catch (e: any) {
      if (isDbSchemaError(e.message)) {
        setDbError('TABLE_MISSING');
      } else {
        alert(`库存更新失败: ${e.message}`);
      }
      return null;
    }
  };

  return {
    items,
    filteredItems,
    isLoading,
    dbError,
    setDbError,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedTag,
    setSelectedTag,
    allTags,
    fetchItems,
    saveItem,
    deleteItem,
    updateStock,
    stats
  };
}
