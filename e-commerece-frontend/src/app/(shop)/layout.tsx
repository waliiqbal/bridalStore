import { FloatingActions } from "@/shared/layouts/FloatingActions";
import { Footer } from "@/shared/layouts/Footer";
import { Header } from "@/shared/layouts/Header";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
    </>
  );
}
