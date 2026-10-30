---
{
  "slug": "trusted-interactions",
  "title": "Trusted Interactions",
  "tagline": "Refondre une messagerie bancaire pour clarifier le traitement des conversations et guider les conseillers.",
  "backLabel": "Réalisations",
  "meta": {
    "role": "Product design",
    "context": "Worldline · Banques",
    "status": "Refonte"
  },
  "glossary": {
    "UX": "User Experience : qualité de l’expérience vécue par l’utilisateur lorsqu’il utilise un produit.",
    "triangule": "Croiser plusieurs sources (données, entretiens, observation) pour compenser l’absence d’accès direct aux utilisateurs.",
    "SUS": "System Usability Scale : questionnaire standardisé qui note la facilité d’usage sur 100.",
    "verbatims": "Citations exactes des utilisateurs, utilisées pour illustrer un frein ou un besoin.",
    "Surcharge cognitive": "Excès d’informations ou de choix qui fatigue et ralentit la prise de décision.",
    "affordances": "Indices visuels ou interactifs qui suggèrent comment utiliser un élément d’interface.",
    "Persona": "Profil fictif représentatif d’un type d’utilisateur, construit à partir de la recherche.",
    "progressive disclosure": "Montrer d’abord l’essentiel, puis dévoiler le détail à la demande pour réduire la complexité.",
    "Guerrilla testing": "Tests utilisateurs rapides, peu coûteux, menés hors labo auprès de profils variés.",
    "A/B tests": "Comparer deux versions d’une interface pour mesurer laquelle performe mieux.",
    "Arborescence": "Organisation des pages et des rubriques d’un produit, qui structure la navigation.",
    "PrimeNG": "Librairie de composants UI pour Angular, utilisée comme base technique de l’interface.",
    "WCAG 2.1 AA": "Référentiel international d’accessibilité web ; le niveau AA est le seuil le plus courant en production.",
    "happy path": "Scénario nominal où tout se passe bien, sans erreur ni cas limite.",
    "Gabarits": "Structures d’écran réutilisables (liste, détail, formulaire…) qui garantissent la cohérence."
  },
  "sections": [
    {
      "id": "hero",
      "title": "Une messagerie sous contrainte",
      "body": [
        "Trusted Interactions, c’est la messagerie sécurisée des banques. Créée en 2015. Des centaines de milliers de messages, des dizaines de milliers d’agents.",
        "Plus de trente développeurs, aucun designer dédié : le projet démarre dans un environnement technique contraint, sans pratique [[UX]] structurée.",
        "Chez Worldline, mon rôle : intégrer le Design sans tout casser — transformer l’audit en produit clair, testé, industrialisable."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/showcase-light.png",
          "alt": "La liste de conversations, avant et après la refonte",
          "caption": "La liste de conversations, avant et après la refonte",
          "theme": "light"
        },
        {
          "src": "/img/photos/trusted-interactions/showcase-dark.png",
          "alt": "La liste de conversations, avant et après la refonte",
          "caption": "La liste de conversations, avant et après la refonte",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "research",
      "title": "Diagnostiquer sans accès clients",
      "body": [
        "Pas d’accès aux utilisateurs finaux. On [[triangule]] : quantitatif, qualitatif, observation interne.",
        "[[SUS]] à 13,2/100. 71 % de [[verbatims]] négatifs. [[Surcharge cognitive]], absence de hiérarchie, [[affordances]] floues.",
        "Feuille de route : clarté cognitive, cohérence, autonomie des conseillers."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/conv-debut-light.png",
          "alt": "L’interface initiale : une liste dense, difficile à parcourir",
          "caption": "L’interface initiale : une liste dense, difficile à parcourir",
          "theme": "light"
        },
        {
          "src": "/img/photos/trusted-interactions/conv-debut-dark.png",
          "alt": "L’interface initiale : une liste dense, difficile à parcourir",
          "caption": "L’interface initiale : une liste dense, difficile à parcourir",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "journeys",
      "title": "Cadrer l’usage",
      "body": [
        "[[Persona]] Thomas : conseiller bancaire, pression, peur de l’erreur critique. Il veut de la clarté et du guidage.",
        "Parcours actuel pour traiter un message : 12 étapes, 6 à 10 minutes. Cible : 7 étapes, 3 à 4 minutes."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/journey-light.png",
          "alt": "Le parcours du conseiller et les points de friction",
          "caption": "Le parcours du conseiller et les points de friction",
          "theme": "light"
        },
        {
          "src": "/img/photos/trusted-interactions/journey-dark.png",
          "alt": "Le parcours du conseiller et les points de friction",
          "caption": "Le parcours du conseiller et les points de friction",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "prototypes",
      "title": "Rendre palpable",
      "body": [
        "Un prototype relie les écrans du parcours cible pour rendre les enchaînements et les décisions visibles.",
        "Hiérarchie visuelle, [[progressive disclosure]], feedback immédiat. On voit les frictions avant d’écrire une ligne de code métier."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/maquette.png",
          "alt": "Les écrans et les enchaînements du prototype",
          "caption": "Les écrans et les enchaînements du prototype",
          "theme": "any"
        }
      ]
    },
    {
      "id": "user-tests",
      "title": "Confronter au réel",
      "body": [
        "[[Guerrilla testing]]. Sept missions. Profils variés.",
        "Parcours validé par tous. Note qualitative 4,6/5. On cartographie aussi les frictions qui restent."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/resultats-light.png",
          "alt": "Synthèse des retours et résultats des tests",
          "caption": "Synthèse des retours et résultats des tests",
          "theme": "light"
        },
        {
          "src": "/img/photos/trusted-interactions/resultats-dark.png",
          "alt": "Synthèse des retours et résultats des tests",
          "caption": "Synthèse des retours et résultats des tests",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "iterate",
      "title": "Écouter, ajuster",
      "body": [
        "Recommandations côté design : courbe d’apprentissage, espace de lecture, sessions d’[[A/B tests]].",
        "Côté développement : accessibilité, flexibilité du layout."
      ]
    },
    {
      "id": "industrialize",
      "title": "Industrialiser",
      "body": [
        "[[Arborescence]] flat : l’essentiel à deux ou trois clics. [[Gabarits]] unifiés. UI bâtie sur la librairie de composants [[PrimeNG]].",
        "Specs Figma, responsive, accessibilité [[WCAG 2.1 AA]]. Le design ne s’arrête plus au [[happy path]]."
      ],
      "images": [
        {
          "src": "/img/photos/trusted-interactions/conv-fi-light.png",
          "alt": "La liste de conversations après la refonte",
          "caption": "La liste de conversations après la refonte",
          "theme": "light"
        },
        {
          "src": "/img/photos/trusted-interactions/conv-fi-dark.png",
          "alt": "La liste de conversations après la refonte",
          "caption": "La liste de conversations après la refonte",
          "theme": "dark"
        }
      ]
    },
    {
      "id": "today",
      "title": "Aujourd’hui",
      "body": [
        "Livrables posés. Passation faite. Maturité [[UX]] du pôle améliorée."
      ],
      "cta": {
        "label": "Retour aux réalisations",
        "href": "/realisations",
        "variant": "secondary",
        "size": "default",
        "align": "center"
      }
    }
  ],
  "themeToggle": {
    "light": "Mode clair",
    "dark": "Mode sombre"
  }
}
---
