import { redirect } from 'next/navigation';

// Legacy hardkodad produktsida ersatt med redirect till shoppen.
// /product och /product?c=svart pekar nu om till /shop.

export default function ProductPage() {
  redirect('/shop');
}
