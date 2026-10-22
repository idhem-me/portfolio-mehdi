"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { profile } from "@/data/resume";

export function CopyEmailButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profile.email);
      track(AnalyticsEvents.copy_email, { source: "copy_email_button" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn("h-8 w-full justify-start gap-2 font-normal", className)}
      onClick={handleCopy}
      aria-label={copied ? "Email copié" : `Copier ${profile.email}`}
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" aria-hidden />
      ) : (
        <Mail className="size-4" aria-hidden />
      )}
      <span className="truncate">{copied ? "Copié !" : profile.email}</span>
    </Button>
  );
}
