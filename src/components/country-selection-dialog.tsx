
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

interface CountrySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry: (countryCode: string) => void;
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

export function CountrySelectionDialog({ isOpen, onClose, onSelectCountry }: CountrySelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona tu país</DialogTitle>
          <DialogDescription>
            Elige tu país para continuar con la activación de la rifa.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full mt-4">
          <div className="space-y-2">
            {countries.map((country) => (
              <Button
                key={country.code}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => onSelectCountry(country.code)}
              >
                <span className="mr-3 text-2xl">{country.flag}</span>
                <span className="font-medium">{country.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
