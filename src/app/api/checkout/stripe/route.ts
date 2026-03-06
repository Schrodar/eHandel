import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { generateOrderNumber } from '@/lib/orders/queries';
import type { CheckoutRequest, CustomerInfo } from '@/components/checkout';
import { resolveDiscountForCart } from '@/lib/discounts/resolve';
import type { ResolveCartLine } from '@/lib/discounts/resolve';

const DEFAULT_TAX_RATE_BP = 2500;

function hasVariantId(
  item: CheckoutRequest['items'][number],
): item is CheckoutRequest['items'][number] & { variantId: string } {
  return typeof item.variantId === 'string' && item.variantId.length > 0;
}

function hasSku(
  item: CheckoutRequest['items'][number],
): item is CheckoutRequest['items'][number] & { sku: string } {
  return typeof item.sku === 'string' && item.sku.length > 0;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toStripeImageUrl(imageUrl: string | undefined, siteUrl: string) {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  try {
    return new URL(imageUrl, siteUrl).toString();
  } catch {
    return undefined;
  }
}

function isCustomerValid(customer: CustomerInfo) {
  if (!customer?.email?.includes('@')) return false;
  if (!customer.firstName?.trim()) return false;
  if (!customer.lastName?.trim()) return false;
  if (!customer.streetAddress?.trim()) return false;
  if (!customer.postalCode?.trim()) return false;
  if (!customer.city?.trim()) return false;
  if (customer.country !== 'SE') return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutRequest;

    if (!body?.items?.length) {
      return NextResponse.json({ error: 'Varukorgen är tom.' }, { status: 400 });
    }

    if (!isCustomerValid(body.customer)) {
      return NextResponse.json(
        { error: 'Ofullständiga kunduppgifter.' },
        { status: 400 },
      );
    }

    const siteUrl = getRequiredEnv('NEXT_PUBLIC_SITE_URL');
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL || `${siteUrl}/checkout/cancel`;

    const requestedByVariantId = new Map(
      body.items.filter(hasVariantId).map((item) => [item.variantId, item]),
    );

    const requestedBySku = new Map(
      body.items.filter(hasSku).map((item) => [item.sku, item]),
    );

    if (!requestedByVariantId.size && !requestedBySku.size) {
      return NextResponse.json(
        { error: 'Varukorgen saknar variant-id/SKU.' },
        { status: 400 },
      );
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        OR: [
          {
            id: {
              in: Array.from(requestedByVariantId.keys()),
            },
          },
          {
            sku: {
              in: Array.from(requestedBySku.keys()),
            },
          },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            published: true,
            priceInCents: true,
          },
        },
        color: { select: { name: true } },
      },
    });

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const variantBySku = new Map(variants.map((variant) => [variant.sku, variant]));

    const checkoutLines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: {
      productId: string;
      variantId: string;
      productName: string;
      variantName: string | null;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      snapshotImageUrl: string | null;
    }[] = [];

    for (const item of body.items) {
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: 'Ogiltigt antal i varukorgen.' }, { status: 400 });
      }

      const variant =
        (item.variantId ? variantById.get(item.variantId) : undefined) ||
        (item.sku ? variantBySku.get(item.sku) : undefined);

      if (!variant) {
        return NextResponse.json(
          { error: `Variant hittades inte (${item.sku ?? item.variantId ?? 'okänd'})` },
          { status: 404 },
        );
      }

      if (!variant.active || !variant.product.published) {
        return NextResponse.json(
          { error: `${variant.product.name} är inte tillgänglig just nu.` },
          { status: 400 },
        );
      }

      if (variant.stock < quantity) {
        return NextResponse.json(
          {
            error: `${variant.product.name} har inte tillräckligt lager (${variant.stock} kvar).`,
          },
          { status: 409 },
        );
      }

      const rawUnitAmount = variant.priceInCents ?? variant.product.priceInCents;
      if (rawUnitAmount == null || !Number.isInteger(rawUnitAmount) || rawUnitAmount <= 0) {
        return NextResponse.json(
          { error: `Pris saknas för ${variant.product.name}.` },
          { status: 400 },
        );
      }

      const unitAmount = rawUnitAmount;
      const lineTotal = unitAmount * quantity;
      const image = toStripeImageUrl(item.image_url, siteUrl);

      checkoutLines.push({
        quantity,
        price_data: {
          currency: 'sek',
          unit_amount: unitAmount,
          product_data: {
            name: `${variant.product.name}${variant.color?.name ? ` – ${variant.color.name}` : ''}`,
            images: image ? [image] : undefined,
            metadata: {
              productId: variant.product.id,
              variantId: variant.id,
              sku: variant.sku,
            },
          },
        },
      });

      orderItems.push({
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.color?.name ?? item.variantLabel ?? null,
        sku: variant.sku,
        quantity,
        unitPrice: unitAmount,
        lineTotal,
        snapshotImageUrl: image ?? null,
      });
    }

    const subtotal = orderItems.reduce((sum, line) => sum + line.lineTotal, 0);

    // ── Server-side discount validation ───────────────────────────────────────
    let discount = 0;
    let appliedDiscountCode: string | null = null;
    let appliedDriveId: string | null = null;

    if (body.discountCode) {
      // Enrich orderItems with categoryId via a targeted DB query
      const variantIds = orderItems.map((l) => l.variantId);
      const variantsWithCategory = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: { select: { id: true, categoryId: true } } },
      });
      const categoryByVariantId = new Map(
        variantsWithCategory.map((v) => [v.id, v.product.categoryId]),
      );
      const cartLines: ResolveCartLine[] = orderItems.map((line) => ({
        variantId: line.variantId,
        productId: line.productId,
        categoryId: categoryByVariantId.get(line.variantId) ?? '',
        lineTotal: line.lineTotal,
      }));

      const resolveResult = await resolveDiscountForCart({
        code: body.discountCode,
        cartLines,
        shippingCost: 0,
      });

      if (!resolveResult.valid) {
        const messages: Record<string, string> = {
          NOT_FOUND: 'Rabattkoden hittades inte.',
          DRIVE_INACTIVE: 'Rabattkoden är inte längre aktiv.',
          CODE_EXHAUSTED: 'Rabattkoden har redan använts.',
          NOT_APPLICABLE_TO_CART: 'Rabattkoden gäller inte för varorna i din kundvagn.',
          MIN_ORDER_NOT_MET: 'Minsta ordervärde för koden är inte uppnått.',
        };
        return NextResponse.json(
          { error: messages[resolveResult.reason] ?? 'Ogiltig rabattkod.' },
          { status: 400 },
        );
      }

      discount = resolveResult.discountAmount;
      appliedDiscountCode = resolveResult.code;
      appliedDriveId = resolveResult.driveId;
    }

    const total = subtotal - discount;
    const tax = Math.round((total * DEFAULT_TAX_RATE_BP) / (10000 + DEFAULT_TAX_RATE_BP));

    const orderNumber = await generateOrderNumber();

    // Generate an unguessable public token used by the success page to poll
    // order status without any PII being accessible (see GET /api/orders/:id).
    const publicToken =
      crypto.randomUUID().replace(/-/g, '') +
      crypto.randomUUID().replace(/-/g, '');

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber,
        publicToken,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.NEW,
        customerEmail: body.customer.email,
        customerName: `${body.customer.firstName} ${body.customer.lastName}`.trim(),
        customerPhone: body.customer.phone || null,
        shippingAddressLine1: body.customer.streetAddress,
        shippingPostalCode: body.customer.postalCode,
        shippingCity: body.customer.city,
        shippingCountry: body.customer.country,
        billingAddressLine1: body.customer.streetAddress,
        billingPostalCode: body.customer.postalCode,
        billingCity: body.customer.city,
        billingCountry: body.customer.country,
        provider: 'STRIPE', // Explicit – prevents leaking any future schema default change
        subtotal,
        shipping: 0,
        discount,
        tax,
        total,
        currency: 'SEK',
        appliedDiscountCode,
        appliedDriveId,
        items: {
          create: orderItems.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            variantName: line.variantName,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
      select: { id: true, orderNumber: true, publicToken: true },
    });

    // Guard: payment_intent_data is only valid for mode='payment' sessions.
    const sessionMode = 'payment' as const;

    // When a discount is applied, collapse all line items into a single
    // aggregate item representing the order total after discount.
    // This avoids negative line items (unsupported by Stripe Checkout) and
    // intentionally keeps our discount logic outside Stripe's coupon motor.
    const finalLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      discount > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: 'sek',
                unit_amount: total,
                product_data: {
                  name: `Beställning ${createdOrder.orderNumber}`,
                  description: appliedDiscountCode
                    ? `Inkl. rabatt (${appliedDiscountCode}): −${(discount / 100).toFixed(2).replace('.', ',')} kr`
                    : undefined,
                },
              },
            } satisfies Stripe.Checkout.SessionCreateParams.LineItem,
          ]
        : checkoutLines;

    const session = await stripe.checkout.sessions.create({
      mode: sessionMode,
      currency: 'sek',
      line_items: finalLineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card', 'swish'],
      customer_email: body.customer.email,
      locale: 'sv',
      client_reference_id: createdOrder.id,
      metadata: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        // publicToken enables success page to poll status without PII
        publicToken: createdOrder.publicToken,
      },
      // Propagate orderId to the PaymentIntent so payment_intent.succeeded
      // can look up the order even if checkout.session.completed arrives late.
      // Only sent when mode === 'payment' to avoid runtime Stripe errors in
      // future subscription/setup modes.
      ...(sessionMode === 'payment'
        ? {
            payment_intent_data: {
              metadata: {
                orderId: createdOrder.id,
                orderNumber: createdOrder.orderNumber,
              },
            },
          }
        : {}),
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: 'required',
    });

    // Store the Checkout Session ID as the provider order identifier
    await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        providerOrderId: session.id,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Kunde inte skapa checkout-session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout create session error', error);
    return NextResponse.json(
      { error: 'Något gick fel vid skapande av checkout.' },
      { status: 500 },
    );
  }
}
