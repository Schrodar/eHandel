import { notFound } from 'next/navigation';
import { getOrderByPublicToken } from '@/lib/orders/queries';
import OrderStatusPage from '@/components/OrderStatusPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByPublicToken(token);
  if (!order) return { title: 'Order hittades inte' };
  return { title: `Order ${order.orderNumber}` };
}

export default async function OrderStatusRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByPublicToken(token);

  if (!order) return notFound();

  return <OrderStatusPage order={order} />;
}
