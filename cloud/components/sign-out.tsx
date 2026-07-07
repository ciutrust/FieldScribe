"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOut() {
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.assign("/login");
      }}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Sign out"
    >
      <LogOut className="size-3" /> sign out
    </button>
  );
}
