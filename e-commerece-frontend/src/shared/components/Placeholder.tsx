const tones = [
  "from-[#e9dccb] to-[#c9b193]",
  "from-[#d9c3c0] to-[#a98b88]",
  "from-[#cfd6c8] to-[#94a08b]",
  "from-[#d6cfe0] to-[#9f94b3]",
  "from-[#e6d3b3] to-[#b8945f]",
  "from-[#cbd5dc] to-[#8fa1ad]",
];

type Props = {
  index?: number;
  label?: string;
  className?: string;
};

export function Placeholder({ index = 0, label, className = "" }: Props) {
  return (
    <div
      className={`flex items-end bg-gradient-to-br ${tones[index % tones.length]} ${className}`}
    >
      {label && (
        <span className="m-3 text-xs uppercase tracking-widest text-white/90">
          {label}
        </span>
      )}
    </div>
  );
}
