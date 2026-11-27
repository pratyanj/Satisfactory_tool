import React, { useState, useMemo, useEffect } from 'react';
import { recipes, items } from '../engine/data';
import { CodexBrowserShell, type CategoryOption } from './CodexBrowserShell';
import { RecipeTable } from './ItemDetail';

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
}

type Filter = 'All' | 'Standard' | 'Alternate';

function isAlternate(id: string, isAlt?: boolean) {
  return Boolean(isAlt || id.startsWith('recipe_alternate_'));
}

export function RecipeBrowser({ onBack, onNavigateItem }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const all = useMemo(
    () => [...recipes].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id)),
    []
  );

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => {
      const name = (r.name ?? r.id).toLowerCase();
      const out = items[r.outputItemId]?.name.toLowerCase() ?? '';
      return name.includes(q) || out.includes(q);
    });
  }, [all, search]);

  const categories = useMemo<CategoryOption[]>(() => {
    let stdCount = 0;
    let altCount = 0;
    for (const r of searchFiltered) {
      if (isAlternate(r.id, r.isAlternate)) altCount++;
      else stdCount++;
    }
    return [
      { name: 'All', count: searchFiltered.length },
      { name: 'Standard', count: stdCount },
      { name: 'Alternate', count: altCount },
    ];
  }, [searchFiltered]);

  const filtered = useMemo(() => {
    if (filter === 'All') return searchFiltered;
    return searchFiltered.filter((r) => {
      const alt = isAlternate(r.id, r.isAlternate);
      return filter === 'Alternate' ? alt : !alt;
    });
  }, [searchFiltered, filter]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageRecipes = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <CodexBrowserShell
      title="FICSIT // Recipe Codex"
      entityPlural="recipes"
      searchPlaceholder="Search recipes or products…"
      search={search}
      onSearchChange={setSearch}
      categories={categories}
      selectedCategory={filter}
      onCategoryChange={(cat) => setFilter(cat as Filter)}
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
      layout="list"
    >
      <RecipeTable recipes={pageRecipes} highlightId="" onNavigate={onNavigateItem} />
    </CodexBrowserShell>
  );
}
