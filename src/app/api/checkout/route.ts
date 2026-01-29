import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_TAX_RATE_BP = 2500; // 25%

function calcTaxAmount(totalAmount: number, taxRateBp: number) {
  // totalAmount is in öre (incl. tax). Compute tax portion in öre.
  // formula: tax = round(total * taxRate / (10000 + taxRate))
  const numerator = totalAmount * taxRateBp;
  const divisor = 10000 + taxRateBp;
  return Math.round(numerator / divisor);
}

type CheckoutItemInput = {
  variantId?: string;
  sku?: string;
  quantity?: number;
  clientUnitPrice?: number; // öre
};

type CheckoutPayload = {
  currency?: string;
  locale?: string;
  items?: CheckoutItemInput[];
};

type KlarnaLineItem = {
  name: string;
  reference: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_rate: number;
  total_tax_amount: number;
  image_url?: string;
  product_url: string;
  merchant_data: string;
};

type WarningItem = {
  code: 'PRICE_CHANGED';
  sku: string | null;
  oldUnitPrice: number;
  newUnitPrice: number;
};

function firstImageFromJson(images: unknown): string | undefined {
  if (!Array.isArray(images)) return undefined;
  const first = images.find((v) => typeof v === 'string');
  return typeof first === 'string' ? first : undefined;
}

export async function POST(req: Request) {
  try {
    const body: CheckoutPayload = (await req.json()) as CheckoutPayload;

    const { currency, locale, items } = body;

    // Basic validation
    if (!currency || !locale || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid payload: currency, locale and items are required' },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Validate items shape
    for (const [i, it] of items.entries()) {
      if (!it || typeof it !== 'object')
        return NextResponse.json({ error: `Invalid item at index ${i}` }, { status: 400 });
      const q = Number(it.quantity ?? 0);
      if (!Number.isInteger(q) || q < 1)
        return NextResponse.json({ error: `Invalid quantity for item at index ${i}` }, { status: 400 });
    }

    // Collect variantIds and skus for batch fetch
    const variantIds: string[] = [];
    const skus: string[] = [];
    for (const it of items) {
      if (it.variantId) variantIds.push(it.variantId);
      else if (it.sku) skus.push(it.sku!);
    }

    // Fetch matching variants
    const variants = await prisma.productVariant.findMany({
      where: {
        OR: [
          ...(variantIds.length ? [{ id: { in: variantIds } }] : []),
          ...(skus.length ? [{ sku: { in: skus } }] : []),
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceInCents: true,
            canonicalImage: true,
            published: true,
          },
        },
        color: {
          select: { name: true, hex: true },
        },
      },
    });

    // Build lookup maps by id and sku
    const byId = new Map<string, typeof variants[number]>();
    const bySku = new Map<string, typeof variants[number]>();
    for (const v of variants) {
      if (v.id) byId.set(v.id, v);
      if (v.sku) bySku.set(v.sku, v);
    }

    const siteUrl =
      process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const line_items: KlarnaLineItem[] = [];
    const warnings: WarningItem[] = [];

    for (const [index, it] of items.entries()) {
      const qty = Math.floor(Number(it.quantity));

      let variant = undefined;
      if (it.variantId) variant = byId.get(it.variantId);
      if (!variant && it.sku) variant = bySku.get(it.sku);

      if (!variant) {
        return NextResponse.json(
          { error: 'Variant not found', index, sku: it.sku ?? null, variantId: it.variantId ?? null },
          { status: 404 },
        );
      }

      // Defensive property checks
      if (variant.active === false) {
        return NextResponse.json({ error: 'Variant inactive', variantId: variant.id }, { status: 400 });
      }

      const product = variant.product;
      if (!product?.published) {
        // policy: reject unpublished products
        return NextResponse.json({ error: 'Product not published', productId: product?.id }, { status: 400 });
      }

      const stock = variant.stock ?? null;
      if (stock !== null && stock < qty) {
        return NextResponse.json(
          { error: 'OUT_OF_STOCK', variantId: variant.id, sku: variant.sku, available: stock, requested: qty },
          { status: 409 },
        );
      }

      // Determine unit price in cents (öre -> cents means cents already vs öre; repo uses priceInCents)
      // Repo uses priceInCents (cents) — treat as öre-equivalent integer as requested.
      const unitPrice = variant.priceInCents ?? product.priceInCents;
      if (unitPrice == null) {
        return NextResponse.json(
          { error: 'Price missing', variantId: variant.id, productId: product.id },
          { status: 400 },
        );
      }
      if (!Number.isInteger(unitPrice)) {
        return NextResponse.json({ error: 'Invalid price in DB for variant', variantId: variant.id }, { status: 500 });
      }

      const total_amount = unitPrice * qty;
      const total_tax_amount = calcTaxAmount(total_amount, DEFAULT_TAX_RATE_BP);

      // build image_url absolute
      const rawImage = firstImageFromJson(variant.images as unknown) ?? product.canonicalImage;
      const image_url = rawImage
        ? rawImage.startsWith('http')
          ? rawImage
          : new URL(rawImage, siteUrl).toString()
        : undefined;

      const product_url = new URL(`/product/${product.slug}`, siteUrl).toString();

      const sku = variant.sku ?? null;

      const name = product.name + (variant.color ? ' – ' + (variant.color.name ?? '') : '');

      // Merchant data snapshot
      const merchant_data = JSON.stringify({ productId: product.id, variantId: variant.id, sku, slug: product.slug });

      // Price change warning
      if (typeof it.clientUnitPrice === 'number' && it.clientUnitPrice !== unitPrice) {
        warnings.push({ code: 'PRICE_CHANGED', sku, oldUnitPrice: it.clientUnitPrice, newUnitPrice: unitPrice });
      }

      line_items.push({
        name,
        reference: sku,
        quantity: qty,
        unit_price: unitPrice,
        total_amount,
        tax_rate: DEFAULT_TAX_RATE_BP,
        total_tax_amount,
        image_url,
        product_url,
        merchant_data,
      });
    }

    const order_amount = line_items.reduce((s, li) => s + li.total_amount, 0);
    const order_tax_amount = line_items.reduce((s, li) => s + li.total_tax_amount, 0);

    return NextResponse.json(
      {
        currency,
        locale,
        order_amount,
        order_tax_amount,
        line_items,
        warnings,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Checkout error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
