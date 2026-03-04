'use client';

import { useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export interface PickerOption {
  value: number;
  label: string;
}

export default function PickerWheel({
  options,
  value,
  onChange,
}: {
  options: PickerOption[];
  value: number;
  onChange: (value: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout>>();

  const valueIndex = options.findIndex((o) => o.value === value);
  const currentIndex = valueIndex >= 0 ? valueIndex : 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetScroll = currentIndex * ITEM_HEIGHT;
    el.scrollTop = targetScroll;
    setScrollIndex(currentIndex);
  }, [currentIndex]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const newIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(options.length - 1, newIndex));
    setScrollIndex(clamped);

    clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      const idx = Math.round((scrollRef.current?.scrollTop ?? 0) / ITEM_HEIGHT);
      const safe = Math.max(0, Math.min(options.length - 1, idx));
      scrollRef.current?.scrollTo({ top: safe * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(options[safe].value);
    }, 100);
  };

  const highlightIndex = scrollIndex;

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto overscroll-contain snap-y snap-mandatory rounded-xl border border-gray-100 bg-gray-50/50"
      style={{ height: WHEEL_HEIGHT }}
      onScroll={handleScroll}
    >
      <div style={{ height: ITEM_HEIGHT * 2 }} className="snap-center shrink-0" aria-hidden />
      {options.map((opt, i) => (
        <div
          key={i}
          className="snap-center shrink-0 flex items-center justify-center transition-all duration-75"
          style={{ height: ITEM_HEIGHT }}
        >
          <span
            className={`transition-all duration-75 ${
              i === highlightIndex
                ? 'text-base font-semibold text-gray-900 bg-white rounded-lg px-3 py-1.5 shadow-sm'
                : 'text-sm text-gray-400'
            }`}
          >
            {opt.label}
          </span>
        </div>
      ))}
      <div style={{ height: ITEM_HEIGHT * 2 }} className="snap-center shrink-0" aria-hidden />
    </div>
  );
}
