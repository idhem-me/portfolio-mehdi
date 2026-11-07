import { cn } from "@/lib/utils";
import type { ExperienceLogo } from "@/lib/content";

type CompanyLogoProps = {
  logo: ExperienceLogo;
  alt: string;
  className?: string;
};

export function CompanyLogo({ logo, alt, className }: CompanyLogoProps) {
  const imgClass = cn(
    "size-7 shrink-0 object-contain",
    logo.rounded && "rounded-full object-cover"
  );

  if (logo.light === logo.dark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.light}
        alt={alt}
        width={28}
        height={28}
        className={cn(imgClass, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.light}
        alt={alt}
        width={28}
        height={28}
        className={cn(imgClass, "dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.dark}
        alt=""
        width={28}
        height={28}
        className={cn(imgClass, "hidden dark:block")}
        aria-hidden
      />
    </span>
  );
}
