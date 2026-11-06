import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sortify — AI Recycling Assistant",
    short_name: "Sortify",
    description: "Scan it. Sort it. Save the planet.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1e9",
    theme_color: "#1c2b21",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
