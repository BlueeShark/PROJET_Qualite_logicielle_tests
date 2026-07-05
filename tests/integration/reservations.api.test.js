import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { InMemoryReservationRepository } from '../../src/repository/reservationRepository.js';

// Tests d'intégration : ils exercent la route HTTP, la validation métier et le
// stockage en mémoire ensemble. On repart d'un repository neuf à chaque test.
describe('API /api/reservations (intégration)', () => {
  let app;

  beforeEach(() => {
    app = createApp(new InMemoryReservationRepository());
  });

  const creneau = {
    salle: 'B201',
    utilisateur: 'e.benard',
    debut: '2026-07-06T14:00:00.000Z',
    fin: '2026-07-06T15:00:00.000Z',
  };

  describe('cas nominal', () => {
    it('crée une réservation et renvoie 201 avec le bon format', async () => {
      const res = await request(app).post('/api/reservations').send(creneau);

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.reservation).toMatchObject({
        salle: 'B201',
        utilisateur: 'e.benard',
        statut: 'CONFIRMEE',
        dureeMinutes: 60,
      });
      expect(res.body.reservation.id).toBeDefined();
    });

    it('retrouve la réservation créée via GET', async () => {
      await request(app).post('/api/reservations').send(creneau);
      const res = await request(app).get('/api/reservations');

      expect(res.status).toBe(200);
      expect(res.body.reservations).toHaveLength(1);
      expect(res.body.reservations[0].salle).toBe('B201');
    });

    it('annule une réservation et renvoie le statut ANNULEE', async () => {
      const created = await request(app).post('/api/reservations').send(creneau);
      const id = created.body.reservation.id;

      const res = await request(app).post(`/api/reservations/${id}/annuler`);
      expect(res.status).toBe(200);
      expect(res.body.reservation.statut).toBe('ANNULEE');
    });
  });

  describe('cas d’erreur', () => {
    it('renvoie 400 et un code métier pour un chevauchement', async () => {
      await request(app).post('/api/reservations').send(creneau);
      const res = await request(app)
        .post('/api/reservations')
        .send({ ...creneau, debut: '2026-07-06T14:30:00.000Z', fin: '2026-07-06T15:30:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CHEVAUCHEMENT');
    });

    it('renvoie 400 pour une réservation sans utilisateur', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .send({ ...creneau, utilisateur: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UTILISATEUR_REQUIS');
    });

    it('renvoie 404 en annulant une réservation inexistante', async () => {
      const res = await request(app).post('/api/reservations/999/annuler');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INTROUVABLE');
    });
  });

  describe('route /api/salles', () => {
    it('renvoie la liste des salles disponibles', async () => {
      const res = await request(app).get('/api/salles');
      expect(res.status).toBe(200);
      expect(res.body.salles).toContain('A101');
    });
  });
});
