'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import {
  Binary,
  BotMessageSquare,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Menu,
  PlaySquare,
  Puzzle,
  Repeat,
  SearchCheck,
  SettingsIcon,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Logo } from './logo';

const navItems = [
  { href: '/dashboard', label: 'Activity Monitor', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Escalation', icon: BotMessageSquare },
  { href: '/trace', label: 'AI Trace', icon: Waypoints },
  { href: '/diagnostics', label: 'Stop-Catch Monitor', icon: SearchCheck },
  { href: '/struggle-settings', label: 'Struggle Settings', icon: ClipboardCheck },
  { href: '/sessions', label: 'Chat Sessions', icon: History },
  { href: '/plugins', label: 'Plugins', icon: Puzzle },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

// Mock AI Trace Data for the sidebar widget
const mockLatestTrace = {
  id: 'trace-123',
  model: 'gpt-4-turbo',
  tools: ['Code Snippet Retriever', 'Documentation Search'],
  plugins: ['Syntax Highlighter v1.1', 'Error Explainer v0.9'],
  summary: 'Generated solution for null pointer exception.',
};

function LatestAiTraceWidget() {
  const router = useRouter();
  const { toast } = useToast();

  const handleReplayTrace = () => {
    router.push(`/trace?traceId=${mockLatestTrace.id}`);
    toast({
      title: 'Replaying Trace (Mock)',
      description: `Navigating to trace details for ID: ${mockLatestTrace.id}`,
    });
  };

  const handleRegenerateResponse = () => {
    toast({
      title: 'Regenerating Response (Mock)',
      description: 'The AI will attempt to generate this response again.',
    });
    // Here you would call the AI flow again, potentially with same/modified input
  };

  return (
    <Card className="mt-4 border-sidebar-border bg-sidebar-accent/30">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center text-sm font-medium text-sidebar-foreground">
          <Binary className="mr-2 h-4 w-4 text-sidebar-primary" />
          Latest AI Trace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3 text-xs text-sidebar-foreground/80">
        <p>
          <strong>Model:</strong> {mockLatestTrace.model}
        </p>
        <p>
          <strong>Tools:</strong> {mockLatestTrace.tools.join(', ')}
        </p>
        <p>
          <strong>Plugins:</strong> {mockLatestTrace.plugins.join(', ')}
        </p>
        <p className="truncate" title={mockLatestTrace.summary}>
          <strong>Summary:</strong> {mockLatestTrace.summary}
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-sidebar-border text-xs hover:bg-sidebar-primary/20"
            onClick={handleReplayTrace}
          >
            <PlaySquare className="mr-1 h-3 w-3" /> Replay
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-sidebar-border text-xs hover:bg-sidebar-primary/20"
            onClick={handleRegenerateResponse}
          >
            <Repeat className="mr-1 h-3 w-3" /> Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar();

  const currentPageLabel =
    navItems.find(
      item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )?.label || 'leo Runner';

  return (
    <div className="flex flex-1">
      {' '}
      {/* Ensure this div takes up available space */}
      <Sidebar
        side="left"
        variant="sidebar"
        collapsible="icon"
        className="hidden bg-sidebar text-sidebar-foreground md:flex"
      >
        {' '}
        {/* Hidden on mobile, shown on md+ */}
        <SidebarHeader className="flex items-center justify-between border-b border-sidebar-border p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="flex flex-1 flex-col justify-between p-2">
          <SidebarMenu>
            {navItems.map(item => (
              <SidebarMenuItem key={item.href}>
                {' '}
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href))
                    }
                    className="w-full justify-start"
                    tooltip={{
                      content: item.label,
                      hidden: sidebarState === 'expanded' || isMobile,
                      side: 'right',
                      align: 'center',
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="group-data-[collapsible=icon]:hidden">
            <LatestAiTraceWidget />
          </div>
        </SidebarContent>
        {/* Footer can be added here if needed */}
      </Sidebar>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <div className="md:hidden">
            {' '}
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[260px] bg-sidebar p-0 text-sidebar-foreground sm:w-[300px]"
              >
                <div className="flex h-full flex-col">
                  <SidebarHeader className="border-b border-sidebar-border p-4">
                    <Logo />
                  </SidebarHeader>
                  <ScrollArea className="flex-1">
                    <nav className="grid gap-2 p-4 text-base font-medium">
                      {navItems.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${pathname.startsWith(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4">
                      <LatestAiTraceWidget />
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden md:block">
            {' '}
            {/* Desktop sidebar toggle */}
            <SidebarTrigger />
          </div>
          <div className="flex-1">
            <h1 className="truncate font-headline text-xl font-semibold capitalize">
              {currentPageLabel}
            </h1>
          </div>
        </header>

        <SidebarInset className="flex-1 bg-background">
          <ScrollArea className="h-full">
            {' '}
            {/* Ensures content within SidebarInset is scrollable */}
            <main className="p-4 sm:p-6">{children}</main>
          </ScrollArea>
        </SidebarInset>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppShellClient>{children}</AppShellClient>
    </SidebarProvider>
  );
}

