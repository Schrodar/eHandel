'use client';

import React, { useMemo } from 'react';
import type { WardrobeProduct } from '@/lib/wardrobeApi';
import { useShopFilters } from '@/context/ShopFiltersProvider';

type Filters = {
  query: string;
  category?: string;
  fits: string[];
  colors: string[];
  materials: string[];
  priceClasses: string[];
  seasons: string[];
};

function uniqueValues(products: WardrobeProduct[], key: keyof WardrobeProduct) {
  return Array.from(new Set(products.map((p) => String(p[key]))));
}

export function WardrobeFilters({
  products,
  children,
}: {
  products: WardrobeProduct[];
  children: (args: { filtered: WardrobeProduct[] }) => React.ReactNode;
}) {
  const { filters, setFilters, showFilters, setShowFilters } = useShopFilters();

  const categories = useMemo(
    () => uniqueValues(products, 'category'),
    [products],
  );
  const fits = useMemo(() => uniqueValues(products, 'fit'), [products]);
  const materials = useMemo(
    () => uniqueValues(products, 'material'),
    [products],
  );
  const priceClasses = useMemo(
    () => uniqueValues(products, 'priceClass'),
    [products],
  );
  const seasons = useMemo(() => uniqueValues(products, 'season'), [products]);

  const onToggle = (key: keyof Filters, value: string) => {
    setFilters((f) => {
      if (key === 'category') {
        return { ...f, category: f.category === value ? undefined : value };
      }
      const list = (f[key] as string[]) || [];
      const exists = list.includes(value);
      return {
        ...f,
        [key]: exists ? list.filter((i) => i !== value) : [...list, value],
      } as Filters;
    });
  };

  const onQuery = (q: string) => setFilters((f) => ({ ...f, query: q }));

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return products.filter((p) => {
      // search across multiple fields
      if (q) {
        const hay = [p.name, p.category, p.style, p.material, p.color]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.category && p.category !== filters.category) return false;

      // color filter removed (handled later by customer)

      if (filters.fits.length && !filters.fits.includes(p.fit)) return false;

      if (filters.materials.length && !filters.materials.includes(p.material))
        return false;

      if (
        filters.priceClasses.length &&
        !filters.priceClasses.includes(p.priceClass)
      )
        return false;

      if (filters.seasons.length && !filters.seasons.includes(p.season))
        return false;

      return true;
    });
  }, [filters, products]);

  return (
    <section className="wardrobe">
      <div className="wardrobe-controls">
        <div className="search-row">
          <div className="search">
            <label className="sr-only">Search products</label>
            <input
              value={filters.query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search by name, category, style, material, color"
            />
          </div>
          <button
            className={`filter-toggle ${showFilters ? 'open' : ''}`}
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        <div className={`filters ${showFilters ? 'open' : 'collapsed'}`}>
          <div className="filter-group">
            <div className="filter-title">Category</div>
            <div className="chips">
              <button
                className={`chip ${filters.category === undefined ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`chip ${filters.category === c ? 'active' : ''}`}
                  onClick={() => onToggle('category', c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-grid">
            {/* Color filter intentionally removed; will be added later if needed */}

            <div className="filter-group">
              <div className="filter-title">Fit</div>
              <div className="chips">
                {fits.map((c) => (
                  <button
                    key={c}
                    className={`chip ${filters.fits.includes(c) ? 'active' : ''}`}
                    onClick={() => onToggle('fits', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Material</div>
              <div className="chips">
                {materials.map((c) => (
                  <button
                    key={c}
                    className={`chip ${filters.materials.includes(c) ? 'active' : ''}`}
                    onClick={() => onToggle('materials', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Price class</div>
              <div className="chips">
                {priceClasses.map((c) => (
                  <button
                    key={c}
                    className={`chip ${filters.priceClasses.includes(c) ? 'active' : ''}`}
                    onClick={() => onToggle('priceClasses', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Season</div>
              <div className="chips">
                {seasons.map((c) => (
                  <button
                    key={c}
                    className={`chip ${filters.seasons.includes(c) ? 'active' : ''}`}
                    onClick={() => onToggle('seasons', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {children({ filtered })}
    </section>
  );
}
