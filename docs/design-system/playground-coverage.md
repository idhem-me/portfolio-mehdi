# Couverture des composants du Playground

Relevé statique du 7 novembre 2026, actualisé pour les nouvelles démos. Une ligne par module TSX sous `src/app`, `src/components` et `src/features`. Les modules peuvent contenir plusieurs composants. Les imports de primitives indiquent une adoption directe, sans préjuger des composants utilisés indirectement. Les feuilles CSS et modules TypeScript auxiliaires sont traités dans la revue et la liste des écarts.

Une composition absente peut être ajoutée comme scénario si elle définit une interaction ou un état réutilisable. Les pages de contenu restent des contextes d’usage. Les jeux masqués sont inventoriés uniquement dans le dépôt.

## Thème Fun

La composition `#fun` couvre la carte, le champ, les actions jaune et orange, le dialogue et leurs états de focus et de pression ; ses textes montrent la famille Bricolage Grotesque. Les démos `#button`, `#card`, `#input`, `#select`, `#switch`, `#sidebar`, `#dropdown-menu`, `#dialog` et `#sheet` montrent les primitives quand Fun est sélectionné. Les cartes des listes de réalisations et d’outils partagent les tokens de relief montrés à `#card`. Le comparatif expose aussi `--font-sans` dans chaque colonne et héberge les portails dans leur thème.

## Frutiger Aero et Liquid Glass

Les compositions `#frutiger-aero` et `#liquid-glass` montrent la toile du thème, les surfaces opaques, un formulaire et son dialogue d’aperçu. Les actions exposent les reflets et la pression. Les dialogues montrent la matière superposée dans leur thème local. Ces démos suivent les densités Auto, Desktop et Mobile et le réglage clair ou sombre du site.

## `src/app`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| (dashboard)/dashboard/layout.tsx | Absente · route ou structure de page | — |
| (dashboard)/dashboard/login/page.tsx | Absente · route ou structure de page | button, input |
| (dashboard)/dashboard/page.tsx | Absente · route ou structure de page | badge, button, card, skeleton, tabs |
| \[locale\]/(game)/boutique/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(game)/cards/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(game)/jeux/cards/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(game)/jeux/clicker-burger/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(game)/jeux/tetris/page.tsx | Hors vitrine publique · jeu masqué | — |
| \[locale\]/(gifts)/l/\[slug\]/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(gifts)/listes/\[slug\]/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(gifts)/listes/annuler/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/a-propos/page.tsx | Absente · route ou structure de page | badge, tabs |
| \[locale\]/(site)/backoffice/layout.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/backoffice/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/backoffice/sessions/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/contact/page.tsx | Absente · route ou structure de page | card, separator |
| \[locale\]/(site)/jeux/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/layout.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/color-generator/loading.tsx | Absente · route ou structure de page | skeleton |
| \[locale\]/(site)/outils/color-generator/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/compression-image/page.tsx | Absente · route ou structure de page | skeleton |
| \[locale\]/(site)/outils/conversion-image/page.tsx | Absente · route ou structure de page | skeleton |
| \[locale\]/(site)/outils/fusion-pdf/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/listes-cadeaux/\[id\]/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/listes-cadeaux/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/outils/qrcode/page.tsx | Absente · route ou structure de page | skeleton |
| \[locale\]/(site)/page.tsx | Absente · route ou structure de page | provider |
| \[locale\]/(site)/playground/catalog.tsx | Support du Playground | accordion, avatar, badge, button, card, date-range-select, dialog, dropdown-menu, input, provider, select, separator, sheet, skeleton, slider, switch, tabs, toast, tooltip |
| \[locale\]/(site)/playground/design-systems/page.tsx | Support du Playground | avatar, badge, button, dialog, dropdown-menu, input, native-controls, provider, skeleton, switch, tabs |
| \[locale\]/(site)/playground/layout.tsx | Support du Playground | — |
| \[locale\]/(site)/playground/local-components/page.tsx | Inventaire en développement local | badge, card |
| \[locale\]/(site)/playground/navigation.tsx | Support du Playground | — |
| \[locale\]/(site)/playground/page.tsx | Support du Playground | — |
| \[locale\]/(site)/product-designer/onewallet/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/product-designer/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/realisations/onewallet/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/realisations/page.tsx | Absente · route ou structure de page | badge |
| \[locale\]/(site)/realisations/tetris/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/(site)/realisations/trusted-interactions/page.tsx | Absente · route ou structure de page | — |
| \[locale\]/layout.tsx | Absente · route ou structure de page | — |
| layout.tsx | Absente · route ou structure de page | design-system, provider |

