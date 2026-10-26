---
{
  "slug": "onewallet",
  "title": "OneWallet",
  "tagline": "De l’hypothèse à un module de paiement que chaque banque européenne peut s’approprier.",
  "backLabel": "Réalisations",
  "meta": {
    "role": "Product design",
    "context": "Worldline · Banques européennes",
    "status": "En développement"
  },
  "themeToggle": {
    "light": "Mode clair",
    "dark": "Mode sombre"
  },
  "glossary": {
    "HCE": "Host Card Emulation : technologie qui permet de payer sans contact depuis le téléphone, sans carte physique dédiée.",
    "White-label": "Solution livrée sans marque propriétaire, que chaque banque peut habiller à ses couleurs.",
    "moodboard": "Planche d’inspiration visuelle pour aligner l’équipe sur le ton, le style et les références.",
    "Wireframes": "Schémas d’écrans basse fidélité pour valider la structure et les parcours avant le design détaillé.",
    "flows": "Enchaînements d’écrans qui décrivent un parcours utilisateur de bout en bout.",
    "Prototypes": "Maquettes interactives permettant de simuler le produit avant le développement.",
    "frictions": "Points du parcours où l’utilisateur hésite, se trompe ou abandonne.",
    "design system": "Bibliothèque de composants, règles et tokens partagés pour concevoir et développer de façon cohérente.",
    "happy path": "Scénario nominal où tout se passe bien, sans erreur ni cas limite.",
    "edge cases": "Cas limites ou exceptions (erreurs, états vides, droits insuffisants) à prévoir hors du parcours idéal."
  },
  "sections": [
    {
      "id": "hero",
      "title": "Un wallet modulaire",
      "body": [
        "Les banques européennes veulent du paiement sans contact natif : [[HCE]], comme Apple Pay, et Wero.",
        "OneWallet est le module qui s’insère dans leur app. [[White-label]]. Extensible. Pensé pour demain : d’autres technologies, d’autres parcours.",
        "Chez Worldline, mon rôle : transformer cet enjeu technique en produit clair, testé, prêt à industrialiser."
      ],
      "images": [
        {
          "src": "/img/photos/onewallet/showcase-light.png",
          "alt": "Showcase OneWallet en mode clair",
          "theme": "light"
        },
        {
          "src": "/img/photos/onewallet/showcase-dark.png",
          "alt": "Showcase OneWallet en mode sombre",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "research",
      "title": "Comprendre le terrain",
      "body": [
        "Avant de dessiner, on cartographie.",
        "Analyse de la concurrence, [[moodboard]], définition des objectifs. Qui fait quoi. Ce qui manque. Ce qu’on doit réussir.",
        "Le cadre est posé. L’équipe sait où on va."
      ],
      "images": [
        {
          "src": "/img/photos/onewallet/cadrage.png",
          "alt": "Cadrage OneWallet : concurrence, moodboard et objectifs",
          "caption": "Cadrage",
          "theme": "any"
        }
      ]
    },
    {
      "id": "wireframes",
      "title": "Dessiner les parcours",
      "body": [
        "[[Wireframes]] des [[flows]] clés : activation, paiement, réglages. On aligne produit, tech et design sur le même chemin.",
        "Si le parcours tient ici, il tiendra plus loin."
      ],
      "images": [
        {
          "src": "/img/photos/onewallet/wireframes.png",
          "alt": "Wireframes des parcours OneWallet",
          "theme": "any"
        }
      ]
    },
    {
      "id": "prototypes",
      "title": "Rendre palpable",
      "body": [
        "Scénarios. [[Prototypes]] cliquables.",
        "L’idée devient quelque chose qu’on peut tenir en main. On voit les [[frictions]] avant d’écrire une ligne de code métier."
      ],
      "images": [
        {
          "src": "/img/photos/onewallet/prototypes.png",
          "alt": "Prototypes et scénarios OneWallet",
          "theme": "any"
        }
      ]
    },
    {
      "id": "user-tests",
      "title": "Confronter au réel",
      "body": [
        "Première vague de tests utilisateurs.",
        "On observe. On enregistre. On note ce qui bloque, ce qui surprend, ce qui passe tout seul.",
        "Les hypothèses rencontrent le terrain."
      ],
      "images": [
        {
          "src": "/img/photos/onewallet/user-test.png",
          "alt": "Session de test utilisateur OneWallet",
          "theme": "any",
          "caption": "Tests en conditions réelles"
        },
        {
          "src": "/img/photos/onewallet/record-people.png",
          "alt": "Enregistrement des participants aux tests",
          "theme": "any"
        },
        {
          "src": "/img/photos/onewallet/record-screen.png",
          "alt": "Capture d’écran pendant un test utilisateur",
          "theme": "any"
        }
      ]
    },
    {
      "id": "iterate",
      "title": "Écouter, ajuster",
      "body": [
        "Retour sur les retours.",
        "Amont : ce qui coinçait. Aval : ce qu’on a corrigé.",
        "Nouveaux prototypes. Nouveaux tests. Le produit se resserre."
      ],
      "layout": "before-after",
      "images": [
        {
          "src": "/img/photos/onewallet/reponses-amont.png",
          "alt": "Synthèse des retours utilisateurs avant itération",
          "theme": "any",
          "caption": "Avant"
        },
        {
          "src": "/img/photos/onewallet/reponses-aval.png",
          "alt": "Synthèse des retours utilisateurs après itération",
          "theme": "any",
          "caption": "Après"
        }
      ]
    },
    {
      "id": "industrialize",
      "title": "Industrialiser",
      "body": [
        "Migration du [[design system]]. Réflexion [[White-label]] : une base, plusieurs marques.",
        "Specs Figma pour les développeurs, puis les écrans clés : portefeuille, activités, paiement sans contact, paramètres.",
        "Le design ne s’arrête plus au [[happy path]]."
      ],
      "layout": "industrialize",
      "images": [
        {
          "src": "/img/photos/onewallet/figma-board.png",
          "alt": "Board Figma OneWallet pour le handoff développeurs",
          "theme": "any",
          "caption": "Specs & handoff"
        },
        {
          "src": "/img/photos/onewallet/presentation-home-light.png",
          "alt": "Portefeuille OneWallet en mode clair",
          "theme": "light",
          "caption": "Portefeuille"
        },
        {
          "src": "/img/photos/onewallet/presentation-home-dark.png",
          "alt": "Portefeuille OneWallet en mode sombre",
          "theme": "dark",
          "caption": "Portefeuille"
        },
        {
          "src": "/img/photos/onewallet/presentation-list-light.png",
          "alt": "Activités OneWallet en mode clair",
          "theme": "light",
          "caption": "Activités"
        },
        {
          "src": "/img/photos/onewallet/presentation-list-dark.png",
          "alt": "Activités OneWallet en mode sombre",
          "theme": "dark",
          "caption": "Activités"
        },
        {
          "src": "/img/photos/onewallet/presentation-transac-light.png",
          "alt": "Paiement sans contact OneWallet en mode clair",
          "theme": "light",
          "caption": "Paiement sans contact"
        },
        {
          "src": "/img/photos/onewallet/presentation-transac-dark.png",
          "alt": "Paiement sans contact OneWallet en mode sombre",
          "theme": "dark",
          "caption": "Paiement sans contact"
        },
        {
          "src": "/img/photos/onewallet/presentation-settings-light.png",
          "alt": "Paramètres OneWallet en mode clair",
          "theme": "light",
          "caption": "Paramètres"
        },
        {
          "src": "/img/photos/onewallet/presentation-settings-dark.png",
          "alt": "Paramètres OneWallet en mode sombre",
          "theme": "dark",
          "caption": "Paramètres"
        }
      ]
    },
    {
      "id": "today",
      "title": "Aujourd’hui",
      "body": [
        "OneWallet est en cours de développement. Le cadre est posé, les parcours sont validés, les [[edge cases]] sont documentés.",
        "Ce que j’apporte sur ce type de sujet : une méthode claire (cadrer, prototyper, tester, itérer), une culture produit/tech, et le souci d’industrialiser sans perdre l’usage.",
        "Si vous construisez un produit digital, un [[design system]] ou un parcours complexe, on peut en parler."
      ],
      "cta": {
        "label": "Discutons ensemble",
        "href": "/contact"
      }
    }
  ]
}
---
