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
  const [showManualInstall, setShowManualInstall] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIosDevice);
      setShowManualInstall(!installPromptEvent && !isIosDevice);
    }
  }, [isOpen, installPromptEvent]);

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
    } else {
      // If no prompt, it's likely iOS or an unsupported browser, so we show instructions.
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIosDevice);
      setShowManualInstall(!isIosDevice);
    }
  };

  const renderContent = () => {
    if (isIos) {
      return (
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
      );
    }

    if (showManualInstall) {
        return (
            <div className="py-4 space-y-4 text-sm text-center">
                <p>Para instalar la aplicación, abre el menú de tu navegador y busca una opción como <span className="font-semibold">"Instalar aplicación"</span> o <span className="font-semibold">"Añadir a la pantalla de inicio"</span>.</p>
                <div className="flex justify-center my-2">
                    <Download className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Esta aplicación web puede ser instalada para un acceso más rápido y funcionar sin conexión.</p>
            </div>
        );
    }

    return (
        <div className="py-4 text-center">
            <p className="mb-4">Haz clic en el botón de abajo para instalar la aplicación en tu dispositivo.</p>
            <Button onClick={handleInstallClick} size="lg">
              <Download className="mr-2 h-4 w-4" />
              Instalar Ahora
            </Button>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instalar Aplicación</DialogTitle>
          <DialogDescription>
            Añade la aplicación a tu pantalla de inicio para un acceso rápido y una mejor experiencia.
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
