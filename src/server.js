// Point d'entrée : démarre le serveur HTTP.
import { createApp } from './app.js';

const port = process.env.PORT || 3000;

createApp().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Serveur de réservation de salles démarré sur http://localhost:${port}`);
});
