// src/services/injection-service.ts
"use client";

import { toast } from '@/hooks/use-toast';

/**
 * Sends content to a local "RooCode" bridge for injection or auto-pasting.
 * Falls back to copying to clipboard if the bridge is not available.
 * @param content The string content to send.
 * @param opts Options for the injection.
 */
export async function sendToRooCode(content: string, opts?: { autoPaste?: boolean }): Promise<void> {
  try {
    const response = await fetch("http://localhost:9888/insert", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, autoPaste: opts?.autoPaste ?? true }),
    });

    if (!response.ok) {
      throw new Error(`RooCode bridge returned status ${response.status}`);
    }
    toast({ title: "Content Injected", description: "Content sent to RooCode successfully." });
  } catch (e) {
    console.warn("Failed to send to RooCode bridge, falling back to clipboard:", e);
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied to Clipboard", description: "Could not reach RooCode bridge. Content copied to clipboard." });
    } catch (clipError) {
      console.error("Failed to copy to clipboard:", clipError);
      toast({ title: "Operation Failed", description: "Could not send to RooCode or copy to clipboard.", variant: "destructive" });
    }
  }
}

