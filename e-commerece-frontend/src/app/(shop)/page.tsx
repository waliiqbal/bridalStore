import { HeroCarousel } from "@/modules/products/components/HeroCarousel";
import { FeatureIcons } from "@/modules/products/components/FeatureIcons";
import { PromoTiles } from "@/modules/products/components/PromoTiles";
import { TrendingCarousel } from "@/modules/products/components/TrendingCarousel";
import { ProductCarousel } from "@/modules/products/components/ProductCarousel";
import { ImageBanner } from "@/modules/products/components/ImageBanner";
import { ProductRow } from "@/modules/products/components/ProductRow";
import { FeatureBanner } from "@/modules/products/components/FeatureBanner";
import { CuratedCollections } from "@/modules/products/components/CuratedCollections";
import { BrideGroomSection } from "@/modules/products/components/BrideGroomSection";
import { StoreLocations } from "@/modules/products/components/StoreLocations";
import { CustomerStories } from "@/modules/products/components/CustomerStories";
import { InstagramFeed } from "@/modules/products/components/InstagramFeed";

const promos = [
  { title: "Kurta & Jacket Sets" },
  { title: "Fresh Drops" },
  { title: "Indo Western Edit" },
  { title: "Your Festive Look" },
];
const collections = [
  { title: "Embroidered Saree" },
  { title: "Festive Kurta Sets" },
  { title: "Kurta & Jacket Styles" },
  { title: "Crop Top Styles" },
  { title: "Lehenga Sets" },
  { title: "Bridal Edit" },
  { title: "Menswear Edit" },
  { title: "Statement Jewelry" },
];
const trending = [
  "Embroidered Silk Saree", "Zari Lehenga Set", "Festive Kurta Set", "Pre-draped Saree",
  "Sequin Gown", "Printed Anarkali", "Velvet Sherwani", "Organza Saree",
  "Mirror Work Lehenga", "Chikankari Kurta",
];
const corsets = [
  { name: "Olive Satin Pre-draped Saree Set", price: "$219" },
  { name: "Black Lace Ready Pleated Saree", price: "$549" },
  { name: "Blush Pink Embellished Drape Set", price: "$419" },
  { name: "Sage Green Skirt Set With Cape", price: "$349" },
  { name: "Light Pink Satin Corset Saree", price: "$299" },
  { name: "Ivory Corset Lehenga Set", price: "$389" },
  { name: "Wine Velvet Corset Gown", price: "$459" },
  { name: "Champagne Sequin Corset Set", price: "$329" },
];
const picks = [
  "Pastel Lehenga", "Handloom Saree", "Indo Western Jacket Set", "Silk Bandhgala",
  "Cape Set", "Ruffle Saree", "Cotton Kurta Set", "Statement Blouse",
];

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <FeatureIcons />
      <PromoTiles items={promos} />
      <TrendingCarousel items={trending.map((name) => ({ name }))} />
      <ProductCarousel title="Trending Corsets" items={corsets} />
      <PromoTiles title="Top Collections" items={collections} offset={2} scrollable />
      <ImageBanner
        heading="Shop With a Stylist"
        title="Expert Advice, Just a Video Call Away."
        text="Our stylists speak English, Hindi and more"
        cta="Start Call Now"
        index={4}
      />
      <ProductRow title="Editor Picks" subtitle="Handpicked by our stylists" items={picks} offset={2} />
      <FeatureBanner
        eyebrow="The Saree Edit"
        title="Ready-to-wear Sarees"
        text="Pre-draped styles that look effortless and are ready in minutes."
        cta="Shop Sarees"
        index={1}
      />
      <CuratedCollections />
      <BrideGroomSection />
      <StoreLocations />
      <CustomerStories />
      <InstagramFeed />
    </>
  );
}
