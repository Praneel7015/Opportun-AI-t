"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { toggleSavedAction } from "@/lib/actions/mutations";

export function SaveToggle({
  fingerprint,
  saved,
}: {
  fingerprint: string;
  saved: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await toggleSavedAction({ fingerprint, saved: !saved });
        });
      }}
    >
      <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
