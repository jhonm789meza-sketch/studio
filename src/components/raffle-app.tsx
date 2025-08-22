'use client';

import { useState, useEffect } from 'react';
import type { Raffle, TicketPurchase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Ticket, Gift, Calendar } from 'lucide-react';
import Image from 'next/image';
import { CreateRaffleDialog } from './create-raffle-dialog';
import { RaffleDetailsDialog } from './raffle-details-dialog';
import { MyTickets } from './my-tickets';
import { addTicketPurchase, getMyTickets } from '@/lib/storage';
import { Confetti } from './confetti';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RaffleApp({ initialRaffles }: { initialRaffles: Raffle[] }) {
  const [raffles, setRaffles] = useState<Raffle[]>(initialRaffles);
  const [myTickets, setMyTickets] = useState<TicketPurchase[]>([]);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    setMyTickets(getMyTickets());
  }, []);

  const handleCreateRaffle = (newRaffle: Omit<Raffle, 'id' | 'soldTickets'>) => {
    const createdRaffle: Raffle = {
      ...newRaffle,
      id: (raffles.length + 1).toString(),
      soldTickets: [],
    };
    setRaffles(prev => [...prev, createdRaffle]);
    setCreateDialogOpen(false);
  };

  const handlePurchase = (raffleId: string, ticketNumbers: number[]) => {
    addTicketPurchase(raffleId, ticketNumbers);
    setMyTickets(getMyTickets());
    
    setRaffles(prevRaffles =>
      prevRaffles.map(r =>
        r.id === raffleId ? { ...r, soldTickets: [...r.soldTickets, ...ticketNumbers] } : r
      )
    );

    setSelectedRaffle(null);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showConfetti && <Confetti />}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">RifaExpress</h1>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Rifa
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <section id="available-raffles" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Rifas Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map(raffle => (
              <Card key={raffle.id} className="flex flex-col transform hover:scale-105 transition-transform duration-300 ease-in-out shadow-lg hover:shadow-xl">
                <CardHeader>
                  <CardTitle>{raffle.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{raffle.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="relative aspect-video mb-4 rounded-md overflow-hidden">
                    <Image src={raffle.prizeImageUrl} alt={`Premio para ${raffle.name}`} fill style={{ objectFit: 'cover' }} data-ai-hint="premio regalo" />
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                     <div className="flex items-center gap-2">
                       <Gift className="h-4 w-4 text-primary" />
                       <span>${raffle.ticketPrice.toFixed(2)} / boleto</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <Calendar className="h-4 w-4 text-primary" />
                       <span>{format(new Date(raffle.drawingDate), "d 'de' MMMM, yyyy", { locale: es })}</span>
                     </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => setSelectedRaffle(raffle)}>
                    <Ticket className="mr-2 h-4 w-4" />
                    Ver Boletos
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <MyTickets myTickets={myTickets} raffles={raffles} />
      </main>

      <CreateRaffleDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateRaffle}
      />
      
      {selectedRaffle && (
        <RaffleDetailsDialog
          raffle={selectedRaffle}
          isOpen={!!selectedRaffle}
          onClose={() => setSelectedRaffle(null)}
          onPurchase={handlePurchase}
        />
      )}
    </div>
  );
}
