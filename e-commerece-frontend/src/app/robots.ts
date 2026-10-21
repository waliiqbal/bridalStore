import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/modules/shop/lib/seo";

// robots.txt: search engines may read the shop, but not the private or personal pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/cart",
        "/checkout",
        "/login",
        "/register",
        "/forgot-password",
        "/wishlist",
        "/search",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
