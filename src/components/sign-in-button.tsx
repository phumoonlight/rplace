"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export const SignInButton = () => {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        type="button"
        onClick={onClick}
        disabled={busy}
      >
        {busy ? "Signing in…" : "Sign in with Google"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};
