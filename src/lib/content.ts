import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { routing, type Locale } from "@/i18n/routing";

const contentRoot = path.join(process.cwd(), "content");

export type ExperienceLogo = {
  light: string;
  dark: string;
  rounded?: boolean;
};

export type Experience = {
  title: string;
  company: string;
  period: string;
  location: string;
  summary?: string;
  highlights?: string[];
  featured?: boolean;
  logo?: ExperienceLogo;
};

export type SkillItem = string | { name: string; logo: string };

export type SkillsData = {
  tools: { label: string; items: SkillItem[] };
  ux: { label: string; items: SkillItem[] };
  ui: { label: string; items: SkillItem[] };
  project: { label: string; items: SkillItem[] };
  soft: { label: string; items: SkillItem[] };
};

export type ProfileContent = {
  name: string;
  role: string;
  locations: string[];
  email: string;
  phone: string;
  phoneHref: string;
  linkedin: string;
  linkedinLabel: string;
  fiverr: string;
  malt: string;
  status: string;
  initials: string;
  bio: string;
};

export type HomeKeyword = {
  label: string;
  definition: string;
};

export type HomeContent = {
  status: string;
  title: string;
  titleMuted: string;
  intro: string;
  keywords: HomeKeyword[];
};

export type ContactPageContent = {
  title: string;
  intro: string;
};

export type ProductDesignerContent = {
  title: string;
  roleTitle: string;
  intro: string;
  pillars: { icon: string; title: string; description: string }[];
  experiencesLead: string;
  experiencesTitle: string;
  caseStudiesTitle: string;
  caseStudiesIntro: string;
  skillsTitle: string;
  skillsIntro: string;
  caseStudies: { title: string; status: string }[];
};

export type AboutContent = {
  title: string;
  designTitle: string;
  designIntro: string;
  businessTitle: string;
  businessIntro: string;
  extrasTitle: string;
  educationTitle: string;
  languagesTitle: string;
  interestsTitle: string;
  education: { title: string; school: string; period: string }[];
  languages: { name: string; level: string }[];
  interests: string[];
};

function resolveLocale(locale: string): Locale {
  return (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

function readMarkdown(locale: string, filename: string) {
  const resolved = resolveLocale(locale);
  const filePath = path.join(contentRoot, resolved, filename);
  const fallbackPath = path.join(
    contentRoot,
    routing.defaultLocale,
    filename
  );
  const raw = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : fs.readFileSync(fallbackPath, "utf8");
  // Frontmatter is JSON (see content/README.md) — force JSON to avoid YAML mis-parse
  return matter(raw, {
    engines: {
      json: {
        parse: (input: string) => JSON.parse(input) as object,
        stringify: (data: object) => JSON.stringify(data),
      },
    },
    language: "json",
  });
}

export function getProfile(locale: string): ProfileContent {
  const { data } = readMarkdown(locale, "profile.md");
  return data as ProfileContent;
}

export function getHome(locale: string): HomeContent {
  const { data } = readMarkdown(locale, "home.md");
  return data as HomeContent;
}

export function getContactPage(locale: string): ContactPageContent {
  const { data } = readMarkdown(locale, "contact.md");
  return data as ContactPageContent;
}

export function getProductDesigner(locale: string): ProductDesignerContent {
  const { data } = readMarkdown(locale, "product-designer.md");
  return data as ProductDesignerContent;
}

export function getAbout(locale: string): AboutContent {
  const { data } = readMarkdown(locale, "about.md");
  return data as AboutContent;
}

export function getExperiences(locale: string): {
  featured: Experience[];
  previous: Experience[];
} {
  const { data } = readMarkdown(locale, "experiences.md");
  return {
    featured: (data.featured ?? []) as Experience[],
    previous: (data.previous ?? []) as Experience[],
  };
}

export function getSkills(locale: string): SkillsData {
  const { data } = readMarkdown(locale, "skills.md");
  return data as SkillsData;
}
