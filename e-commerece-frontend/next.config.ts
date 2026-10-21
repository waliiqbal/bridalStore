import type { NextConfig } from "next";

// Safety headers sent with every page. (A Content-Security-Policy is deliberately not set yet:
// the Square, Stripe, PayPal, Google and Meta scripts each need their own allowances, so it must
// be written and tested against the real providers once their keys are in.)
const securityHeaders = [
  // Browsers must not guess file types
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody else may show this shop inside their own page (stops "click-jacking")
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Links to other sites don't get the full address of the page the visitor was on
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The shop never uses the camera, microphone or location
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Always use HTTPS (only takes effect on the real https:// site)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Uploaded product, category and banner pictures are served by Cloudinary
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // Smaller files for browsers that support them (AVIF, then WebP), original format otherwise.
    // Measured: a few percent smaller than WebP on our flat sample art, usually far more on photos.
    formats: ["image/avif", "image/webp"],
    // Every uploaded picture gets a new address when it changes, so a resized copy can be kept
    // for 31 days instead of being re-made (the default is 60 seconds)
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  // Tried and left out: `experimental.inlineCss`. Over repeated Lighthouse runs it gave no
  // faster first paint and added about 25 KB to every page (the CSS is re-sent inside each page).
};

export default nextConfig;
