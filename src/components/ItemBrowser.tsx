import React, { useState, useMemo, useEffect } from 'react';
import { items, recipes, type Item } from '../engine/data';
import { CodexBrowserShell, type CategoryOption } from './CodexBrowserShell';
import { CodexPlateCard } from './CodexPlateCard';

const CATEGORY_ORDER = [
  'Ores', 'Ingots', 'Minerals', 'Standard Parts', 'Industrial Parts',
  'Electronics', 'Communications', 'Quantum Technology', 'Nuclear',
  'Liquids', 'Gas', 'Fuels', 'Containers', 'Aliens',
  'Ammos', 'Consumed', 'Waste', 'Special',
];

interface ItemBrowserProps {
  /** Back to the Codex hub. */
  onBack: () => void;
  /** Open an item's detail (owned by the Codex parent). */
  onSelect: (itemId: string) => void;
}

export function ItemBrowser({ onBack, onSelect }: ItemBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const allItems = useMemo(
    () => Object.values(items).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const recipeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) {
      counts.set(r.outputItemId, (counts.get(r.outputItemId) ?? 0) + 1);
    }
    return counts;
  }, []);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allItems.filter((item) => item.name.toLowerCase().includes(q)) : allItems;
  }, [allItems, search]);

  const categories = useMemo<CategoryOption[]>(() => {
    const countsByCat = new Map<string, number>();
    for (const item of allItems) {
      countsByCat.set(item.category, (countsByCat.get(item.category) ?? 0) + 1);
    }
    const matchingByCat = new Map<string, number>();
    for (const item of searchFiltered) {
      matchingByCat.set(item.category, (matchingByCat.get(item.category) ?? 0) + 1);
    }

    const ordered = [
      ...CATEGORY_ORDER.filter((c) => countsByCat.has(c)),
      ...Array.from(countsByCat.keys()).filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
    ];

    return [
      { name: 'All', count: searchFiltered.length },
      ...ordered.map((name) => ({ name, count: matchingByCat.get(name) ?? 0 })),
    ];
  }, [allItems, searchFiltered]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return searchFiltered;
    return searchFiltered.filter((item) => item.category === selectedCategory);
  }, [searchFiltered, selectedCategory]);

  // Reset to the first page whenever the filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <CodexBrowserShell
      title="FICSIT // Item Codex"
      entityPlural="items"
      searchPlaceholder="Search for an item…"
      search={search}
      onSearchChange={setSearch}
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      pageSize={pageSize}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      filteredCount={filtered.length}
      page={page}
      pageCount={pageCount}
      onPageChange={setPage}
      onBack={onBack}
    >
      {pageItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          recipeCount={recipeCounts.get(item.id) ?? 0}
          onClick={() => onSelect(item.id)}
        />
      ))}
    </CodexBrowserShell>
  );
}

function ItemCard({
  item,
  recipeCount,
  onClick,
}: {
  item: Item;
  recipeCount: number;
  onClick: () => void;
}) {
  return (
    <CodexPlateCard
      idKey={item.id}
      fallbackUrl={item.imageUrl}
      title={item.name}
      category={item.category}
      cornerBadge={recipeCount > 1 ? recipeCount : null}
      footerMeta={
        recipeCount > 0
          ? `${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`
          : 'Raw'
      }
      footerIcon="recipe"
      onClick={onClick}
    />
  );
}
