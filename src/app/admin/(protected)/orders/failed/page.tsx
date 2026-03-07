import { redirect } from 'next/navigation';

export default function FailedOrdersPage() {
  redirect('/admin/orders/incomplete');
}

