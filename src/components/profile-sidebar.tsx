"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { formatMmSs } from "@/lib/user/use-quota-countdown";
import { expCostForLevel } from "@/lib/leveling";
import type { UserProfile } from "@/lib/user/user-profile";

type ProfileSidebarProps = {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  msUntilNextQuota: number | null;
};

const formatDate = (ms: number) => {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
};

export const ProfileSidebar = ({
  open,
  onClose,
  profile,
  loading,
  error,
  reload,
  msUntilNextQuota,
}: ProfileSidebarProps) => {
  const { user, signOut, getIdToken } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setReportOpen(false);
      setReportTitle("");
      setReportDesc("");
      setReportMessage(null);
      setReportSubmitting(false);
    }
  }, [open]);

  const submitReport = async () => {
    if (reportSubmitting) return;
    const title = reportTitle.trim();
    const desc = reportDesc.trim();
    if (!title || !desc) {
      setReportMessage({ kind: "error", text: "Please fill in both fields." });
      return;
    }
    setReportSubmitting(true);
    setReportMessage(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, desc }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setReportTitle("");
      setReportDesc("");
      setReportMessage({ kind: "success", text: "Thanks! Your report has been submitted." });
    } catch (e) {
      setReportMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "Failed to submit report",
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
    <aside
      className="absolute top-4 right-4 bottom-4 z-30 flex w-85 max-w-[calc(100vw-2rem)] flex-col overflow-hidden border-2 border-black bg-white text-neutral-900 shadow-[6px_6px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100"
      aria-label="Your profile"
    >
      <header className="flex items-center justify-between border-b-2 border-black px-4 py-3">
        <h2 className="text-base font-bold">Your profile</h2>
        <button
          className="flex h-7 w-7 items-center justify-center border-2 border-black bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <line x1="6" x2="18" y1="6" y2="18" />
            <line x1="6" x2="18" y1="18" y2="6" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && !profile && (
          <p className="text-sm text-neutral-500">Loading stats…</p>
        )}

        {error && (
          <div className="flex items-center justify-between border-2 border-black bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            <span>Couldn’t load stats: {error}</span>
            <button
              className="border-2 border-black bg-red-200 px-2 py-1 text-xs hover:bg-red-300 dark:bg-red-900 dark:hover:bg-red-800"
              type="button"
              onClick={() => reload()}
            >
              Retry
            </button>
          </div>
        )}

        {profile && user && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {profile.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="h-14 w-14 border-2 border-black"
                  src={profile.photoURL}
                  alt={profile.displayName}
                />
              )}
              <div className="flex flex-col">
                <span className="text-base font-semibold">{profile.displayName}</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{user.email}</span>
                <span className="text-[11px] text-neutral-500">
                  Joined {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>

            <ExpBar level={profile.level} exp={profile.exp} />

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Level" value={profile.level} />
              <Stat label="Pixels painted" value={profile.pixelsPainted} />
              <Stat label="Quota" value={`${profile.currentQuota}/${profile.maxQuota}`} />
            </div>

            <p className="text-[11px] text-neutral-500" aria-live="polite">
              {msUntilNextQuota !== null
                ? `Next quota in ${formatMmSs(msUntilNextQuota)}`
                : "Quota full"}
              {" · last tick anchor "}
              {formatDate(profile.lastQuotaRestoreAt)}
            </p>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t-2 border-black px-4 py-3">
        <button
          className="w-full border-2 border-black bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          type="button"
          onClick={() => {
            setReportOpen(true);
            setReportMessage(null);
          }}
        >
          Report a problem
        </button>
        <button
          className="w-full border-2 border-black bg-neutral-200 px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          type="button"
          onClick={() => signOut()}
        >
          Sign out
        </button>
      </footer>
    </aside>

    {reportOpen && (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Report a problem"
        onClick={() => {
          setReportOpen(false);
          setReportMessage(null);
        }}
      >
        <div
          className="flex w-full max-w-md flex-col gap-3 border-2 border-black bg-white p-4 text-neutral-900 shadow-[6px_6px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Report a problem</h3>
            <button
              className="flex h-7 w-7 items-center justify-center border-2 border-black bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              type="button"
              onClick={() => {
                setReportOpen(false);
                setReportMessage(null);
              }}
              aria-label="Close report form"
            >
              <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <line x1="6" x2="18" y1="6" y2="18" />
                <line x1="6" x2="18" y1="18" y2="6" />
              </svg>
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Title</span>
            <input
              className="border-2 border-black bg-white px-2 py-1 text-sm dark:bg-neutral-950"
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              maxLength={200}
              disabled={reportSubmitting}
              placeholder="Short summary"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Description</span>
            <textarea
              className="min-h-28 border-2 border-black bg-white px-2 py-1 text-sm dark:bg-neutral-950"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              maxLength={5000}
              disabled={reportSubmitting}
              placeholder="What happened?"
              rows={5}
            />
          </label>
          {reportMessage && (
            <p
              className={`text-xs ${
                reportMessage.kind === "success"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
              role={reportMessage.kind === "error" ? "alert" : undefined}
            >
              {reportMessage.text}
            </p>
          )}
          <button
            className="border-2 border-black bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            type="button"
            onClick={submitReport}
            disabled={reportSubmitting}
          >
            {reportSubmitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    )}
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-0.5 border-2 border-black bg-neutral-100 px-3 py-2 dark:bg-neutral-950">
    <span className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</span>
    <span className="text-base font-semibold">{value}</span>
  </div>
);

const ExpBar = ({ level, exp }: { level: number; exp: number }) => {
  const needed = Math.max(1, expCostForLevel(level));
  const intoLevel = Math.max(0, Math.min(exp, needed));
  const remaining = Math.max(0, needed - intoLevel);
  const pct = Math.min(100, Math.max(0, (intoLevel / needed) * 100));
  return (
    <div className="flex flex-col gap-1.5 border-2 border-black bg-neutral-100 px-3 py-2 dark:bg-neutral-950">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-neutral-500">
        <span>
          Lv {level} → Lv {level + 1}
        </span>
        <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
          {intoLevel.toLocaleString()} / {needed.toLocaleString()} exp
        </span>
      </div>
      <div className="h-2 w-full border border-black bg-neutral-300 dark:bg-neutral-800">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-neutral-500 tabular-nums">
        {remaining.toLocaleString()} exp to next level
      </span>
    </div>
  );
};
