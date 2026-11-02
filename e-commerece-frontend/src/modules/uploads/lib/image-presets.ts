// The best picture size for every place a picture is uploaded in the admin. `aspect` is the shape of the
// box on the website (width / height), `size` is what the owner is told to make. Keep these in step with
// the website: HeroSlider (banner), ListingPage (category and collection banner), TilesBlock (tile),
// MegaMenu (menu tile), ImageTextBlock, VideoTile and the product cards.
export interface ImagePreset {
  // Shape of the box on the website (width / height). No shape = show the picture as it is.
  aspect?: number;
  // What to tell the owner, e.g. "2400 × 900 px"
  size: string;
  // One short sentence of advice
  note?: string;
}

const KEEP_MIDDLE = "Keep the important part (text, faces) in the middle.";

export const IMAGE_PRESETS = {
  homeBanner: { aspect: 8 / 3, size: "2400 × 900 px", note: `Wide. ${KEEP_MIDDLE}` },
  homeBannerPhone: { aspect: 4 / 5, size: "1080 × 1350 px", note: "Tall, only for phones. Design it on its own." },
  promoBanner: { aspect: 2 / 1, size: "2000 × 1000 px", note: `Wide, two sit side by side. ${KEEP_MIDDLE}` },
  promoBannerPhone: { aspect: 16 / 9, size: "1280 × 720 px", note: "Only for phones, where each banner is a little less wide. Design it on its own." },
  pageBanner: { aspect: 2 / 1, size: "2400 × 1200 px", note: `Wide. ${KEEP_MIDDLE}` },
  pageBannerPhone: { aspect: 4 / 3, size: "1200 × 900 px", note: "Only for phones." },
  tile: {
    aspect: 4 / 5,
    size: "1200 × 1500 px",
    note: "Tall. Keep the main part at the top and middle; the name is written at the bottom.",
  },
  menuTile: { aspect: 3 / 4, size: "900 × 1200 px", note: "Tall. Shown as a small tile in the big menu." },
  footerLogo: { size: "about 900 × 376 px", note: "Your logo as a PNG with a see-through background." },
  pictureWithText: { aspect: 4 / 5, size: "1200 × 1500 px", note: "Tall. It fills one half of the block." },
  videoCover: { aspect: 8 / 3, size: "2400 × 900 px", note: `Wide, the same shape as the video. ${KEEP_MIDDLE}` },
  // The tall cards of the Trending videos block
  showcaseVideo: { aspect: 9 / 16, size: "1080 × 1920 px", note: "Very tall, like a phone video or a reel. Keep the main part in the middle." },
  product: { aspect: 3 / 4, size: "1200 × 1600 px", note: "Tall photos on a plain background look best." },
} satisfies Record<string, ImagePreset>;
