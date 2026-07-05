import { test, expect } from '@playwright/test';

// Test end-to-end : parcours utilisateur complet « réserver une salle disponible
// et la voir apparaître dans la liste ». On utilise des sélecteurs robustes
// (data-testid) plutôt que des sélecteurs de style, fragiles.

test('un utilisateur réserve une salle disponible et la voit dans la liste', async ({ page }) => {
  await page.goto('/');

  // Sélecteurs robustes basés sur data-testid.
  await page.getByTestId('input-salle').selectOption('A101');
  await page.getByTestId('input-utilisateur').fill('e.benard');
  await page.getByTestId('input-debut').fill('2026-09-01T09:00');
  await page.getByTestId('input-fin').fill('2026-09-01T10:00');

  await page.getByTestId('btn-reserver').click();

  // Résultat visible : une réservation confirmée apparaît dans la liste.
  const reservation = page.getByTestId('reservation').first();
  await expect(reservation).toBeVisible();
  await expect(reservation).toContainText('A101');
  await expect(reservation).toContainText('e.benard');
  await expect(reservation).toHaveAttribute('data-statut', 'CONFIRMEE');
});

test('un chevauchement affiche un message d’erreur visible', async ({ page }) => {
  await page.goto('/');

  // Première réservation sur la salle B202.
  await page.getByTestId('input-salle').selectOption('B202');
  await page.getByTestId('input-utilisateur').fill('e.benard');
  await page.getByTestId('input-debut').fill('2026-09-02T09:00');
  await page.getByTestId('input-fin').fill('2026-09-02T11:00');
  await page.getByTestId('btn-reserver').click();

  // On attend que la réservation B202 soit rendue : cela garantit que le cycle
  // asynchrone (envoi + réinitialisation du formulaire + rafraîchissement) est
  // terminé avant de remplir la seconde réservation (évite une condition de course).
  await expect(
    page.getByTestId('reservation').filter({ hasText: 'B202' }).first(),
  ).toBeVisible();

  // Seconde réservation qui chevauche la première sur la même salle.
  await page.getByTestId('input-salle').selectOption('B202');
  await page.getByTestId('input-utilisateur').fill('a.autre');
  await page.getByTestId('input-debut').fill('2026-09-02T10:00');
  await page.getByTestId('input-fin').fill('2026-09-02T12:00');
  await page.getByTestId('btn-reserver').click();

  await expect(page.getByTestId('message-erreur')).toContainText('créneau');
});
