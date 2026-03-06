'use client';

/**
 * MobileScrollMenu
 *
 * Wraps a mobile trigger element (e.g. "Meny" button) and collapses it to an
 * animated "…" floating button when the user scrolls down, then re-expands it
 * when they scroll back up.
 *
 * Scroll state-machine with hysteresis (anti-flicker):
 *  - COLLAPSE only after the user has scrolled DOWN ≥ deltaCollapse px *and*
 *    the downward streak has lasted ≥ streakMs ms, *and* scrollY > collapseThreshold.
 *  - EXPAND only after the user has scrolled UP ≥ deltaExpand px *or*
 *    the upward streak has lasted ≥ streakMs ms, *or* scrollY < topThreshold.
 *  - A cooldownMs guard prevents toggling more than once per cooldown window.
 *  - If the page is not scrollable at all the button never collapses.
 *
 * Props:
 *  children      – the expanded trigger element (rendered inside a positioned wrapper)
 *  onOpen        – called when the collapsed "…" button is tapped
 *  right         – px from right edge (default 16)
 *  deltaCollapse – minimum downward travel to trigger collapse (default 28)
 *  deltaExpand   – minimum upward travel to trigger expand (default 18)
 *  streakMs      – direction must be sustained this long before toggling (default 150)
 *  cooldownMs    – minimum ms between any two state changes (default 260)
 *  collapseThreshold – scrollY must exceed this before collapsing (default 44)
 *  topThreshold  – scrollY below this always expands (default 22)
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type MobileScrollMenuProps = {
  children: React.ReactNode;
  onOpen: () => void;
  right?: number;
  deltaCollapse?: number;
  deltaExpand?: number;
  streakMs?: number;
  cooldownMs?: number;
  collapseThreshold?: number;
  topThreshold?: number;
};

// ─── Animated "…" three-dot indicator ────────────────────────────────────────

function ThreeDots() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.4, y: 4 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              delay: i * 0.06,
              type: 'spring',
              stiffness: 500,
              damping: 24,
            },
          }}
          exit={{
            opacity: 0,
            scale: 0.4,
            y: -4,
            transition: { delay: i * 0.04, duration: 0.15 },
          }}
          className="block h-[5px] w-[5px] rounded-full bg-neutral-700"
        />
      ))}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MobileScrollMenu({
  children,
  onOpen,
  right = 16,
  deltaCollapse = 28,
  deltaExpand = 18,
  streakMs = 150,
  cooldownMs = 260,
  collapseThreshold = 44,
  topThreshold = 22,
}: MobileScrollMenuProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Mutable refs — no re-renders, safe in scroll handler
  const lastScrollY = useRef(0);
  const lastDirection = useRef<'up' | 'down' | null>(null);
  const directionStartY = useRef(0);
  const directionStartTime = useRef(0);
  const lastToggleAt = useRef(0);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      const rawDelta = currentY - lastScrollY.current;

      // Ignore micro-jitter
      if (Math.abs(rawDelta) < 1) return;

      // If the page is not actually scrollable, always expand and bail
      const scrollable =
        document.documentElement.scrollHeight > window.innerHeight + 1;
      if (!scrollable) {
        if (collapsed) {
          setCollapsed(false);
          lastToggleAt.current = Date.now();
        }
        lastScrollY.current = currentY;
        return;
      }

      const direction: 'up' | 'down' = rawDelta > 0 ? 'down' : 'up';

      // Reset streak counters whenever direction changes
      if (direction !== lastDirection.current) {
        lastDirection.current = direction;
        directionStartY.current = lastScrollY.current;
        directionStartTime.current = Date.now();
        lastScrollY.current = currentY;
        return;
      }

      const movedInDirection = Math.abs(currentY - directionStartY.current);
      const elapsedInDirection = Date.now() - directionStartTime.current;
      const timeSinceToggle = Date.now() - lastToggleAt.current;

      // Near the very top → always expand (no cooldown check)
      if (currentY < topThreshold) {
        if (collapsed) {
          setCollapsed(false);
          lastToggleAt.current = Date.now();
        }
        lastScrollY.current = currentY;
        return;
      }

      if (timeSinceToggle < cooldownMs) {
        lastScrollY.current = currentY;
        return;
      }

      if (direction === 'down' && !collapsed) {
        const pastInitialThreshold = currentY > collapseThreshold;
        const deltaMet = movedInDirection >= deltaCollapse;
        const streakMet = elapsedInDirection >= streakMs;
        if (pastInitialThreshold && (deltaMet || streakMet)) {
          setCollapsed(true);
          lastToggleAt.current = Date.now();
        }
      }

      if (direction === 'up' && collapsed) {
        const deltaMet = movedInDirection >= deltaExpand;
        const streakMet = elapsedInDirection >= streakMs;
        if (deltaMet || streakMet) {
          setCollapsed(false);
          lastToggleAt.current = Date.now();
        }
      }

      lastScrollY.current = currentY;
    }

    // passive:true ensures the scroll handler never blocks paint
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [
    collapsed,
    collapseThreshold,
    cooldownMs,
    deltaCollapse,
    deltaExpand,
    streakMs,
    topThreshold,
  ]);

  return (
    <>
      {/* Expanded trigger — hidden when collapsed */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed "…" button */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            key="dots"
            type="button"
            aria-label="Öppna meny"
            onClick={onOpen}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="fixed z-50 md:hidden flex items-center justify-center rounded-full bg-white/75 border border-white/40 backdrop-blur-md shadow-md"
            style={{
              top: 20,
              right,
              width: 38,
              height: 38,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <ThreeDots />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
