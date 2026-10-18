import type { MetadataRoute } from "next";

import { protectedPrefixes } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...protectedPrefixes, "/api/", "/auth/"] }],
  };
}
