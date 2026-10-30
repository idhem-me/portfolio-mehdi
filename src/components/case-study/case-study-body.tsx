"use client";

import { NativeButton } from "@/components/design-system/native-controls";

import { Fragment, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TERM_PATTERN = /\[\[([^\]]+)\]\]/g;

type CaseStudyBodyProps = {
  text: string;
  glossary?: Record<string, string>;
  className?: string;
};

function lookupDefinition(
  term: string,
  glossary: Record<string, string>,
): string | undefined {
  if (glossary[term]) return glossary[term];
  const lower = term.toLowerCase();
  const key = Object.keys(glossary).find((k) => k.toLowerCase() === lower);
  return key ? glossary[key] : undefined;
}

export function CaseStudyBody({
  text,
  glossary,
  className,
}: CaseStudyBodyProps) {
  const nodes: ReactNode[] = [];

  if (!glossary || Object.keys(glossary).length === 0) {
    return (
      <p
        className={cn(
          "max-w-prose text-base leading-relaxed text-muted-foreground",
          className,
        )}
      >
        {text}
      </p>
    );
  }

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(TERM_PATTERN.source, "g");

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const term = match[1]!;
    const definition = lookupDefinition(term, glossary);

    if (definition) {
      nodes.push(
        <Tooltip key={`${term}-${match.index}`}>
          <TooltipTrigger asChild>
            <NativeButton
              type="button"
              className="inline cursor-help rounded-[2px] bg-foreground/[0.06] px-0.5 font-medium text-foreground underline decoration-dotted decoration-foreground/35 underline-offset-[3px] transition-colors hover:bg-foreground/[0.1] hover:decoration-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {term}
            </NativeButton>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[min(20rem,calc(100vw-2rem))] px-3 py-2 text-left text-xs leading-relaxed"
          >
            {definition}
          </TooltipContent>
        </Tooltip>,
      );
    } else {
      nodes.push(term);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return (
    <p
      className={cn(
        "max-w-prose text-base leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {nodes.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </p>
  );
}
