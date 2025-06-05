
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, BotMessageSquare, Puzzle, SettingsIcon, Waypoints, History, Binary, Repeat, PlaySquare, SearchCheck, ClipboardCheck, Network as NetworkIcon } from "lucide-react";
import { Logo } from "./logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/dashboard", label: "Activity Monitor", icon: LayoutDashboard },
  { href: "/chat", label: "AI Escalation", icon: BotMessageSquare },
  { href: "/trace", label: "AI Trace", icon: Waypoints },
  { href: "/diagnostics", label: "Diagnostics", icon: SearchCheck },
  { href: "/tests", label: "Plugin Tests", icon: ClipboardCheck },
  { href: "/orchestration", label: "Orchestration", icon: NetworkIcon },
  { href: "/sessions", label: "Chat Sessions", icon: History },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// Mock AI Trace Data for the sidebar widget
const mockLatestTrace = {
    id: "trace-123",
    model: "gpt-4-turbo",
    tools: ["Code Snippet Retriever", "Documentation Search"],
    plugins: ["Syntax Highlighter v1.1", "Error Explainer v0.9"],
    summary: "Generated solution for null pointer exception."
};


function LatestAiTraceWidget() {
  const router = useRouter();
  const { toast } = useToast();

  const handleReplayTrace = () => {
    router.push(`/trace?traceId=${mockLatestTrace.id}`); 
    toast({ title: "Replaying Trace (Mock)", description: `Navigating to trace details for ID: ${mockLatestTrace.id}`});
  };

  const handleRegenerateResponse = () => {
    toast({ title: "Regenerating Response (Mock)", description: "The AI will attempt to generate this response again."});
    // Here you would call the AI flow again, potentially with same/modified input
  };
  
  return (
    <Card className="mt-4 border-sidebar-border bg-sidebar-accent/30">
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium text-sidebar-foreground flex items-center">
          <Binary className="h-4 w-4 mr-2 text-sidebar-primary" />
          Latest AI Trace
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs text-sidebar-foreground/80 space-y-1">
        <p><strong>Model:</strong> {mockLatestTrace.model}</p>
        <p><strong>Tools:</strong> {mockLatestTrace.tools.join(', ')}</p>
        <p><strong>Plugins:</strong> {mockLatestTrace.plugins.join(', ')}</p>
        <p className="truncate" title={mockLatestTrace.summary}><strong>Summary:</strong> {mockLatestTrace.summary}</p>
        <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="h-7 text-xs border-sidebar-border hover:bg-sidebar-primary/20" onClick={handleReplayTrace}>
                <PlaySquare className="h-3 w-3 mr-1" /> Replay
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs border-sidebar-border hover:bg-sidebar-primary/20" onClick={handleRegenerateResponse}>
                <Repeat className="h-3 w-3 mr-1" /> Regenerate
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}


function AppShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar();

  const currentPageLabel = navItems.find(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))?.label || "ACAS Runner";

  return (
    <div className="flex flex-1"> {/* Ensure this div takes up available space */}
      <Sidebar side="left" variant="sidebar" collapsible="icon" className="hidden md:flex bg-sidebar text-sidebar-foreground"> {/* Hidden on mobile, shown on md+ */}
        <SidebarHeader className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="p-2 flex-1 flex flex-col justify-between">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                    className="w-full justify-start"
                    tooltip={{
                        content: item.label,
                        hidden: sidebarState === "expanded" || isMobile,
                        side: "right",
                        align: "center",
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

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <div className="md:hidden"> {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] sm:w-[300px] bg-sidebar text-sidebar-foreground p-0">
                <div className="flex h-full flex-col">
                  <SidebarHeader className="p-4 border-b border-sidebar-border">
                    <Logo />
                  </SidebarHeader>
                  <ScrollArea className="flex-1">
                    <nav className="grid gap-2 p-4 text-base font-medium">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${pathname.startsWith(item.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
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
          <div className="hidden md:block"> {/* Desktop sidebar toggle */}
            <SidebarTrigger />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold capitalize font-headline truncate">
              {currentPageLabel}
            </h1>
          </div>
        </header>
        
        <SidebarInset className="flex-1 bg-background">
          <ScrollArea className="h-full"> {/* Ensures content within SidebarInset is scrollable */}
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
