# Réservation de salles

Mini-projet de **qualité logicielle** développé en **TDD**, avec tests unitaires,
tests d'intégration, un test end-to-end et une pipeline CI/CD.

Thème : *Réservation de salles* (thème 2 du sujet). L'application permet de
réserver une salle sur un créneau horaire en garantissant qu'aucune réservation
ne se chevauche sur une même salle.

## Stack technique

| Besoin | Outil | Pourquoi |
|---|---|---|
| Backend / API | Node.js + Express | Léger, adapté à une couche applicative simple |
| Logique métier | JavaScript (module ES pur) | Testable indépendamment de l'API et de l'UI |
| Tests unitaires + intégration | Vitest | Rapide, moderne, assertions claires |
| Tests API | Supertest | Teste les routes HTTP sans lancer un vrai serveur |
| Test E2E | Playwright | Sélecteurs robustes, démarrage automatique du serveur |
| CI/CD | GitHub Actions | Intégré au dépôt, gratuit, simple à documenter |

## Architecture

```
src/
  domain/reservationService.js      logique métier (règles), sans dépendance réseau
  repository/reservationRepository.js  stockage en mémoire
  app.js                            API Express (routes)
  server.js                         point d'entrée
public/index.html                   interface utilisateur (parcours E2E)
tests/
  unit/                             tests unitaires du domaine
  integration/                      tests API (route + service + stockage)
  e2e/                              test end-to-end (Playwright)
.github/workflows/ci.yml            pipeline CI/CD
docs/                               preuve d'exécution + capture d'écran
QA_REPORT.md                        rapport QA
```

La logique métier est volontairement isolée dans `src/domain` : elle ne connaît
ni Express, ni le réseau, ni l'interface. C'est ce qui la rend testable seule et
qui évite que les règles soient noyées dans les routes.

## Prérequis

- Node.js ≥ 20

## Installation

```bash
npm install
```

## Lancer l'application

```bash
npm run dev
# puis ouvrir http://localhost:3000
```

## Lancer les tests

```bash
npm test                 # tous les tests Vitest (unitaires + intégration)
npm run test:unit        # tests unitaires uniquement
npm run test:integration # tests d'intégration uniquement
npm run coverage         # couverture de code

npm run e2e:install      # installe le navigateur Chromium (une seule fois)
npm run e2e              # test end-to-end Playwright
```

> Le test E2E démarre lui-même le serveur (port 4319) via la configuration
> `webServer` de Playwright : aucune manipulation manuelle n'est nécessaire.

## Preuve d'exécution

Résultat de la dernière exécution (voir `docs/preuve-tests.txt`) :

```
 ✓ tests/unit/reservationService.test.js (19 tests)
 ✓ tests/integration/reservations.api.test.js (7 tests)
 Test Files  2 passed (2)
      Tests  26 passed (26)

Playwright :
  ok 1 › un utilisateur réserve une salle disponible et la voit dans la liste
  ok 2 › un chevauchement affiche un message d'erreur visible
  2 passed
```

Capture de l'interface : `docs/apercu-interface.png`.

## Rapport QA

La stratégie qualité complète (démarche TDD, cycles, risques, stratégie de
tests, CI/CD, usage de l'IA, limites) est détaillée dans **[QA_REPORT.md](./QA_REPORT.md)**.
