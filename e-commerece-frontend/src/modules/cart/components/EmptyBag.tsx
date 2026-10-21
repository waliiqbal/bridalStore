import Link from "next/link";
import { LuShoppingBag } from "react-icons/lu";

// Shown when the bag has nothing in it
export function EmptyBag({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <LuShoppingBag className="mx-auto h-10 w-10 text-gold" aria-hidden />
      <p className="mt-3 font-serif text-xl font-bold">Your bag is empty</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">
        When you add an outfit it will wait for you here.
      </p>
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-6 inline-flex h-11 items-center bg-black px-7 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
      >
        Start shopping
      </Link>
    </div>
  );
}
