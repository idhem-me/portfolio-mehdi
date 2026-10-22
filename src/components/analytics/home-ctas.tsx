"use client";

import { ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents } from "@/lib/analytics/events";

export function HomeCtas() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <TrackedLink
          href="/product-designer"
          event={AnalyticsEvents.home_cta}
          eventProps={{ href: "/product-designer", label: "parcours" }}
        >
          Voir mon parcours design
          <ArrowRight data-icon="inline-end" />
        </TrackedLink>
      </Button>
      <Button asChild variant="outline">
        <TrackedLink
          href="/contact"
          event={AnalyticsEvents.home_cta}
          eventProps={{ href: "/contact", label: "contact" }}
        >
          Me contacter
        </TrackedLink>
      </Button>
    </div>
  );
}
