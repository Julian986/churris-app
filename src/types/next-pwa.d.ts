declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaOptions = {
    dest: string;
    disable?: boolean;
  };

  export default function createPwa(
    options: PwaOptions,
  ): (nextConfig: NextConfig) => NextConfig;
}
