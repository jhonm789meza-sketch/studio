'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Raffle } from '@/lib/types';
import { generateRaffleDescription } from '@/lib/actions';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  ticketPrice: z.coerce.number().positive('El precio del boleto debe ser positivo.'),
  totalTickets: z.coerce.number().int().min(10, 'Debe haber al menos 10 boletos.'),
  drawingDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha inválida.'),
  prizeImageUrl: z.string().url('Debe ser una URL válida.'),
});

type FormData = z.infer<typeof formSchema>;

interface CreateRaffleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (raffle: Omit<Raffle, 'id' | 'soldTickets'>) => void;
}

export function CreateRaffleDialog({ isOpen, onClose, onCreate }: CreateRaffleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      ticketPrice: 5,
      totalTickets: 100,
      drawingDate: '',
      prizeImageUrl: '',
    },
  });

  const handleGenerateDescription = () => {
    const raffleName = form.getValues('name');
    if (!raffleName) {
      form.setError('name', { type: 'manual', message: 'Por favor, introduce primero un nombre para la rifa.' });
      return;
    }

    startTransition(async () => {
      const result = await generateRaffleDescription(raffleName);
      if ('description' in result) {
        form.setValue('description', result.description, { shouldValidate: true });
        toast({ title: "Éxito", description: "Descripción generada correctamente." });
      } else {
        toast({ variant: 'destructive', title: "Error", description: result.error });
      }
    });
  };
  
  const onSubmit = (values: FormData) => {
    onCreate({
      ...values,
      drawingDate: new Date(values.drawingDate).toISOString(),
    });
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Rifa</DialogTitle>
          <DialogDescription>Completa los detalles de tu nueva rifa.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Rifa</FormLabel>
                  <FormControl>
                    <Input placeholder="ej., PC Gamer Definitivo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                   <div className="relative">
                     <FormControl>
                       <Textarea placeholder="Una descripción detallada del premio..." {...field} rows={4}/>
                     </FormControl>
                     <Button
                       type="button"
                       variant="ghost"
                       size="icon"
                       className="absolute bottom-2 right-2"
                       onClick={handleGenerateDescription}
                       disabled={isPending}
                       aria-label="Generar descripción con IA"
                     >
                       {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                     </Button>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ticketPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio del Boleto ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalTickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Boletos</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="drawingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Sorteo</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prizeImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la Imagen del Premio</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Crear Rifa</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
