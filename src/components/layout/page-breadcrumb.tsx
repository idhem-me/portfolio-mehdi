import { Fragment } from "react";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

type Crumb = {
  href: string;
  label: string;
};

export function PageBreadcrumb({
  current,
  parents = [],
  className,
  onNavigate,
}: {
  current: string;
  parents?: readonly Crumb[];
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const crumbs = [{ href: "/", label: t("home") }, ...parents];

  return (
    <Breadcrumb aria-label={t("breadcrumb")} className={className}>
      <BreadcrumbList>
        {crumbs.map(({ href, label }) => (
          <Fragment key={href}>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={href} onClick={onNavigate}>
                  {label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
