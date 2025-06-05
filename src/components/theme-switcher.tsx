
"use client";

import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ThemeSwitcher() {
  const { setTheme, theme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure the component only renders the theme-dependent parts on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const availableThemes = themes.filter(t => t !== 'system'); // We don't use system preference

  if (!mounted) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Appearance</CardTitle>
          <CardDescription>Choose your preferred interface theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableThemes.map((t) => (
              <div key={t} className="flex items-center space-x-3 p-3 border rounded-md">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline">Appearance</CardTitle>
        <CardDescription>Choose your preferred interface theme.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={setTheme} className="space-y-3">
          {availableThemes.map((t) => (
            <div key={t} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={t} id={`theme-${t}`} />
              <Label htmlFor={`theme-${t}`} className="capitalize text-base cursor-pointer flex-1">{t}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
