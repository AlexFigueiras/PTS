'use client';

import { useEffect, useState } from 'react';
import { MapPin as MapIcon } from 'lucide-react';
import { searchAddress } from '@/lib/geocoding';
import type { GeocodeResult } from '@/lib/geocoding';

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: GeocodeResult) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (value.length >= 3) {
        const res = await searchAddress(value);
        setSuggestions(res);
        setOpen(res.length > 0);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative col-span-12">
      <label className="mb-2.5 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Endereço Completo</label>
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-2xl border border-border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-300"
          placeholder="Comece a digitar o endereço…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 3 && setOpen(true)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors last:border-0 hover:bg-secondary/30"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
            >
              <MapIcon size={14} className="mt-1 shrink-0 text-muted-foreground/40" />
              <span className="text-sm font-semibold text-foreground/80">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
