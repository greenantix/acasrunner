import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
    >
      <div className="relative h-8 w-8 flex-shrink-0">
        <Image
          src="/logo.png"
          alt="leo Runner"
          fill
          className="object-contain"
          priority
        />
      </div>
      <span className="font-headline group-data-[collapsible=icon]:hidden">leo Runner</span>
    </Link>
  );
}

