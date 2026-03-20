import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "shurriapp",
    short_name: "shurriapp",
    description: "App privada para crear, aceptar y seguir contratos de a dos.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfafb",
    theme_color: "#8b5cf6",
    lang: "es",
    icons: [
      {
        src: "/icono.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icono.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icono.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: "/icono.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  };
}
