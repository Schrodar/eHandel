import { prisma } from '@/lib/prisma';

export type VariantStats = {
  activeCount: number;
  minActiveStock: number | null;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  defaultVariantId: string | null;
  category: { id: string; name: string } | null;
  material: { id: string; name: string } | null;
  _count: { variants: number };
  defaultVariant: {
    variantImages: Array<{ role: string; asset: { url: string | null } | null }>;
  } | null;
  variants: Array<{
    stock: number;
    variantImages: Array<{ role: string; asset: { url: string | null } | null }>;
  }>;
};

export type AdminProductsFilters = {
  q: string;
  publishedFilter: 'all' | 'published' | 'draft';
  categoryId: string;
  materialId: string;
  priceClass: string;
  season: string;
  sort: 'name-asc' | 'name-desc';
  requestedPage: number;
  pageSize: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function buildWhere(filters: AdminProductsFilters) {
  const where = {} as Record<string, unknown>;

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { slug: { contains: filters.q, mode: 'insensitive' } },
      { id: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  if (filters.publishedFilter === 'published') {
    where.published = true;
  } else if (filters.publishedFilter === 'draft') {
    where.published = false;
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.materialId) where.materialId = filters.materialId;
  if (filters.priceClass) where.priceClass = filters.priceClass;
  if (filters.season) where.season = filters.season;

  return where;
}

function buildOrderBy(sort: AdminProductsFilters['sort']) {
  if (sort === 'name-desc') return { name: 'desc' };
  return { name: 'asc' };
}

export async function getAdminProductsPageData(filters: AdminProductsFilters) {
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(filters.sort);

  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const effectivePage = clamp(filters.requestedPage, 1, totalPages);
  const skip = (effectivePage - 1) * filters.pageSize;

  const [products, categories, materials] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        published: true,
        defaultVariantId: true,
        category: { select: { id: true, name: true } },
        material: { select: { id: true, name: true } },
        _count: { select: { variants: true } },
        defaultVariant: {
          select: {
            variantImages: {
              select: { role: true, asset: { select: { url: true } } },
              where: { role: 'primary' },
              take: 1,
            },
          },
        },
        variants: {
          where: { active: true },
          select: {
            stock: true,
            variantImages: {
              select: { role: true, asset: { select: { url: true } } },
              where: { role: 'primary' },
              take: 1,
            },
          },
        },
      },
      orderBy,
      skip,
      take: filters.pageSize,
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.material.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const statsById: Record<string, VariantStats> = Object.create(null);
  for (const product of products) {
    const activeCount = product.variants.length;
    const minActiveStock =
      activeCount > 0
        ? product.variants.reduce(
            (min: number, variant: { stock: number }) =>
              Math.min(min, variant.stock),
            Number.POSITIVE_INFINITY,
          )
        : null;

    statsById[product.id] = {
      activeCount,
      minActiveStock,
    };
  }

  return {
    where,
    orderBy,
    products,
    totalCount,
    totalPages,
    effectivePage,
    skip,
    categories,
    materials,
    statsById,
  };
}
