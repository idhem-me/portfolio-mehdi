"use client";

import Image, { type ImageProps } from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

type Props = Omit<ImageProps, "src"> & { light: string; dark: string };

const subscribe = () => () => {};

export function useActiveImageTheme() {
  const { resolvedTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? resolvedTheme : undefined;
}

export function ActiveThemeImage({ light, dark, alt, ...props }: Props) {
  const resolvedTheme = useActiveImageTheme();
  if (!resolvedTheme) return null;
  return <Image {...props} alt={alt} src={resolvedTheme === "dark" ? dark : light} />;
}
