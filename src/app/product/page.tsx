"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartContext } from "@/components/CartProvider";
import { useState } from "react";

export default function ProductPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp.get("c") === "vit" ? "vit" : "svart";
  const [color, setColor] = useState<string>(initial);
  const src = color === "vit" ? "/Tvit.png" : "/Tsvart.png";
  const { add, openCart } = useCartContext();

  function selectColor(col: string) {
    setColor(col);
    // update URL without adding history entry
    router.replace(`/product?c=${col}`);
  }

  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-center justify-center py-8">
      <div className="phone-frame">
        <div className="phone-scroll">
          <section className="w-full px-4 pt-4 pb-8 product-layout">
        {/* Bild-container (mindre kort, större tröja, centrerad) */}
        <div className="relative overflow-hidden rounded-[44px] border border-black/10 bg-[#f7f4ee] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]">
          <div className="relative h-[clamp(240px,36vh,380px)] lg:h-[60vh]">
            <motion.div
              layoutId="main-product-image"
              className="absolute inset-0 flex items-center justify-center"
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              <Image
                src={src}
                alt="T-shirt"
                width={620}
                height={620}
                priority
                className="h-auto w-[90%] object-contain"
              />
            </motion.div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 px-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl leading-tight tracking-tight text-black">
                  Essential Tee
                </h1>
                <p className="mt-1 text-sm text-black/60">Heavyweight cotton • Matte finish</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium text-black">399 kr</p>
                <p className="text-xs text-black/50">Inkl. moms</p>
              </div>
            </div>

              {/* Color swatches */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectColor("vit")}
                    aria-pressed={color === "vit"}
                    className={
                      "h-10 w-10 rounded-full flex items-center justify-center border transition-shadow " +
                      (color === "vit"
                        ? "ring-2 ring-emerald-500 border-transparent"
                        : "border-slate-200 bg-white")
                    }
                  >
                    <span className="sr-only">Vit</span>
                    <div className="h-6 w-6 rounded-full bg-white border border-slate-200" />
                  </button>

                  <button
                    onClick={() => selectColor("svart")}
                    aria-pressed={color === "svart"}
                    className={
                      "h-10 w-10 rounded-full flex items-center justify-center border transition-shadow " +
                      (color === "svart"
                        ? "ring-2 ring-emerald-500 border-transparent"
                        : "border-slate-200 bg-black")
                    }
                  >
                    <span className="sr-only">Svart</span>
                    <div className="h-6 w-6 rounded-full bg-black" />
                  </button>
                </div>

                <div className="text-sm text-slate-600">Färg</div>
              </div>

              <button
                onClick={() => {
                  const id = color === "vit" ? "white" : "black";
                  add(id);
                  openCart();
                }}
                className="mt-5 h-12 w-full rounded-full bg-black text-sm font-medium text-white active:scale-[0.99]"
              >
                Add to cart
              </button>

            <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/60">
              <details className="group px-4 py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-black">
                  Description
                </summary>
                <p className="mt-2 text-sm leading-6 text-black/70">
                  Minimalist tee with a premium hand-feel. Built for everyday wear.
                </p>
              </details>

              <details className="group px-4 py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-black">
                  Material
                </summary>
                <p className="mt-2 text-sm leading-6 text-black/70">
                  100% cotton, heavyweight jersey, matte surface.
                </p>
              </details>

              <details className="group px-4 py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-black">
                  Shipping & Returns
                </summary>
                <p className="mt-2 text-sm leading-6 text-black/70">
                  1–3 dagar leverans. 14 dagars öppet köp.
                </p>
              </details>
            </div>
          </motion.div>
        </div>

          </section>
        </div>
      </div>
    </main>
  );
}
