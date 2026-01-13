export type Product = {
  id: "white" | "black";
  name: string;
  priceSek: number;
  image: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "white",
    name: "T-shirt — Vit",
    priceSek: 249,
    image: "/shirt-white.png",
  },
  {
    id: "black",
    name: "T-shirt — Svart",
    priceSek: 249,
    image: "/shirt-black.png",
  },
];
