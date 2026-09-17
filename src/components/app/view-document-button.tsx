"use client";

import { useTransition } from "react";
import { getDocumentUrl } from "@/lib/documents/actions";

export function ViewDocumentButton({ documentId }: { documentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await getDocumentUrl(documentId);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
          else alert("This document is not available.");
        })
      }
      className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Opening…" : "View"}
    </button>
  );
}
