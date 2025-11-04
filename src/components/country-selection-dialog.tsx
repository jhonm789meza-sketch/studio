
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
    { name: 'Colombia', flag: '🇨🇴', code: 'CO' },
];

export const getCurrencySymbol = (countryCode: string): string => {
    switch (countryCode) {
        case 'CO': return 'COP';
        case 'BR': return 'BRL';
        case 'CA': return 'CAD';
        case 'AR':
        case 'PE':
        case 'EC':
        case 'MX':
        case 'DO':
        case 'CR':
        case 'UY':
        case 'PR':
        case 'VE':
        case 'US':
        case 'SV':
        case 'GT':
        case 'HN':
        case 'NI':
        case 'PA':
        case 'CL':
             return '$';
        default: return '$';
    }
}

const getPriceForCountry = (raffleMode: RaffleMode | null, countryCode: string): string | null => {
    if (!raffleMode) return null;

    const isUSDCountry = ['AR', 'PE', 'EC', 'MX', 'DO', 'CR', 'UY', 'PR', 'VE', 'US', 'SV', 'GT', 'HN', 'NI', 'PA', 'CL'].includes(countryCode);

    if (isUSDCountry) {
        if (raffleMode === 'two-digit') return '10 USD';
        if (raffleMode === 'three-digit') return '15 USD';
    }

    if (countryCode === 'CO') {
        if (raffleMode === 'two-digit') return '10,000 COP';
        if (raffleMode === 'three-digit') return '15,000 COP';
        if (raffleMode === 'infinite') return '1,500 COP';
    }
    if (countryCode === 'BR') {
        if (raffleMode === 'two-digit') return '20 BRL';
        if (raffleMode === 'three-digit') return '24 BRL';
    }
    if (countryCode === 'CA') {
        if (raffleMode === 'two-digit') return '10 CAD';
        if (raffleMode === 'three-digit') return '15 CAD';
    }
    
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
