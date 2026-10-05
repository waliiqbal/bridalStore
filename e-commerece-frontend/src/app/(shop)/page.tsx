import { HeroCarousel } from "@/modules/products/components/HeroCarousel";
import { FeatureIcons } from "@/modules/products/components/FeatureIcons";
import { PromoTiles } from "@/modules/products/components/PromoTiles";
import { TrendingCarousel } from "@/modules/products/components/TrendingCarousel";
import { ProductCarousel } from "@/modules/products/components/ProductCarousel";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { ImageBanner } from "@/modules/products/components/ImageBanner";
import { ServiceBanner } from "@/modules/products/components/ServiceBanner";
import { LuGem, LuSmartphone } from "react-icons/lu";
import { MediaCollage } from "@/modules/products/components/MediaCollage";
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
const curated = [
  { title: "Minimalist Styles" },
  { title: "Classic Picks" },
  { title: "Printed Collection" },
  { title: "Rich Embroidered Styles" },
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
      <section className="pt-14">
        <SectionHeading title="Editor's Picks" />
        <div className="grid gap-4 px-2 lg:grid-cols-2 lg:px-4">
          <ImageBanner
            title="Signature Blouses"
            text="Crafted for every drape."
            cta="Shop Now"
            index={1}
            align="center"
            tone="dark"
            className=""
            imageClassName="h-[300px] w-full sm:h-[420px]"
          />
          <ImageBanner
            title="Twirl In Anarkalis"
            text="Make an entrance in styles made to stand out."
            cta="Shop Now"
            index={3}
            align="center"
            tone="dark"
            className=""
            imageClassName="h-[300px] w-full sm:h-[420px]"
          />
        </div>
      </section>
      <MediaCollage
        heading="The Saree Edit"
        items={[{}, {}, {}, {}]}
        lines={["The Perfect Drape,", "Made Easy"]}
        title="Ready-Draped Sarees"
        cta="Pre-Drape Now"
        text="The sarees you love, expertly pre-draped for you."
        index={1}
      />
      <PromoTiles title="Curated Collections" items={curated} offset={1} />
      <section className="pt-14">
        <SectionHeading title="Bride And Groom Collection" />
        <ImageBanner
          title="The Wedding Edit"
          text="Curated looks for the bride and groom."
          cta="Shop Now"
          index={5}
          align="right"
          tone="dark"
          className="px-2 lg:px-4"
          imageClassName="h-[320px] w-full sm:h-[520px]"
        />
      </section>
      <BrideGroomSection />
      <ServiceBanner
        items={[
          {
            icon: LuSmartphone,
            title: "Shop Via Video Call",
            text: "Get a free virtual styling session",
            cta: "Book an Appointment",
          },
          {
            icon: LuGem,
            title: "The Bridal Stylist",
            text: "Book a personal bridal consultation and find your wedding outfit",
            cta: "Book an Appointment",
          },
        ]}
      />
      <StoreLocations />
      <CustomerStories />
      <InstagramFeed />
    </>
  );
}
