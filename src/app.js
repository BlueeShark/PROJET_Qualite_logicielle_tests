// Couche applicative : API HTTP Express au-dessus du service métier.
// `createApp` accepte un repository injecté pour que les tests d'intégration
// partent d'un état propre à chaque exécution.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReservationService, ReservationError, SALLES } from './domain/reservationService.js';
import { InMemoryReservationRepository } from './repository/reservationRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(repository = new InMemoryReservationRepository()) {
  const app = express();
  const service = new ReservationService(repository);

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/salles', (_req, res) => {
    res.json({ salles: SALLES });
  });

  app.get('/api/reservations', (req, res) => {
    const { salle, date } = req.query;
    res.json({ reservations: service.lister({ salle, date }) });
  });

  app.post('/api/reservations', (req, res) => {
    try {
      const reservation = service.creer(req.body ?? {});
      res.status(201).json({ reservation });
    } catch (err) {
      if (err instanceof ReservationError) {
        return res.status(400).json({ error: { code: err.code, message: err.message } });
      }
      return res.status(500).json({ error: { code: 'ERREUR_INTERNE', message: 'Erreur interne.' } });
    }
  });

  app.post('/api/reservations/:id/annuler', (req, res) => {
    try {
      const reservation = service.annuler(req.params.id);
      res.json({ reservation });
    } catch (err) {
      if (err instanceof ReservationError) {
        const status = err.code === 'INTROUVABLE' ? 404 : 400;
        return res.status(status).json({ error: { code: err.code, message: err.message } });
      }
      return res.status(500).json({ error: { code: 'ERREUR_INTERNE', message: 'Erreur interne.' } });
    }
  });

  return app;
}
