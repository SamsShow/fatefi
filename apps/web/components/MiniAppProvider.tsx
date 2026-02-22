"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Calls sdk.actions.ready() once the app has mounted so the Base app
 * hides the splash screen and shows FateFi.
 * Also exposes the Farcaster context (wallet address, FID, etc.) via
 * sdk.context which you can use anywhere in the app.
 */
export default function MiniAppProvider() {
  useEffect(() => {
    sdk.actions.ready().catch((err) => {
      // Not running inside the Base mini-app shell — silently ignore.
      console.debug("[MiniAppProvider] sdk.actions.ready skipped:", err);
    });
  }, []);

  return null;
}
