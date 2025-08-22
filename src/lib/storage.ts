'use client';

import type { TicketPurchase } from './types';

const MY_TICKETS_KEY = 'myRifaExpressTickets';

export function getMyTickets(): TicketPurchase[] {
  if (typeof window === 'undefined') return [];
  try {
    const storedTickets = window.localStorage.getItem(MY_TICKETS_KEY);
    return storedTickets ? JSON.parse(storedTickets) : [];
  } catch (error) {
    console.error('Failed to parse tickets from localStorage', error);
    return [];
  }
}

export function saveMyTickets(purchases: TicketPurchase[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(purchases));
  } catch (error) {
    console.error('Failed to save tickets to localStorage', error);
  }
}

export function addTicketPurchase(raffleId: string, ticketNumbers: number[]): void {
  if (typeof window === 'undefined') return;
  const myTickets = getMyTickets();
  const existingPurchase = myTickets.find(p => p.raffleId === raffleId);

  if (existingPurchase) {
    existingPurchase.tickets.push(...ticketNumbers);
  } else {
    myTickets.push({ raffleId, tickets: ticketNumbers });
  }

  saveMyTickets(myTickets);
}