## `src/components/analytics`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| analytics-root.tsx | Absente · composition ou instrumentation du site | — |
| clarity.tsx | Absente · composition ou instrumentation du site | — |
| consent-banner.tsx | Absente · composition ou instrumentation du site | button |
| contact-ctas.tsx | Absente · composition ou instrumentation du site | button |
| home-ctas.tsx | Absente · composition ou instrumentation du site | button, provider |
| home-interaction-tracker.tsx | Absente · composition ou instrumentation du site | — |
| posthog-provider.tsx | Absente · composition ou instrumentation du site | — |
| tracked-link.tsx | Absente · composition ou instrumentation du site | — |
| tracking-provider.tsx | Absente · composition ou instrumentation du site | — |
| vercel.tsx | Absente · composition ou instrumentation du site | — |

## `src/components/creative`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| gaze-avatar.tsx | Absente · interaction propre à l’accueil | — |
| gravity-playground.tsx | Absente · interaction propre à l’accueil | button, native-controls, sidebar |
| paint-brush.tsx | Absente · interaction propre à l’accueil | — |
| paint-color-button.tsx | Démo dans PaintColor | — |
| paint-tool.tsx | PaintColor pour les boutons et la palette. Le dessin est testé sur l’accueil. | button |

## `src/components/design-system`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| button.tsx | Montré via Button · adaptateur interne | — |
| choice-menu.tsx | Démo dans Sidebar et usage dans le shell | dropdown-menu, sidebar |
| mehdi-button.tsx | Montré via Button sous Mehdi · implémentation interne | — |
| native-controls.tsx | Démo dans NativeControls, case native dans Textarea, NativeInput dans le comparateur | input |
| provider.tsx | Utilisé par la vitrine et le comparateur · infrastructure | — |
| sidebar-button.tsx | Démo indirecte dans Sidebar | sidebar |
| switcher.tsx | Démo dans Sidebar et usage dans le shell | — |

## `src/components/games`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| game-account-settings.tsx | Absente · contrôles partagés de jeu sans scénario | button |
| game-appearance-settings.tsx | Absente · contrôles partagés de jeu sans scénario | button |
| game-feel-settings.tsx | Absente · contrôles partagés de jeu sans scénario | badge, button, native-controls |
| game-settings/GameSettingsPanel.tsx | Démo générique du conteneur dans SettingsModal | settings-modal |
| game-settings/primitives/SettingsButton.tsx | Démo fictive dans SettingsModal | button |
| game-settings/primitives/SettingsCard.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/primitives/SettingsSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/primitives/SettingsSegmented.tsx | Démo fictive dans SettingsModal | button |
| game-settings/primitives/SettingsSlider.tsx | Démo fictive dans SettingsModal | native-controls |
| game-settings/primitives/SettingsToggleRow.tsx | Démo fictive dans SettingsModal | badge |
| game-settings/sections/AboutSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/sections/AccountSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/sections/AppearanceSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/sections/AudioSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings/sections/HapticsSection.tsx | Absente · contrôles partagés de jeu sans scénario | — |
| game-settings-outreach.tsx | Absente · contrôles partagés de jeu sans scénario | button, dialog, input, native-controls |

## `src/components/layout`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| app-shell.tsx | Absente · composition du shell | provider, sidebar, tooltip |
| app-sidebar.tsx | Absente · composition du shell | provider, sidebar, sidebar-button, switcher |
| copy-email-button.tsx | Absente · composition du shell | button |
| document-locale.tsx | Indirecte · infrastructure du document | — |
| language-switcher.tsx | Absente · composition du shell | choice-menu |
| mobile-brand-bar.tsx | Absente · composition du shell | avatar, sidebar, sidebar-button |
| mobile-menu-button.tsx | Absente · composition du shell | button, provider, sidebar |
| section-navigation.tsx | Absente · composition du shell | provider, sidebar, sidebar-button |
| theme-provider.tsx | Indirecte · infrastructure du document | — |
| theme-toggle.tsx | Absente · composition du shell | sidebar, sidebar-button |

## `src/components/media`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| browser-window.tsx | Démo dans le catalogue | — |
| safe-svg.tsx | Démo dans le catalogue | — |

