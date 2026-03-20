import path from "node:path";
import type { NextConfig } from "next";
import createPwa from "next-pwa";

const withPwa = createPwa({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withPwa(nextConfig);
