'use client';

import type { Raffle, TicketPurchase } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MyTicketsProps {
  myTickets: TicketPurchase[];
  raffles: Raffle[];
}

export function MyTickets({ myTickets, raffles }: MyTicketsProps) {
  if (myTickets.length === 0) {
    return null;
  }

  return (
    <section id="my-tickets">
      <h2 className="text-3xl font-bold mb-6">My Tickets</h2>
      <Card>
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            {myTickets.map(purchase => {
              const raffle = raffles.find(r => r.id === purchase.raffleId);
              if (!raffle) return null;

              return (
                <AccordionItem value={raffle.id} key={raffle.id}>
                  <AccordionTrigger className="font-semibold text-lg">{raffle.name}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-4">You have {purchase.tickets.length} ticket(s) in this raffle.</p>
                    <div className="flex flex-wrap gap-2">
                      {purchase.tickets.sort((a,b) => a-b).map(ticketNumber => (
                        <div key={ticketNumber} className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
                          {ticketNumber}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
