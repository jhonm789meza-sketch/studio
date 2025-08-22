export interface Raffle {
  id: string;
  name: string;
  description: string;
  ticketPrice: number;
  totalTickets: number;
  drawingDate: string; // ISO 8601 format
  prizeImageUrl: string;
  soldTickets: number[];
}

export interface TicketPurchase {
  raffleId: string;
  tickets: number[];
}
