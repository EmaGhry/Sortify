import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sortify Station",
    short_name: "Sortify",
    description: "AI recycling station with an operator panel.",
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
