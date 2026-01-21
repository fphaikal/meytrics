import React from 'react';

interface SplitSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function SplitSection({ title, description, children, icon }: SplitSectionProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 border-b border-default-200 pb-8 last:border-0 last:pb-0">
      <div className="md:w-1/3 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold text-default-900">{title}</h3>
        </div>
        <p className="text-sm text-default-500 mt-1">{description}</p>
      </div>
      <div className="md:w-2/3">
        {children}
      </div>
    </div>
  );
}
