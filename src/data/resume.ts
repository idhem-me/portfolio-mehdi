export const profile = {
  name: "Mehdi Monteyremard",
  role: "Senior Product Designer",
  locations: ["Romans-sur-Isère", "Lyon"] as const,
  email: "mmonteyremard@gmail.com",
  phone: "+33 6 69 35 02 81",
  phoneHref: "tel:+33669350281",
  linkedin: "https://www.linkedin.com/in/mehdi-monteyremard/",
  linkedinLabel: "linkedin.com/in/mehdi-monteyremard/",
  status: "En poste chez Worldline",
  initials: "MM",
  bio: "Passionné par l’expérience utilisateur et la conception centrée sur l’humain. Senior Product Designer chez Worldline, je conçois des solutions numériques intuitives, accessibles (RGAA) et scalables, en collab étroite avec produit et tech.",
} as const;

export type Experience = {
  title: string;
  company: string;
  period: string;
  location: string;
  summary?: string;
  highlights?: string[];
  featured?: boolean;
};

export const featuredExperiences: Experience[] = [
  {
    title: "Senior Product Designer",
    company: "Worldline | Financial Services",
    period: "Oct. 2024 – Aujourd'hui",
    location: "Lyon",
    summary:
      "Contribution UX et UI sur plusieurs produits digitaux (Digital Services).",
    highlights: [
      "Refonte Trusted Interactions (1M messages/jour) : audit, ateliers d’idéation, collab PM/PO/Delivery, prototypage avancé, design thinking",
      "Création de dashboards, maquettes high-fidelity et apps mobiles",
      "Construction d’un UI Kit et gestion d’un Design System",
      "Supervision de l’intégration design en prod",
      "Développement de démos interactives Open Banking (Figma)",
    ],
    featured: true,
  },
  {
    title: "Product & Web Designer Indépendant",
    company: "SARL NFMM | Freelance",
    period: "Mai 2019 – Aujourd'hui",
    location: "Romans-sur-Isère",
    summary: "Création et gestion d'une agence web puis micro-entrepreneur.",
    highlights: [
      "Audits UX et UI",
      "Conception de sites web",
      "Chartes graphiques",
      "Gestion de projets",
    ],
    featured: true,
  },
];

export const previousExperiences: Experience[] = [
  {
    title: "Business Developer",
    company: "Sasytex",
    period: "Sep. 2018 – Sep. 2021",
    location: "Saint-Étienne",
  },
  {
    title: "Chargé de recouvrement Retail",
    company: "Accenture",
    period: "Jan. 2018 – Août 2018",
    location: "Dublin, Irlande",
  },
  {
    title: "Commercial",
    company: "Malfini",
    period: "Mai 2016 – Août 2016",
    location: "République Tchèque",
  },
  {
    title: "Vendeur",
    company: "Lili Croustille",
    period: "2012 – 2015",
    location: "France",
  },
];

export type SkillItem = string | { name: string; logo: string };

export const skills = {
  tools: {
    label: "Outils",
    items: [
      { name: "Figma", logo: "/img/logos/figma.svg" },
      { name: "Confluence", logo: "/img/logos/confluence.svg" },
      { name: "Jira", logo: "/img/logos/jira.svg" },
      { name: "Cursor", logo: "/img/logos/cursor.svg" },
    ] as const satisfies readonly SkillItem[],
  },
  ux: {
    label: "UX Design",
    items: [
      "Recherche utilisateur",
      "Tests utilisateurs",
      "Audit",
      "Architecture de l'information",
      "Parcours utilisateur",
      "Design Thinking",
    ],
  },
  ui: {
    label: "UI Design",
    items: [
      "Zoning",
      "Wireframe",
      "Prototypage",
      "Accessibilité RGAA",
      "Design System",
      "Sociologie des usages",
      "Psychologie Cognitive",
      "Design d'interaction",
      "Lois de Gestalt",
      "Critères de Bastien et Scapin",
      "Vibe Coding",
    ],
  },
  project: {
    label: "Gestion de projets",
    items: [
      "Stratégie produit",
      "Vision",
      "Analyse de données",
      "Spécification",
      "Étude de marché et Veille",
      "Agile",
    ],
  },
  soft: {
    label: "Soft skills",
    items: [
      "Esprit d'équipe",
      "Adaptabilité",
      "Autonomie",
      "Sens du détail",
      "Empathie",
      "Orientation client",
      "Force de proposition",
      "Communication",
    ],
  },
} as const;

export const education = [
  {
    title: "Bac+5 UX Design",
    school: "ISCOD",
    period: "2024–2026",
  },
  {
    title: "Bac+5 Commerce International",
    school: "Collège de Paris",
    period: "2019–2021",
  },
] as const;

export const languages = [
  { name: "Français", level: "Natif" },
  { name: "Anglais", level: "C1" },
  { name: "Espagnol", level: "B1" },
] as const;

export const interests = [
  "Intelligence Artificielle",
  "Football",
  "Voyages & Cultures",
] as const;

export const caseStudiesSoon = [
  { title: "Trusted Interactions", status: "Bientôt" },
  { title: "Open Banking", status: "Bientôt" },
  { title: "Design System", status: "Bientôt" },
] as const;
