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
import { es } from 'date-fns/locale';
import { ShoppingCart } from 'lucide-react';

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
          <DialogTitle className="text-3xl font-bold text-gray-800">{raffle.name}</DialogTitle>
          <DialogDescription className="text-gray-600">{raffle.description}</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4">
          <div className="flex flex-col space-y-4">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-lg">
              <Image src={raffle.prizeImageUrl} alt={`Premio para ${raffle.name}`} layout="fill" objectFit="cover" data-ai-hint="premio regalo" />
            </div>
             <div className="text-sm space-y-2 bg-slate-50 p-4 rounded-lg">
                <p><strong>Sorteo en:</strong> {formatDistanceToNow(new Date(raffle.drawingDate), { addSuffix: true, locale: es })}</p>
                <p><strong>Fecha:</strong> {format(new Date(raffle.drawingDate), 'PPP p', { locale: es })}</p>
                <p><strong>Precio del Boleto:</strong> ${raffle.ticketPrice.toFixed(2)}</p>
                <p><strong>Boletos Restantes:</strong> {raffle.totalTickets - raffle.soldTickets.length}</p>
             </div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold mb-3 text-lg">Selecciona Tus Números</h3>
            <ScrollArea className="h-80 border rounded-md p-4 bg-slate-50">
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
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
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed line-through"
                          : "bg-white border-blue-500 hover:bg-blue-100",
                        isSelected && "bg-blue-500 text-white scale-110 shadow-lg border-blue-700"
                      )}
                    >
                      {ticketNumber}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
           
          </div>
        </div>
        <DialogFooter className="mt-4 bg-gray-50 p-4 rounded-b-lg -m-6 mt-0">
          <div className="w-full flex justify-between items-center">
             <div className="text-left">
                <p className="font-semibold text-gray-600">Total:</p>
                <p className="font-bold text-2xl text-blue-600">${totalCost.toFixed(2)}</p>
             </div>
            <div>
              <Button 
                onClick={handlePurchaseClick} 
                disabled={selectedTickets.length === 0} 
                size="lg"
                className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold hover:from-green-600 hover:to-teal-600">
                <ShoppingCart className="mr-2 h-5 w-5"/>
                Comprar {selectedTickets.length > 0 ? `${selectedTickets.length} Boleto(s)`: ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
