import React from 'react';
import { ProviderType } from '@/lib/storage/router';
import { HardDrive, Cloud, Server } from 'lucide-react';

interface ProviderBadgeProps {
  provider: ProviderType;
  size?: 'sm' | 'md';
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider, size = 'sm' }) => {
  const isSm = size === 'sm';

  if (provider === 'MEGA') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border border-mega-border bg-mega-bg text-mega-light ${
          isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        <Cloud className={isSm ? 'w-3 h-3 text-mega-light' : 'w-4 h-4 text-mega-light'} />
        MEGA
      </span>
    );
  }

  if (provider === 'FILEN') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border border-filen-border bg-filen-bg text-filen-light ${
          isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        <Server className={isSm ? 'w-3 h-3 text-filen-light' : 'w-4 h-4 text-filen-light'} />
        Filen
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border border-gray-700 bg-gray-800 text-gray-300 ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <HardDrive className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
      Local
    </span>
  );
};
