'use client';

import { useState, useEffect } from 'react';
import type { Raffle, TicketPurchase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { CreateRaffleDialog } from './create-raffle-dialog';
import { RaffleDetailsDialog } from './raffle-details-dialog';
import { MyTickets } from './my-tickets';
import { addTicketPurchase, getMyTickets } from '@/lib/storage';
import { Confetti } from './confetti';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

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
    <div className="min-h-screen">
      {showConfetti && <Confetti />}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="bg-white p-3 rounded-full">
                        <i className="fas fa-ticket-alt text-3xl text-blue-600"></i>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">RifaExpress</h1>
                        <p className="text-blue-100">Sistema profesional de rifas online</p>
                    </div>
                </div>
                
                <Button onClick={() => setCreateDialogOpen(true)} className="hidden md:flex bg-white/10 hover:bg-white/20">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Rifa
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)} className="md:hidden bg-white/20 p-3 rounded-lg" size="icon">
                    <PlusCircle className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <section id="available-raffles" className="mb-12">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🎯 Rifas Activas</h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">Participa en nuestras emocionantes rifas y ten la oportunidad de ganar premios espectaculares. ¡Elige tus números favoritos!</p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {raffles.map(raffle => {
              const percentage = (raffle.soldTickets.length / raffle.totalTickets) * 100;
              return (
              <Card key={raffle.id} className="flex flex-col rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="p-0">
                  <div className="relative aspect-video w-full">
                    <Image src={raffle.prizeImageUrl} alt={`Premio para ${raffle.name}`} fill style={{ objectFit: 'cover' }} data-ai-hint="premio regalo" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{raffle.name}</h3>
                  
                  <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Boletos vendidos</span>
                          <span>{raffle.soldTickets.length}/{raffle.totalTickets}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto mb-4">
                      <div className="text-center bg-blue-50 p-2 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">${raffle.ticketPrice}</div>
                          <div className="text-xs text-gray-500">Por boleto</div>
                      </div>
                      <div className="text-center bg-purple-50 p-2 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{format(new Date(raffle.drawingDate), "d MMM", { locale: es })}</div>
                          <div className="text-xs text-gray-500">Sorteo</div>
                      </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all" onClick={() => setSelectedRaffle(raffle)}>
                    Ver Detalles y Participar
                  </Button>
                </CardFooter>
              </Card>
            )})}
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
