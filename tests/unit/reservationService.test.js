import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReservationService,
  ReservationError,
  dureeEnMinutes,
  seChevauchent,
} from '../../src/domain/reservationService.js';
import { InMemoryReservationRepository } from '../../src/repository/reservationRepository.js';

describe('ReservationService', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = new InMemoryReservationRepository();
    service = new ReservationService(repository);
  });

  // Créneau nominal réutilisable dans plusieurs tests.
  const creneau = {
    salle: 'A101',
    utilisateur: 'e.benard',
    debut: '2026-07-06T09:00:00.000Z',
    fin: '2026-07-06T10:00:00.000Z',
  };

  describe('cas nominaux', () => {
    it('crée une réservation valide et la marque comme confirmée', () => {
      const reservation = service.creer(creneau);

      expect(reservation.id).toBeDefined();
      expect(reservation.salle).toBe('A101');
      expect(reservation.utilisateur).toBe('e.benard');
      expect(reservation.statut).toBe('CONFIRMEE');
    });

    it('calcule la durée du créneau en minutes', () => {
      const reservation = service.creer(creneau);
      expect(reservation.dureeMinutes).toBe(60);
    });

    it('autorise deux réservations sur la même salle si les créneaux ne se chevauchent pas', () => {
      service.creer(creneau);
      const suivante = service.creer({
        ...creneau,
        debut: '2026-07-06T10:00:00.000Z', // commence quand la précédente finit
        fin: '2026-07-06T11:00:00.000Z',
      });
      expect(suivante.statut).toBe('CONFIRMEE');
      expect(service.lister({ salle: 'A101' })).toHaveLength(2);
    });

    it('libère le créneau après annulation et permet de re-réserver', () => {
      const premiere = service.creer(creneau);
      service.annuler(premiere.id);

      const rebooking = service.creer(creneau); // même créneau exactement
      expect(rebooking.statut).toBe('CONFIRMEE');
    });
  });

  describe('cas limites', () => {
    it('refuse une réservation dont la fin est égale au début (durée nulle)', () => {
      expect(() =>
        service.creer({ ...creneau, fin: creneau.debut }),
      ).toThrow(ReservationError);
    });

    it('accepte deux créneaux adjacents qui se touchent sans se chevaucher', () => {
      service.creer(creneau);
      expect(() =>
        service.creer({
          ...creneau,
          debut: '2026-07-06T08:00:00.000Z',
          fin: '2026-07-06T09:00:00.000Z', // finit exactement au début du 1er
        }),
      ).not.toThrow();
    });

    it('nettoie les espaces autour du nom d’utilisateur', () => {
      const reservation = service.creer({ ...creneau, utilisateur: '  e.benard  ' });
      expect(reservation.utilisateur).toBe('e.benard');
    });
  });

  describe('cas d’erreur', () => {
    it('refuse une réservation sans utilisateur', () => {
      expect(() => service.creer({ ...creneau, utilisateur: '' })).toThrow(
        expect.objectContaining({ code: 'UTILISATEUR_REQUIS' }),
      );
    });

    it('refuse une salle indisponible (hors liste)', () => {
      expect(() => service.creer({ ...creneau, salle: 'Z999' })).toThrow(
        expect.objectContaining({ code: 'SALLE_INDISPONIBLE' }),
      );
    });

    it('refuse une date de fin avant la date de début', () => {
      expect(() =>
        service.creer({
          ...creneau,
          debut: '2026-07-06T10:00:00.000Z',
          fin: '2026-07-06T09:00:00.000Z',
        }),
      ).toThrow(expect.objectContaining({ code: 'DATES_INCOHERENTES' }));
    });

    it('refuse deux réservations qui se chevauchent sur la même salle', () => {
      service.creer(creneau);
      expect(() =>
        service.creer({
          ...creneau,
          debut: '2026-07-06T09:30:00.000Z',
          fin: '2026-07-06T10:30:00.000Z',
        }),
      ).toThrow(expect.objectContaining({ code: 'CHEVAUCHEMENT' }));
    });

    it('autorise le même créneau sur deux salles différentes', () => {
      service.creer(creneau);
      expect(() => service.creer({ ...creneau, salle: 'A102' })).not.toThrow();
    });

    it('refuse une date invalide', () => {
      expect(() => service.creer({ ...creneau, fin: 'pas-une-date' })).toThrow(
        expect.objectContaining({ code: 'DATE_INVALIDE' }),
      );
    });

    it('lève une erreur INTROUVABLE en annulant une réservation inexistante', () => {
      expect(() => service.annuler(999)).toThrow(
        expect.objectContaining({ code: 'INTROUVABLE' }),
      );
    });
  });

  describe('filtres de listing', () => {
    beforeEach(() => {
      service.creer(creneau);
      service.creer({ ...creneau, salle: 'A102', debut: '2026-07-07T09:00:00.000Z', fin: '2026-07-07T10:00:00.000Z' });
    });

    it('filtre par salle', () => {
      expect(service.lister({ salle: 'A101' })).toHaveLength(1);
    });

    it('filtre par date', () => {
      expect(service.lister({ date: '2026-07-07' })).toHaveLength(1);
    });
  });
});

describe('utilitaires purs', () => {
  it('dureeEnMinutes calcule correctement un écart d’1h30', () => {
    expect(dureeEnMinutes('2026-07-06T09:00:00Z', '2026-07-06T10:30:00Z')).toBe(90);
  });

  it('seChevauchent détecte un recouvrement partiel', () => {
    const a = { debut: '2026-07-06T09:00:00Z', fin: '2026-07-06T10:00:00Z' };
    const b = { debut: '2026-07-06T09:30:00Z', fin: '2026-07-06T10:30:00Z' };
    expect(seChevauchent(a, b)).toBe(true);
  });

  it('seChevauchent renvoie false pour deux créneaux qui se touchent', () => {
    const a = { debut: '2026-07-06T09:00:00Z', fin: '2026-07-06T10:00:00Z' };
    const b = { debut: '2026-07-06T10:00:00Z', fin: '2026-07-06T11:00:00Z' };
    expect(seChevauchent(a, b)).toBe(false);
  });
});
