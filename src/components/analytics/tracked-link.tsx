"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { track, type AnalyticsEventName } from "@/lib/analytics/events";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: AnalyticsEventName | (string & {});
  eventProps?: Record<string, unknown>;
};

export function TrackedLink({
  event,
  eventProps,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      data-analytics-action={event}
      data-analytics-value={
        typeof eventProps?.label === "string" ? eventProps.label : undefined
      }
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  event: AnalyticsEventName | (string & {});
  eventProps?: Record<string, unknown>;
};

export function TrackedAnchor({
  event,
  eventProps,
  onClick,
  ...props
}: TrackedAnchorProps) {
  return (
    <a
      {...props}
      data-analytics-action={event}
      data-analytics-value={
        typeof eventProps?.label === "string" ? eventProps.label : undefined
      }
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
