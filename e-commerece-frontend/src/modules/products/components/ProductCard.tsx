import { Placeholder } from "@/shared/components/Placeholder";

type Props = { name: string; price: string; index: number };

export function ProductCard({ name, price, index }: Props) {
  return (
    <a href="#" className="group block w-[65%] shrink-0 snap-start sm:w-[32%] lg:w-[19%]">
      <div className="relative overflow-hidden">
        <Placeholder
          index={index}
          className="aspect-[3/4] w-full transition duration-500 group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 text-lg">♡</span>
      </div>
      <h3 className="mt-3 truncate text-sm">{name}</h3>
      <p className="text-sm text-muted">{price}</p>
    </a>
  );
}
