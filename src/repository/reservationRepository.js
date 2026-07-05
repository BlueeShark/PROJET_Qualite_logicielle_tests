// Stockage en mémoire des réservations.
// Isolé derrière une interface simple : on pourrait le remplacer par une vraie
// base de données sans toucher à la logique métier.

export class InMemoryReservationRepository {
  constructor() {
    this.reservations = new Map();
    this.sequence = 0;
  }

  nextId() {
    return ++this.sequence;
  }

  sauvegarder(reservation) {
    this.reservations.set(reservation.id, reservation);
    return { ...reservation };
  }

  trouver(id) {
    return this.reservations.get(Number(id));
  }

  lister() {
    return [...this.reservations.values()].map((r) => ({ ...r }));
  }

  listerParSalle(salle) {
    return this.lister().filter((r) => r.salle === salle);
  }

  /** Remet le dépôt à zéro : utile pour isoler chaque test. */
  reset() {
    this.reservations.clear();
    this.sequence = 0;
  }
}