## `src/components/ui`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| accordion.tsx | Démo dans le catalogue · états à vérifier | — |
| avatar.tsx | Démo dans le catalogue · états à vérifier | provider |
| badge.tsx | Démo dans le catalogue · états à vérifier | provider |
| button.tsx | Démo dans le catalogue · états à vérifier | button, mehdi-button |
| card.tsx | Démo dans le catalogue · états à vérifier | — |
| date-range-select.tsx | Démo dans le catalogue · états à vérifier | button, dropdown-menu, select |
| dialog.tsx | Démo dans le catalogue · états à vérifier | provider |
| dropdown-menu.tsx | Démo dans le catalogue · états à vérifier | provider |
| input.tsx | Démo dans le catalogue · états à vérifier | provider |
| scoped-theme.tsx | Démo dans ScopedTheme | — |
| select.tsx | Démo dans le catalogue · états à vérifier | provider |
| separator.tsx | Démo dans le catalogue · états à vérifier | — |
| settings-modal.tsx | Démo dans SettingsModal | button, dialog |
| sheet.tsx | Démo dans le catalogue · états à vérifier | button |
| sidebar.tsx | Démo interactive dans Sidebar | button, input, separator, sheet, skeleton, tooltip |
| skeleton.tsx | Démo dans le catalogue · états à vérifier | provider |
| slider.tsx | Démo dans le catalogue · états à vérifier | — |
| switch.tsx | Démo dans le catalogue · états à vérifier | provider |
| table.tsx | Démo dans Table | button |
| tabs.tsx | Démo dans le catalogue · états à vérifier | provider |
| textarea.tsx | Label, aide, erreur et valeur multiligne dans Textarea | — |
| toast.tsx | Démo dans le catalogue · états à vérifier | native-controls |
| tooltip.tsx | Démo dans le catalogue · états à vérifier | — |

## `src/features/account`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| provider.tsx | Absente · infrastructure de fonctionnalité | — |
| ui/google-sign-in.tsx | Absente · composition de fonctionnalité | button |
| ui/identity-selector.tsx | Absente · composition de fonctionnalité | avatar, button, dropdown-menu, input, native-controls, sheet |
| ui/profile-button.tsx | Absente · composition de fonctionnalité | button |
| ui/profile-help.tsx | Absente · composition de fonctionnalité | button, dropdown-menu |

## `src/features/backoffice`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/dashboard.tsx | Absente · composition de fonctionnalité | card, select |
| ui/sessions.tsx | Tri et ligne interactive dans Table | button, date-range-select, select, sheet, table |
| ui/shell.tsx | Absente · composition de fonctionnalité | — |

## `src/features/cards`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| account/save-choice.tsx | Hors vitrine publique · jeu masqué | button, dialog |
| avatar/personalization.tsx | Hors vitrine publique · jeu masqué | button, toast |
| avatar/player-avatar.tsx | Hors vitrine publique · jeu masqué | — |
| client.tsx | Hors vitrine publique · jeu masqué | — |
| shop/shop.tsx | Hors vitrine publique · jeu masqué | button, card, dialog, tabs, toast |
| ui/ambient-backdrop.tsx | Hors vitrine publique · jeu masqué | — |
| ui/app.tsx | Hors vitrine publique · jeu masqué | badge, button, dropdown-menu, native-controls, scoped-theme, sheet, tabs, toast |
| ui/card-face.tsx | Hors vitrine publique · jeu masqué | badge |
| ui/cloud-save-status.tsx | Hors vitrine publique · jeu masqué | button, dialog |
| ui/collection-screen.tsx | Hors vitrine publique · jeu masqué | badge, button, dialog, input, native-controls, sheet, switch |
| ui/dev-preview.tsx | Hors vitrine publique · jeu masqué | button, dropdown-menu |
| ui/local-save-notice.tsx | Hors vitrine publique · jeu masqué | button |
| ui/opening/booster-artwork.tsx | Hors vitrine publique · jeu masqué | — |
| ui/opening/booster-cut-stage.tsx | Hors vitrine publique · jeu masqué | — |
| ui/opening/booster-selector.tsx | Hors vitrine publique · jeu masqué | badge, button |
| ui/opening/card-stack.tsx | Hors vitrine publique · jeu masqué | — |
| ui/opening/opening-scene.tsx | Hors vitrine publique · jeu masqué | badge, button, dialog, scoped-theme, tabs |
| ui/opening/quantity-picker.tsx | Hors vitrine publique · jeu masqué | button, input, sheet |
| ui/opening/special-reveal.tsx | Hors vitrine publique · jeu masqué | — |
| ui/opening-scene.tsx | Hors vitrine publique · jeu masqué | — |
| ui/profile-screen.tsx | Hors vitrine publique · jeu masqué | badge, button, dialog, tabs |
| ui/rarity-icons.tsx | Hors vitrine publique · jeu masqué | — |
| ui/reset-collection.tsx | Hors vitrine publique · jeu masqué | button, dialog |

