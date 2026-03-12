import { prisma } from '@/lib/prisma';

const LOW_STOCK_THRESHOLD = 3;
const LIMIT = 50;

type DashboardIssue = {
  productId: string;
  productName: string;
  type: string;
};

export type AdminDashboardData = {
  publishedCount: number;
  draftCount: number;
  lowStockCount: number;
  lowStockVariantCount: number;
  lowStockProducts: {
    productId: string;
    productName: string;
    minStock: number;
  }[];
  issues: DashboardIssue[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    publishedCount,
    draftCount,
    lowStockVariantCount,
    lowStockProducts,
    publishedNoActiveVariants,
    problematicVariants,
  ] = await prisma.$transaction([
    prisma.product.count({ where: { published: true } }),
    prisma.product.count({ where: { published: false } }),
    prisma.productVariant.count({
      where: { active: true, stock: { lt: LOW_STOCK_THRESHOLD } },
    }),
    prisma.product.findMany({
      where: {
        variants: {
          some: { active: true, stock: { lt: LOW_STOCK_THRESHOLD } },
        },
      },
      select: {
        id: true,
        name: true,
        variants: {
          where: { active: true },
          orderBy: { stock: 'asc' },
          take: 1,
          select: { stock: true },
        },
      },
      orderBy: { name: 'asc' },
      take: LIMIT,
    }),
    prisma.product.findMany({
      where: { published: true, variants: { none: { active: true } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: LIMIT,
    }),
    prisma.productVariant.findMany({
      where: {
        OR: [
          { stock: { lt: 0 } },
          { priceInCents: { lt: 0 } },
          { sku: '' },
        ],
      },
      select: {
        id: true,
        sku: true,
        stock: true,
        priceInCents: true,
        product: { select: { id: true, name: true } },
      },
      orderBy: { productId: 'asc' },
      take: LIMIT,
    }),
  ]);

  const normalizedLowStockProducts = lowStockProducts
    .map((p: { id: string; name: string; variants: Array<{ stock: number }> }) => ({
      productId: p.id,
      productName: p.name,
      minStock: p.variants[0]?.stock ?? 0,
    }))
    .filter((p: { minStock: number }) => p.minStock < LOW_STOCK_THRESHOLD)
    .slice(0, LIMIT);

  const issues: DashboardIssue[] = [];

  for (const p of publishedNoActiveVariants) {
    issues.push({
      productId: p.id,
      productName: p.name,
      type: 'Published men har 0 aktiva varianter',
    });
  }

  for (const v of problematicVariants) {
    if (v.stock < 0) {
      issues.push({
        productId: v.product.id,
        productName: v.product.name,
        type: 'Variant har stock < 0',
      });
    }

    if (v.priceInCents != null && v.priceInCents < 0) {
      issues.push({
        productId: v.product.id,
        productName: v.product.name,
        type: 'Variant har negativt price override',
      });
    }

    if (!v.sku) {
      issues.push({
        productId: v.product.id,
        productName: v.product.name,
        type: 'Variant har tom SKU',
      });
    }
  }

  return {
    publishedCount,
    draftCount,
    lowStockCount: normalizedLowStockProducts.length,
    lowStockVariantCount,
    lowStockProducts: normalizedLowStockProducts,
    issues: issues.slice(0, LIMIT),
  };
}
