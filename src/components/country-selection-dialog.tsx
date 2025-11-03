
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Raffle } from '@/lib/types';

type RaffleMode = Raffle['raffleMode'];

interface CountrySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry: (countryCode: string) => void;
  raffleMode: RaffleMode | null;
}

const countries = [
  { name: 'Argentina', flag: '🇦🇷', code: 'AR' },
  { name: 'Brasil', flag: '🇧🇷', code: 'BR' },
  { name: 'Canadá', flag: '🇨🇦', code: 'CA' },
  { name: 'Chile', flag: '🇨🇱', code: 'CL' },
  { name: 'Colombia', flag: '🇨🇴', code: 'CO' },
  { name: 'Costa Rica', flag: '🇨🇷', code: 'CR' },
  { name: 'Ecuador', flag: '🇪🇨', code: 'EC' },
  { name: 'El Salvador', flag: '🇸🇻', code: 'SV' },
  { name: 'España', flag: '🇪🇸', code: 'ES' },
  { name: 'Estados Unidos', flag: '🇺🇸', code: 'US' },
  { name: 'Guatemala', flag: '🇬🇹', code: 'GT' },
  { name: 'Honduras', flag: '🇭🇳', code: 'HN' },
  { name: 'México', flag: '🇲🇽', code: 'MX' },
  { name: 'Nicaragua', flag: '🇳🇮', code: 'NI' },
  { name: 'Panamá', flag: '🇵🇦', code: 'PA' },
  { name: 'Perú', flag: '🇵🇪', code: 'PE' },
  { name: 'Puerto Rico', flag: '🇵🇷', code: 'PR' },
  { name: 'República Dominicana', flag: '🇩🇴', code: 'DO' },
  { name: 'Uruguay', flag: '🇺🇾', code: 'UY' },
  { name: 'Venezuela', flag: '🇻🇪', code: 'VE' },
];

const getPriceForCountry = (raffleMode: RaffleMode | null, countryCode: string): string | null => {
    if (!raffleMode) return null;

    if (countryCode === 'CO') {
        if (raffleMode === 'two-digit') return '10,000 COP';
        if (raffleMode === 'three-digit') return '15,000 COP';
        if (raffleMode === 'infinite') return '1,500 COP';
    }
    if (countryCode === 'BR') {
        if (raffleMode === 'two-digit') return '20 BRL';
        if (raffleMode === 'three-digit') return '24 BRL';
    }
    // Add other countries and prices here
    return null;
}

export function CountrySelectionDialog({ isOpen, onClose, onSelectCountry, raffleMode }: CountrySelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona tu país</DialogTitle>
          <DialogDescription>
            Elige tu país para continuar con la activación de la rifa. El precio puede variar.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full mt-4">
          <div className="space-y-2">
            {countries.map((country) => {
              const price = getPriceForCountry(raffleMode, country.code);
              return (
                <Button
                  key={country.code}
                  variant="outline"
                  className="w-full justify-start text-left h-auto"
                  onClick={() => onSelectCountry(country.code)}
                >
                  <span className="mr-3 text-2xl">{country.flag}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{country.name}</span>
                    {price && <span className="text-xs text-muted-foreground">{price}</span>}
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