## `src/features/case-study`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/case-study-body.tsx | Glossaire dans CaseStudy · exception pour les termes en ligne | native-controls, tooltip |
| ui/case-study-slider.tsx | Navigation tactile et clavier dans CaseStudy | button, native-controls |
| ui/case-study-story.tsx | Absente · composition de fonctionnalité | button, separator |
| ui/image-lightbox.tsx | Zoom, déplacement et focus dans CaseStudy | button, dialog, native-controls |
| ui/scroll-reveal.tsx | Absente · composition de fonctionnalité | — |
| ui/theme-image.tsx | Paire de visuels fictifs dans CaseStudy | button |

## `src/features/clicker-burger`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| App.tsx | Absente · composition de fonctionnalité | badge, button, native-controls, tabs |
| client.tsx | Absente · composition de fonctionnalité | provider |
| components/LevelUp.tsx | Absente · composition de fonctionnalité | button, dialog |
| components/Sheet.tsx | Absente · composition de fonctionnalité | button, sheet |

## `src/features/color-generator`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/CodeExport.tsx | Absente · composition de fonctionnalité | button, tabs |
| ui/ColorGenerator.tsx | Absente · composition de fonctionnalité | button |
| ui/ColorPicker.tsx | Démo dans ColorPicker | button, native-controls |
| ui/ControlPanel.tsx | Absente · composition de fonctionnalité | button, card, input, select, slider |
| ui/SwatchesGrid.tsx | Couleurs, copie et focus dans Swatches | button, input, native-controls |

## `src/features/cv`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/company-logo.tsx | Absente · composition de fonctionnalité | — |
| ui/experience-card.tsx | Absente · composition de fonctionnalité | badge, card |
| ui/product-designer-content.tsx | Absente · composition de fonctionnalité | separator |
| ui/role-pillars.tsx | Absente · composition de fonctionnalité | — |
| ui/skills-tabs.tsx | Absente · composition de fonctionnalité | badge, tabs |

## `src/features/gift-lists`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/creator.tsx | Bouton avatar et menu fictifs dans GiftActions | avatar, badge, button, dropdown-menu |
| ui/forms.tsx | Cases et texte multiligne dans Textarea | button, dialog, input, native-controls, select, switch |
| ui/public.tsx | Lien d’action fictif dans GiftActions | accordion, badge, button, dialog, input, toast |
| ui/shared.tsx | Zone multiligne dans Textarea | badge, button, dialog, dropdown-menu, input, textarea |

## `src/features/image-compression`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/image-compressor.tsx | Absente · composition de fonctionnalité | badge, button, card, input, native-controls, select |

## `src/features/image-conversion`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/image-converter.tsx | Absente · composition de fonctionnalité | badge, button, card, native-controls, select, slider |

## `src/features/pdf`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| pdf-merger.tsx | Absente · composition de fonctionnalité | button, native-controls |

## `src/features/qr-code`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| ui/qr-code-generator.tsx | Absente · composition de fonctionnalité | accordion, button, card, input, select, slider, switch |

## `src/features/tetris`

| Module | Couverture directe et motif | Primitives/adaptateurs importés |
| --- | --- | --- |
| feel/line-celebration.tsx | Hors vitrine publique · jeu masqué | — |
| render/board.tsx | Hors vitrine publique · jeu masqué | — |
| ui/game-over.tsx | Hors vitrine publique · jeu masqué | button, card |
| ui/gameplay-background.tsx | Hors vitrine publique · jeu masqué | — |
| ui/google-sign-in.tsx | Hors vitrine publique · jeu masqué | — |
| ui/identity-selector.tsx | Hors vitrine publique · jeu masqué | — |
| ui/leaderboard.tsx | Hors vitrine publique · jeu masqué | avatar, button, sheet |
| ui/piece-shape.tsx | Hors vitrine publique · jeu masqué | — |
| ui/player-identity.tsx | Hors vitrine publique · jeu masqué | — |
| ui/player-profile.tsx | Hors vitrine publique · jeu masqué | — |
| ui/tetris-cover.tsx | Hors vitrine publique · jeu masqué | — |
| ui/tetris.tsx | Hors vitrine publique · jeu masqué | badge, button, card, native-controls, provider, separator, sheet |
