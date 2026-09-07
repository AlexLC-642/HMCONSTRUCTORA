type DevicePasskeyMarkProps = {
  className?: string;
  size?: number;
};

export function DevicePasskeyMark({ className, size = 24 }: DevicePasskeyMarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" height={size} viewBox="0 0 48 48" width={size}>
      <rect height="40" rx="8" stroke="currentColor" strokeWidth="2.4" width="32" x="8" y="4" />
      <path d="M19 9h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M17.5 28.5c0-4.2 2.7-7 6.5-7s6.5 2.8 6.5 7c0 4.8-1.4 8.1-3.4 10.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M21.1 29c0-2 .9-3.4 2.9-3.4s2.9 1.4 2.9 3.4c0 3.3-.7 5.5-1.8 7.4M14.2 29.2c0-6.3 4-11 9.8-11 5.9 0 9.8 4.7 9.8 11 0 3.9-.7 7-2.1 9.6M17.4 36.7c-1.1-2.1-1.6-4.5-1.6-7.2M20.9 39.5c-1.3-2.5-2-5.8-2-9.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M36.5 8.5 42 14" stroke="var(--brand-red)" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
