import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  ContactLinkedInButton,
  ContactMailtoButton,
  ContactPhoneLink,
} from "@/components/analytics/contact-ctas";
import { CopyEmailButton } from "@/components/layout/copy-email-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { profile } from "@/data/resume";

export const metadata: Metadata = {
  title: "Me contacter",
};

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-20 text-lg">
          {/* Photo : déposer `public/avatar.jpg` puis activer HAS_AVATAR dans app-sidebar */}
          <AvatarFallback className="bg-muted text-xl font-medium text-muted-foreground">
            {profile.initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Me contacter
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            Une idée de projet, une opportunité, ou simplement envie d’échanger
            sur le design produit ? Écrivez-moi.
          </p>
        </div>
      </header>

      <Separator className="my-10" />

      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4 text-muted-foreground" aria-hidden />
              Email
            </p>
            <CopyEmailButton />
            <ContactMailtoButton />
          </div>

          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Phone className="size-4 text-muted-foreground" aria-hidden />
              Téléphone
            </p>
            <ContactPhoneLink />
          </div>

          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <LinkedInIcon className="size-4 text-muted-foreground" />
              LinkedIn
            </p>
            <ContactLinkedInButton />
          </div>

          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 text-muted-foreground" aria-hidden />
              Localisation
            </p>
            <p className="text-sm text-muted-foreground">
              {profile.locations.join(" / ")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
