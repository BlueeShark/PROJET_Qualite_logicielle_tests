// Logique métier de réservation de salles.
// Cette couche est volontairement pure : aucune dépendance à Express ou au réseau.
// Elle reçoit un repository injecté, ce qui la rend testable isolément.

/**
 * Erreur métier typée : le `code` permet des assertions précises dans les tests
 * et un mapping propre vers un statut HTTP dans la couche API.
 */
export class ReservationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReservationError';
    this.code = code;
  }
}

/** Salles connues du système. Une salle hors de cette liste est "indisponible". */
export const SALLES = ['A101', 'A102', 'B201', 'B202'];

/** Durée d'un créneau en minutes (utilitaire pur, facile à tester). */
export function dureeEnMinutes(debut, fin) {
  return Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000);
}

/**
 * Deux créneaux se chevauchent si l'un commence avant que l'autre ne finisse,
 * des deux côtés. La comparaison stricte (<) fait que deux créneaux qui se
 * touchent exactement (fin de l'un = début de l'autre) NE se chevauchent pas.
 */
export function seChevauchent(a, b) {
  return new Date(a.debut) < new Date(b.fin) && new Date(b.debut) < new Date(a.fin);
}

export class ReservationService {
  constructor(repository, { sallesDisponibles = SALLES } = {}) {
    this.repository = repository;
    this.sallesDisponibles = sallesDisponibles;
  }

  /**
   * Crée une réservation confirmée si toutes les règles métier sont respectées.
   * @throws {ReservationError} si une règle est violée.
   */
  creer({ salle, utilisateur, debut, fin } = {}) {
    // Règle : une réservation doit avoir un utilisateur.
    if (!utilisateur || String(utilisateur).trim() === '') {
      throw new ReservationError('UTILISATEUR_REQUIS', 'Une réservation doit avoir un utilisateur.');
    }

    // Règle : une salle indisponible ne peut pas être réservée.
    if (!this.sallesDisponibles.includes(salle)) {
      throw new ReservationError('SALLE_INDISPONIBLE', `La salle « ${salle} » n'est pas disponible.`);
    }

    const dDebut = new Date(debut);
    const dFin = new Date(fin);
    if (Number.isNaN(dDebut.getTime()) || Number.isNaN(dFin.getTime())) {
      throw new ReservationError('DATE_INVALIDE', 'Les dates fournies sont invalides.');
    }

    // Règle : la date de fin ne peut pas être avant (ni égale à) la date de début.
    if (dFin <= dDebut) {
      throw new ReservationError('DATES_INCOHERENTES', 'La date de fin doit être après la date de début.');
    }

    // Règle : deux réservations ne peuvent pas se chevaucher sur la même salle.
    // Une réservation ANNULÉE libère le créneau : on ignore donc ces réservations.
    const enConflit = this.repository
      .listerParSalle(salle)
      .some((r) => r.statut === 'CONFIRMEE' && seChevauchent(r, { debut, fin }));
    if (enConflit) {
      throw new ReservationError('CHEVAUCHEMENT', 'Une réservation existe déjà sur ce créneau pour cette salle.');
    }

    const reservation = {
      id: this.repository.nextId(),
      salle,
      utilisateur: String(utilisateur).trim(),
      debut: dDebut.toISOString(),
      fin: dFin.toISOString(),
      statut: 'CONFIRMEE',
      dureeMinutes: dureeEnMinutes(dDebut, dFin),
    };
    return this.repository.sauvegarder(reservation);
  }

  /** Annule une réservation existante (libère son créneau). */
  annuler(id) {
    const reservation = this.repository.trouver(id);
    if (!reservation) {
      throw new ReservationError('INTROUVABLE', `Réservation ${id} introuvable.`);
    }
    reservation.statut = 'ANNULEE';
    return this.repository.sauvegarder(reservation);
  }

  /** Liste les réservations, avec filtres optionnels par salle et par date (YYYY-MM-DD). */
  lister({ salle, date } = {}) {
    let resas = this.repository.lister();
    if (salle) resas = resas.filter((r) => r.salle === salle);
    if (date) resas = resas.filter((r) => r.debut.slice(0, 10) === date);
    return resas;
  }
}
