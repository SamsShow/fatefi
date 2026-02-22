import { NextResponse } from "next/server";

const ROOT_URL = "https://fatefi.fun";

export async function GET() {
  return NextResponse.json(
    {
      accountAssociation: {
        header: "",
        payload: "",
        signature: "",
      },
      miniapp: {
        version: "1",
        name: "FateFi",
        subtitle: "Tarot-Powered Market Predictions",
        description:
          "Draw the cards. Read the cosmos. Predict the market. A mystical, gamified prediction platform powered by AI and ancient wisdom.",
        homeUrl: ROOT_URL,
        iconUrl: `${ROOT_URL}/icon.png`,
        splashImageUrl: `${ROOT_URL}/og-image.png`,
        splashBackgroundColor: "#0a0a0f",
        webhookUrl: `${ROOT_URL}/api/webhook`,
        screenshotUrls: [`${ROOT_URL}/screenshot-1.png`, `${ROOT_URL}/screenshot-2.png`],
        primaryCategory: "social",
        tags: ["tarot", "predictions", "defi", "base", "onchain"],
        heroImageUrl: `${ROOT_URL}/og-image.png`,
        tagline: "Let the cards guide your trade",
        ogTitle: "FateFi — Tarot-Powered Market Predictions",
        ogDescription: "Draw the cards. Read the cosmos. Predict the market.",
        ogImageUrl: `${ROOT_URL}/og-image.png`,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
