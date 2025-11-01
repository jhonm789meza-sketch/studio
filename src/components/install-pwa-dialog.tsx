'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Download, Share } from 'lucide-react';

interface InstallPwaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  installPromptEvent: any;
}

export function InstallPwaDialog({ isOpen, onClose, installPromptEvent }: InstallPwaDialogProps) {
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect if the user is on an iOS device
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);
  }, []);

  const handleInstallClick = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        onClose();
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instalar Aplicación</DialogTitle>
          <DialogDescription>
            {isIos
              ? 'Sigue estos pasos para añadir la aplicación a tu pantalla de inicio.'
              : 'Instala la aplicación en tu dispositivo para un acceso más rápido y una mejor experiencia.'}
          </DialogDescription>
        </DialogHeader>
        
        {isIos ? (
          <div className="py-4 space-y-4 text-sm">
            <p>1. Toca el ícono de <span className="font-semibold">Compartir</span> en la barra de navegación de Safari.</p>
            <div className="flex justify-center my-2">
                 <Share className="h-6 w-6 text-blue-500" />
            </div>
            <p>2. Desliza hacia arriba y selecciona <span className="font-semibold">"Añadir a pantalla de inicio"</span>.</p>
             <div className="flex justify-center my-2">
                 <div className="bg-gray-200 rounded-md p-2 inline-flex items-center gap-2">
                    <Download className="h-5 w-5"/>
                    <span className="font-medium">Añadir a pantalla de inicio</span>
                 </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-4">Haz clic en el botón de abajo para comenzar la instalación.</p>
            <Button onClick={handleInstallClick} disabled={!installPromptEvent}>
              <Download className="mr-2 h-4 w-4" />
              Instalar Ahora
            </Button>
            {!installPromptEvent && (
                 <p className="text-xs text-muted-foreground mt-4">Si el botón no está activo, es posible que tu navegador no sea compatible o la aplicación ya esté instalada.</p>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
