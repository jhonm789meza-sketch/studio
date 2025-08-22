'use client';

import { useState } from 'react';
import type { Raffle } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface RaffleDetailsDialogProps {
  raffle: Raffle;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (raffleId: string, ticketNumbers: number[]) => void;
}

export function RaffleDetailsDialog({ raffle, isOpen, onClose, onPurchase }: RaffleDetailsDialogProps) {
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);

  const handleTicketClick = (ticketNumber: number) => {
    if (raffle.soldTickets.includes(ticketNumber)) return;

    setSelectedTickets(prev =>
      prev.includes(ticketNumber)
        ? prev.filter(t => t !== ticketNumber)
        : [...prev, ticketNumber]
    );
  };

  const handlePurchaseClick = () => {
    onPurchase(raffle.id, selectedTickets);
    setSelectedTickets([]);
  };

  const totalCost = selectedTickets.length * raffle.ticketPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{raffle.name}</DialogTitle>
          <DialogDescription>{raffle.description}</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4 shadow-lg">
              <Image src={raffle.prizeImageUrl} alt={`Prize for ${raffle.name}`} layout="fill" objectFit="cover" data-ai-hint="prize gift" />
            </div>
             <div className="text-sm space-y-2">
                <p><strong>Drawing in:</strong> {formatDistanceToNow(new Date(raffle.drawingDate), { addSuffix: true })}</p>
                <p><strong>Date:</strong> {format(new Date(raffle.drawingDate), 'PPP p')}</p>
                <p><strong>Ticket Price:</strong> ${raffle.ticketPrice.toFixed(2)}</p>
                <p><strong>Tickets Remaining:</strong> {raffle.totalTickets - raffle.soldTickets.length}</p>
             </div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold mb-2">Select Your Tickets</h3>
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {Array.from({ length: raffle.totalTickets }, (_, i) => i + 1).map(ticketNumber => {
                  const isSold = raffle.soldTickets.includes(ticketNumber);
                  const isSelected = selectedTickets.includes(ticketNumber);
                  return (
                    <button
                      key={ticketNumber}
                      onClick={() => handleTicketClick(ticketNumber)}
                      disabled={isSold}
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-200 ease-in-out",
                        isSold
                          ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                          : "bg-background border-primary hover:bg-primary/10",
                        isSelected && "bg-primary text-primary-foreground scale-110 shadow-lg"
                      )}
                    >
                      {ticketNumber}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="mt-4">
              <p className="font-semibold">Selected:</p>
              {selectedTickets.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTickets.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tickets selected.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <div className="w-full flex justify-between items-center">
            <p className="font-bold text-lg">Total: ${totalCost.toFixed(2)}</p>
            <div>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={handlePurchaseClick} 
                disabled={selectedTickets.length === 0} 
                className="ml-2 bg-accent hover:bg-accent/90">
                Buy {selectedTickets.length} Ticket(s)
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
