"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export function CopyDraftButton({ draftEmail }: { draftEmail: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await navigator.clipboard.writeText(draftEmail);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy draft
        </>
      )}
    </Button>
  );
}
