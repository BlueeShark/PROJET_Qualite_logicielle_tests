# Rapport QA — Réservation de salles

## 1. Présentation du projet

- **Thème choisi** : réservation de salles (thème 2 du sujet).
- **Objectif** : permettre de réserver une salle sur un créneau horaire, en
  garantissant la cohérence des réservations (pas de chevauchement, dates
  valides, salle existante, utilisateur renseigné).
- **Stack** : Node.js + Express (API), Vitest (tests unitaires et
  d'intégration), Supertest (tests API), Playwright (E2E), GitHub Actions (CI).
- **Principales fonctionnalités** : créer une réservation, annuler une
  réservation, lister et filtrer les réservations, consulter les salles.

J'ai choisi ce thème parce que ses règles métier sont naturellement riches
(chevauchement de créneaux, comparaison de dates) : elles se prêtent bien à des
cas nominaux, limites et d'erreur clairs, donc à une démarche TDD crédible.

## 2. Fonctionnalités développées

Périmètre volontairement restreint mais terminé, testé et documenté :

- créer une réservation (`POST /api/reservations`) ;
- annuler une réservation (`POST /api/reservations/:id/annuler`) ;
- lister les réservations, avec filtres par salle et par date (`GET /api/reservations`) ;
- consulter les salles disponibles (`GET /api/salles`) ;
- interface web minimale permettant le parcours complet (formulaire + liste).

## 3. Règles métier principales

Toutes portées par `src/domain/reservationService.js` :

1. Une réservation doit avoir un **utilisateur** (code `UTILISATEUR_REQUIS`).
2. La salle doit exister dans la liste des salles disponibles, sinon elle est
   considérée **indisponible** (`SALLE_INDISPONIBLE`).
3. La **date de fin doit être strictement après la date de début**
   (`DATES_INCOHERENTES`).
4. Deux réservations **ne peuvent pas se chevaucher** sur la même salle
   (`CHEVAUCHEMENT`). Deux créneaux qui se touchent exactement (fin de l'un =
   début de l'autre) ne se chevauchent pas.
5. Une réservation **annulée libère son créneau** : le créneau redevient
   réservable.

## 4. Démarche TDD

J'ai appliqué le cycle **rouge → vert → refactor** sur la logique métier. Voici
trois cycles représentatifs (le code final se trouve dans
`src/domain/reservationService.js`, les tests dans
`tests/unit/reservationService.test.js`).

### Cycle 1 — Créer une réservation valide

- **Comportement attendu** : une réservation valide est créée avec le statut `CONFIRMEE`.
- **Test écrit** : `« crée une réservation valide et la marque comme confirmée »`.
- **Résultat initial** : échec — la classe `ReservationService` et la méthode
  `creer` n'existaient pas.
- **Code ajouté** : squelette de `ReservationService`, méthode `creer` qui
  construit et sauvegarde une réservation `CONFIRMEE`.
- **Résultat final** : succès.

### Cycle 2 — Interdire le chevauchement sur une même salle

- **Comportement attendu** : deux réservations qui se chevauchent sur la même
  salle sont refusées.
- **Test écrit** : `« refuse deux réservations qui se chevauchent sur la même salle »`.
- **Résultat initial** : échec — aucune vérification de chevauchement, la
  seconde réservation était acceptée.
- **Code ajouté** : fonction pure `seChevauchent(a, b)` et contrôle dans `creer`
  qui lève `ReservationError('CHEVAUCHEMENT')`.
- **Résultat final** : succès.

### Cycle 3 — Refuser une date de fin avant la date de début

- **Comportement attendu** : une réservation dont la fin précède (ou égale) le
  début est refusée.
- **Test écrit** : `« refuse une date de fin avant la date de début »`.
- **Résultat initial** : échec — les dates incohérentes étaient acceptées.
- **Code ajouté** : contrôle `if (dFin <= dDebut) throw ReservationError('DATES_INCOHERENTES')`.
- **Résultat final** : succès.

> Un quatrième cycle a suivi la même logique pour la règle « une annulation
> libère le créneau » : le test re-réserve un créneau après annulation, ce qui a
> imposé de ne compter que les réservations `CONFIRMEE` dans le contrôle de
> chevauchement.

## 5. Risques qualité identifiés

- **Mauvaise validation des dates** : une date invalide ou incohérente pourrait
  créer une réservation aberrante → couvert par `DATE_INVALIDE` et
  `DATES_INCOHERENTES`.
- **Chevauchement non détecté** : régression possible sur la comparaison de
  créneaux (erreurs de bornes strictes/larges) → couvert par des tests de
  créneaux adjacents et partiellement recouvrants.
- **Route API acceptant des données invalides** : une erreur métier mal mappée
  renverrait un mauvais statut HTTP → couvert par les tests d'intégration qui
  vérifient les codes 201 / 400 / 404.
- **État incohérent en mémoire** : les tests repartent d'un repository neuf pour
  éviter les effets de bord entre cas.

## 6. Stratégie de tests

- **Tests unitaires** sur `src/domain` : la logique métier est le cœur du
  projet et la partie la plus à risque de régression. Elle est pure, donc rapide
  et déterministe à tester en isolation.
- **Tests d'intégration** sur l'API : ils vérifient que la route, la validation
  métier et le stockage fonctionnent **ensemble**, y compris le format de
  réponse JSON et les statuts HTTP — ce que les tests unitaires ne couvrent pas.
- **Test E2E** sur le parcours réel : il valide la chaîne complète
  navigateur → API → stockage → affichage, du point de vue de l'utilisateur.

**Ce qui est couvert** : règles métier (nominal, limite, erreur), contrat de
l'API (statuts et format), parcours utilisateur principal.

**Ce qui ne l'est pas** : persistance durable (stockage en mémoire uniquement),
authentification, concurrence réelle, compatibilité multi-navigateurs (E2E limité
à Chromium).

## 7. Tests unitaires réalisés

Fichier : `tests/unit/reservationService.test.js` (19 tests).

- **Cas nominaux** : création confirmée, calcul de durée, deux créneaux non
  chevauchants acceptés, re-réservation après annulation.
- **Cas limites** : fin égale au début refusée, créneaux adjacents acceptés,
  nettoyage des espaces du nom d'utilisateur.
- **Cas d'erreur** : sans utilisateur, salle indisponible, dates incohérentes,
  chevauchement, date invalide, annulation d'une réservation inexistante.
- **Fonctions pures** : `dureeEnMinutes`, `seChevauchent`.

Noms de tests explicites et assertions ciblées (vérification du `code` d'erreur
métier plutôt que d'un message).

## 8. Tests d'intégration réalisés

Fichier : `tests/integration/reservations.api.test.js` (7 tests), via Supertest.

- **Cas nominal** : `POST` renvoie `201` + format `{ reservation }` attendu ;
  `GET` retrouve la réservation ; annulation renvoie le statut `ANNULEE`.
- **Cas d'erreur** : chevauchement → `400` + code `CHEVAUCHEMENT` ; sans
  utilisateur → `400` ; annulation inexistante → `404`.
- Vérification systématique du **statut HTTP** et du **format de réponse**.

## 9. Test E2E réalisé

Fichier : `tests/e2e/reservation.spec.js` (Playwright, 2 tests).

- **Parcours nominal** : l'utilisateur sélectionne une salle, saisit un
  utilisateur et un créneau, clique sur *Réserver*, puis **voit la réservation
  confirmée apparaître dans la liste**.
- **Parcours d'erreur** : une seconde réservation chevauchante affiche un
  **message d'erreur visible**.

Choix techniques :
- **sélecteurs robustes** via `data-testid` (indépendants du style et de la
  structure HTML), et non des sélecteurs CSS fragiles ;
- **résultat visible vérifié** (contenu et attribut `data-statut` de la ligne) ;
- une attente explicite sur le rendu de la première réservation évite une
  condition de course liée à la réinitialisation asynchrone du formulaire.

## 10. Pipeline CI/CD

Fichier : `.github/workflows/ci.yml`.

- **Où** : GitHub Actions, dans le dépôt.
- **Quand** : à chaque `push` et chaque `pull_request` sur `main`.
- **Commandes exécutées** : `npm ci`, `npm run test:unit`,
  `npm run test:integration`, `npx playwright install --with-deps chromium`,
  `npm run e2e`.
- **Tests lancés** : unitaires, intégration, puis E2E.
- **En cas d'échec** : une étape qui échoue fait échouer le job ; le workflow est
  marqué en rouge et la fusion peut être bloquée. Le rapport Playwright est
  publié en artefact même en cas d'échec (`if: always()`).
- **Limites actuelles** : un seul système d'exploitation (`ubuntu-latest`) et un
  seul navigateur (Chromium) ; pas de cache Playwright ni de matrice de versions
  Node ; pas de déploiement (CI seule, pas de CD).

## 11. Utilisation de l'IA générative

- **Outil** : Claude (Claude Code) comme assistant de développement.
- **Prompts principaux** : « analyser le sujet et produire un mini-projet
  réservation de salles en TDD » ; « proposer des cas limites de chevauchement » ;
  « générer une première version des tests unitaires et de la structure du
  rapport ».
- **Ce qui a été conservé** : la structure générale du projet, la séparation
  domaine / API / UI, la liste des cas de tests.
- **Ce qui a été modifié** : le port du serveur de test (conflit avec un service
  local déjà sur le port 3100), la fiabilisation du test E2E (condition de course
  sur le formulaire), les libellés et messages d'erreur en français.
- **Ce qui a été refusé / écarté** : l'ajout de dépendances superflues et une
  logique trop ambitieuse (base de données, authentification) hors du périmètre
  attendu.
- **Limites observées** : l'IA a d'abord ignoré un conflit de port propre à mon
  environnement, et a produit un test E2E instable qu'il a fallu corriger après
  observation de l'échec réel. **Je reste responsable du code et des tests
  rendus** : chaque test a été exécuté et vérifié.

## 12. Limites actuelles

- Stockage **en mémoire** : les données sont perdues au redémarrage.
- Pas d'authentification ni de gestion des utilisateurs réels.
- Pas de gestion fine des fuseaux horaires (dates en UTC).
- E2E limité à un navigateur (Chromium).

## 13. Améliorations possibles

- Persistance via une base de données (avec base de test dédiée et reset
  automatique entre tests).
- Ajout d'une mesure de **couverture** en CI avec un seuil minimal.
- Étendre l'E2E à plusieurs navigateurs et ajouter des tests d'accessibilité.
- Gestion des utilisateurs et des droits (qui peut annuler quelle réservation).
