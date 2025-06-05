
import Link from 'next/link';
import { Bot } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
      <Bot className="h-6 w-6 text-sidebar-primary" />
      <span className="group-data-[collapsible=icon]:hidden font-headline">ACAS Runner</span>
    </Link>
  );
}
