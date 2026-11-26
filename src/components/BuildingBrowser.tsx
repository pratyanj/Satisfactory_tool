import React, { useState, useMemo, useEffect } from 'react';
import { buildings, type Building } from '../engine/data';
import { CodexBrowserShell, type CategoryOption } from './CodexBrowserShell';
import { CodexPlateCard } from './CodexPlateCard';

const CATEGORY_ORDER = [
  'Production', 'Power Generation', 'Resource Extraction', 'Power Infrastructure',
  'Conveyors', 'Pipes', 'Storage', 'Transport', 'Vehicles', 'Special',
  'Foundations', 'Walls', 'Ramps & Roofs', 'Structures', 'Decoration', 'Other',
];

interface Props {
  /** Back to the Codex hub. */
  onBack: () => void;
  /** Open a building's detail view (owned by the Codex parent). */
  onSelect: (buildingId: string) => void;
}

export function BuildingBrowser({ onBack, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const all = useMemo(
    () => Object.values(buildings).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  }, [all, search]);

  const categories = useMemo<CategoryOption[]>(() => {
    const countsByCat = new Map<string, number>();
    for (const b of all) {
      countsByCat.set(b.category, (countsByCat.get(b.category) ?? 0) + 1);
    }
    const matchingByCat = new Map<string, number>();
    for (const b of searchFiltered) {
      matchingByCat.set(b.category, (matchingByCat.get(b.category) ?? 0) + 1);
    }

    const ordered = [
      ...CATEGORY_ORDER.filter((c) => countsByCat.has(c)),
      ...Array.from(countsByCat.keys()).filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
    ];

    return [
      { name: 'All', count: searchFiltered.length },
      ...ordered.map((name) => ({ name, count: matchingByCat.get(name) ?? 0 })),
    ];
  }, [all, searchFiltered]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return searchFiltered;
    return searchFiltered.filter((b) => b.category === selectedCategory);
  }, [searchFiltered, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <CodexBrowserShell
      title="FICSIT // Building Codex"
      entityPlural="buildings"
      searchPlaceholder="Search for a building…"
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
      {pageItems.map((b) => (
        <BuildingCard key={b.id} building={b} onClick={() => onSelect(b.id)} />
      ))}
    </CodexBrowserShell>
  );
}

function BuildingCard({ building, onClick }: { building: Building; onClick: () => void }) {
  return (
    <CodexPlateCard
      idKey={building.id}
      fallbackUrl={building.imageUrl}
      title={building.name}
      category={building.category}
      cornerBadge={building.powerConsumption > 0 ? `${building.powerConsumption}MW` : null}
      footerMeta={
        building.unlock?.tier
          ? `Tier ${building.unlock.tier}`
          : `${building.buildCost.length} parts`
      }
      footerIcon={building.powerConsumption > 0 ? 'power' : 'build'}
      onClick={onClick}
    />
  );
}
