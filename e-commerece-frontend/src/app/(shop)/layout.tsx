import { Header } from "@/shared/layouts/Header";
import { Footer } from "@/shared/layouts/Footer";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
