import RaffleApp from '@/components/raffle-app';
import rafflesData from '@/data/raffles.json';
import type { Raffle } from '@/lib/types';

export default function Home() {
  const raffles: Raffle[] = rafflesData as Raffle[];

  return <RaffleApp initialRaffles={raffles} />;
}
