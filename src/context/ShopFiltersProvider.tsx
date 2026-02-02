'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Filters = {
  query: string;
  category?: string;
  fits: string[];
  colors: string[];
  materials: string[];
  priceClasses: string[];
  seasons: string[];
};

type ShopFiltersContextValue = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
};

const DEFAULT_FILTERS: Filters = {
  query: '',
  category: undefined,
  colors: [],
  fits: [],
  materials: [],
  priceClasses: [],
  seasons: [],
};

const ShopFiltersContext = createContext<ShopFiltersContextValue | null>(null);

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyFiltersToSearchParams(params: URLSearchParams, filters: Filters) {
  const q = filters.query.trim();
  if (q) params.set('q', q);
  else params.delete('q');

  if (filters.category) params.set('cat', filters.category);
  else params.delete('cat');

  const fits = filters.fits.length ? filters.fits.join(',') : '';
  if (fits) params.set('fit', fits);
  else params.delete('fit');

  const mats = filters.materials.length ? filters.materials.join(',') : '';
  if (mats) params.set('mat', mats);
  else params.delete('mat');

  const pcs = filters.priceClasses.length ? filters.priceClasses.join(',') : '';
  if (pcs) params.set('pc', pcs);
  else params.delete('pc');

  const seasons = filters.seasons.length ? filters.seasons.join(',') : '';
  if (seasons) params.set('season', seasons);
  else params.delete('season');
}

function readFiltersFromSearchParams(searchParams: URLSearchParams): Filters {
  const next: Filters = { ...DEFAULT_FILTERS };

  next.query = searchParams.get('q') ?? '';
  next.category = searchParams.get('cat') ?? undefined;

  next.fits = parseCsvParam(searchParams.get('fit'));
  next.materials = parseCsvParam(searchParams.get('mat'));
  next.priceClasses = parseCsvParam(searchParams.get('pc'));
  next.seasons = parseCsvParam(searchParams.get('season'));

  return next;
}

function shallowEqualFilters(a: Filters, b: Filters): boolean {
  return (
    a.query === b.query &&
    a.category === b.category &&
    a.fits.join(',') === b.fits.join(',') &&
    a.materials.join(',') === b.materials.join(',') &&
    a.priceClasses.join(',') === b.priceClasses.join(',') &&
    a.seasons.join(',') === b.seasons.join(',')
  );
}

export function ShopFiltersProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isShopRoute = pathname === '/shop' || pathname.startsWith('/shop/');

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Initialize/refresh filters from URL when visiting /shop.
  useEffect(() => {
    if (!isShopRoute) return;

    const fromUrl = readFiltersFromSearchParams(
      new URLSearchParams(searchParams.toString()),
    );

    setFilters((current) => (shallowEqualFilters(current, fromUrl) ? current : fromUrl));
  }, [isShopRoute, searchParams]);

  // Sync filters -> URL (shareable links) without full navigation.
  useEffect(() => {
    if (!isShopRoute) return;

    const current = new URLSearchParams(searchParams.toString());
    const next = new URLSearchParams(searchParams.toString());
    applyFiltersToSearchParams(next, filters);

    // UX: if filters change, reset pagination so we don't land on an empty page.
    if (current.toString() !== next.toString()) {
      next.delete('page');
    }

    if (current.toString() === next.toString()) return;

    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    router.replace(url, { scroll: false });
  }, [filters, isShopRoute, pathname, router, searchParams]);

  const value = useMemo<ShopFiltersContextValue>(
    () => ({ filters, setFilters, showFilters, setShowFilters }),
    [filters, showFilters],
  );

  return <ShopFiltersContext.Provider value={value}>{children}</ShopFiltersContext.Provider>;
}

export function useShopFilters() {
  const ctx = useContext(ShopFiltersContext);
  if (!ctx) {
    throw new Error('useShopFilters must be used within ShopFiltersProvider');
  }
  return ctx;
}
