# illustrator-ranger-en-grille

**RangerEnGrille.jsx** — range les objets sélectionnés dans Adobe Illustrator en une grille propre (colonnes × rangées), avec gouttières, alignement dans la cellule et ordre de tri (ExtendScript, FR/EN).
*Arranges the selected Adobe Illustrator objects into a tidy grid (columns × rows) with gutters, in-cell alignment and sort order.*

> **Statut : non testé dans Illustrator.** La syntaxe ES3 a été vérifiée automatiquement (acorn) et le calcul de la grille a été vérifié sur des objets simulés, mais le script n'a pas encore été exécuté dans Illustrator. Travaillez sur une **copie** de votre fichier.
> *Status: not tested in Illustrator. ES3 syntax checked (acorn) and grid math checked on mock objects only. Work on a copy of your file.*

## Pourquoi / Why

Planches d'icônes, pictogrammes, logos clients, vignettes produits, étiquettes : on passe beaucoup de temps à aligner des dizaines d'objets en grille. *Aligner > Répartir* d'Illustrator ne travaille que sur une ligne ou une colonne à la fois, et *Objet > Répétition > Grille* duplique un seul objet au lieu de ranger des objets différents. Ce script range **des objets existants et différents** en une seule passe.

| Fonction | Détail |
|---|---|
| Nombre de colonnes / rangées | Fixé, ou automatique (grille la plus carrée possible) |
| Sens de remplissage | Rangée par rangée ou colonne par colonne |
| Ordre | Position actuelle (ordre de lecture), ordre de sélection/empilement, nom (tri naturel : « 2 » avant « 10 »), largeur, hauteur, surface, aléatoire |
| Gouttières | Horizontale et verticale, en mm, cm, pt, px ou in |
| Cellules | Uniformes (taille du plus grand objet), ajustées par colonne/rangée, ou taille fixe saisie |
| Alignement | Gauche/centre/droite × haut/milieu/bas dans chaque cellule |
| Limites | Avec ou sans l'épaisseur des contours ; groupes masqués mesurés sur leur masque |
| Point de départ | Coin haut-gauche de la sélection, ou du plan de travail actif avec marge |
| Grouper | Option pour grouper le résultat, empilé dans l'ordre de la grille |
| Analyser | Affiche la grille obtenue (colonnes × rangées, taille totale) **sans** rien déplacer |

## Installation

- **Ponctuelle** : dans Illustrator, *Fichier > Scripts > Autre script…* (Ctrl+F12 / Cmd+F12), puis choisir `RangerEnGrille.jsx`.
- **Permanente** : copier `RangerEnGrille.jsx` dans le dossier `Presets/<langue>/Scripts` d'Illustrator, puis redémarrer Illustrator :
  - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\fr_FR\Scripts`
  - macOS : `/Applications/Adobe Illustrator <version>/Presets.localized/fr_FR/Scripts`

  Le script apparaît alors dans *Fichier > Scripts*.

## Utilisation / Usage

1. Ouvrez un document et sélectionnez au moins deux objets avec l'outil Sélection (un message s'affiche si aucun document n'est ouvert ou si rien n'est sélectionné).
2. Lancez le script, réglez colonnes/rangées, ordre, gouttières, cellules, alignement et point de départ.
3. **Analyser** : affiche la taille de la grille et le nombre d'objets qui bougeront, sans modifier le document.
4. **Ranger** : déplace les objets (leurs motifs et dégradés suivent). Ctrl+Z / Cmd+Z pour annuler ; selon la version d'Illustrator, plusieurs Ctrl+Z peuvent être nécessaires.

Un groupe sélectionné est traité comme un seul objet. L'interface est en français si Illustrator est en français, sinon en anglais.

## Version ciblée / Target

Illustrator CC 2018 et versions plus récentes (ExtendScript ES3, ScriptUI). Pas d'UXP nécessaire.

## Limites connues / Known limits

- Non testé dans Illustrator : signalez tout problème dans les *Issues*.
- Les objets ne sont jamais redimensionnés ; en mode *Taille fixe*, un objet plus grand que la cellule déborde (le script le signale).
- Les limites visibles d'Illustrator n'incluent pas toujours les effets (ombres portées, etc.).
- Avec l'option *Grouper*, des objets venant de calques différents sont réunis dans le calque du premier objet.

## Projets similaires / Similar projects

Code 100 % original. Des scripts communautaires de mise en grille existent ; celui-ci est gratuit, bilingue FR/EN, et combine tri (dont tri naturel par nom), cellules ajustées, alignement 9 positions, départ sur le plan de travail et analyse préalable.

## Confidentialité / Privacy

Aucun appel réseau, aucune collecte de données, aucun fichier écrit.

## Licence

MIT — © 2026 Amirouche Amwanes. Voir `LICENSE`.
