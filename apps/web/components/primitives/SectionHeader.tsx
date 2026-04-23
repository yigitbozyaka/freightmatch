type SectionHeaderProps = {
  label: string;
  className?: string;
};

export function SectionHeader({ label, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 font-mono uppercase tracking-widest text-xs text-slate-300 ${className}`.trim()}>
      <span className="text-[--color-amber-400]">▌</span>
      <span>{label}</span>
    </div>
  );
}
