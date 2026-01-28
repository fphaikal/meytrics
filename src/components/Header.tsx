interface HeaderProps {
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  lastUpdate: Date;
  nextUpdate: number;
}

export function Header({ title, subtitle, logoUrl, lastUpdate, nextUpdate }: HeaderProps) {
  return (
    <header className="bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center md:items-center justify-between gap-4 md:gap-0">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={title}
              className="h-10 md:h-12 w-auto object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--status-primary)]">{title}</h1>
            {subtitle && <p className="text-sm md:text-md mt-1 text-[var(--status-secondary)]">{subtitle}</p>}
          </div>
        </div>

        <div className="text-center md:text-right w-full md:w-auto bg-white/5 md:bg-transparent p-3 md:p-0 rounded-lg md:rounded-none">
          <div className="text-xl md:text-2xl font-bold text-[var(--status-primary)] mb-0.5">Service status</div>
          <div className="text-xs md:text-md text-[var(--status-secondary)]">
            Last updated {lastUpdate.toLocaleTimeString()} | Next update in {nextUpdate} sec.
          </div>
        </div>
      </div>
    </header>
  );
}
