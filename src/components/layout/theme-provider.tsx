"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // The root layout applies the initial theme before hydration. Keep the
  // library's duplicate bootstrap inert when React mounts this provider.
  return (
    <NextThemesProvider {...props} scriptProps={{ type: "text/plain" }}>
      {children}
    </NextThemesProvider>
  );
}
