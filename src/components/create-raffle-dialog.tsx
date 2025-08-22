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
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
  ticketPrice: z.coerce.number().positive('Ticket price must be positive.'),
  totalTickets: z.coerce.number().int().min(10, 'There must be at least 10 tickets.'),
  drawingDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date.'),
  prizeImageUrl: z.string().url('Must be a valid URL.'),
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
      form.setError('name', { type: 'manual', message: 'Please enter a raffle name first.' });
      return;
    }

    startTransition(async () => {
      const result = await generateRaffleDescription(raffleName);
      if ('description' in result) {
        form.setValue('description', result.description, { shouldValidate: true });
        toast({ title: "Success", description: "Description generated successfully." });
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
          <DialogTitle>Create New Raffle</DialogTitle>
          <DialogDescription>Fill in the details for your new raffle.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raffle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ultimate Gaming PC" {...field} />
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
                  <FormLabel>Description</FormLabel>
                   <div className="relative">
                     <FormControl>
                       <Textarea placeholder="A detailed description of the prize..." {...field} rows={4}/>
                     </FormControl>
                     <Button
                       type="button"
                       variant="ghost"
                       size="icon"
                       className="absolute bottom-2 right-2"
                       onClick={handleGenerateDescription}
                       disabled={isPending}
                       aria-label="Generate description with AI"
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
                    <FormLabel>Ticket Price ($)</FormLabel>
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
                    <FormLabel>Total Tickets</FormLabel>
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
                  <FormLabel>Drawing Date</FormLabel>
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
                  <FormLabel>Prize Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Create Raffle</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
