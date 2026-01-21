interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdate: Date;
  nextUpdate: number;
}

export function Header({ title, subtitle, lastUpdate, nextUpdate }: HeaderProps) {
  return (
    <header className="bg-transparent text-white">
      <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">{title}</h1>
          {subtitle && <p className="text-md text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white mb-0.5">Service status</div>
          <div className="text-md text-slate-400">
            Last updated {lastUpdate.toLocaleTimeString()} | Next update in {nextUpdate} sec.
          </div>
        </div>
      </div>
    </header>
  );
}
