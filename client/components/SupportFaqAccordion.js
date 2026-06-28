'use client';

import { useState } from 'react';

export default function SupportFaqAccordion({ faqs }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="divide-y divide-gray-50 overflow-hidden rounded-3xl border border-gray-200 bg-white">
      {faqs.map((f, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4.5 text-right transition hover:bg-gray-50/70"
          >
            <span className="text-[15px] font-bold text-gray-800">{f.q}</span>
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 transition-transform ${open === i ? 'rotate-180 bg-brand-light text-brand' : ''}`}>
              ▼
            </span>
          </button>
          {open === i && (
            <p className="fade-up border-t border-gray-50 bg-gray-50/50 px-6 py-4 text-sm leading-8 text-gray-600">
              {f.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
