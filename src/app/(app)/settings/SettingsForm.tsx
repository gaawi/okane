"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { updateProfile } from "../actions";

export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [baseCurrency, setBaseCurrency] = useState(profile.base_currency);
  const [rate, setRate] = useState(String(profile.usd_to_eur));
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateProfile({
        base_currency: baseCurrency,
        usd_to_eur: Number(rate) || 0.92,
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="card space-y-3">
      <p className="font-semibold">Currency preferences</p>
      <div>
        <label className="label">Default display currency</label>
        <select
          className="input"
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
        >
          <option value="EUR">EUR €</option>
          <option value="USD">USD $</option>
        </select>
      </div>
      <div>
        <label className="label">USD → EUR rate (for reference)</label>
        <input
          className="input"
          type="number"
          step="0.0001"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          EUR and USD are tracked separately — no automatic conversion. This rate is
          stored for your own reference only.
        </p>
      </div>
      <button onClick={save} disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save preferences"}
      </button>
    </div>
  );
}
