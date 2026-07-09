"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("That didn't match. Check the email and password.");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  const inputClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors " +
    "placeholder:text-muted-foreground focus:border-flare/50";

  return (
    <div className="flex-1 grid place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-heading font-semibold text-2xl tracking-tight">
            Field<span className="text-flare">Scribe</span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your transcripts, anywhere. Processing stays home.
          </p>
        </div>
        <form onSubmit={signIn} className="space-y-4 rounded-xl border bg-card p-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Same login as FieldNotes.
          </p>
        </form>
        <a
          href="https://fieldtools.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 text-[10.5px] font-mono text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          a FieldTools.ai product
        </a>
      </div>
    </div>
  );
}
