'use client'; // Necesario para usar hooks en Next.js App Router

import { useState } from 'react';
import { generateRifaTicket } from '@/ai/flows/generate-raffle-ticket'; // Importa el flow
import { Loader2 } from 'lucide-react';

export default function IaTicketGeneratorPage() {
  const [premio, setPremio] = useState('');
  const [ticket, setTicket] = useState('');
  const [numero, setNumero] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!premio) return;
    setLoading(true);
    setTicket('');
    setNumero(null);
    try {
      const result = await generateRifaTicket({ premio });
      setTicket(result.ticket);
      setNumero(result.numero);
    } catch (error) {
      console.error('Error generando ticket:', error);
      setTicket('Error al generar el ticket. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Generador de Tickets de Rifas con IA</h1>
        <input
          type="text"
          placeholder="Ingresa el premio (ej: Un iPhone 15)"
          value={premio}
          onChange={(e) => setPremio(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            'Generar Ticket'
          )}
        </button>
        {ticket && (
          <div className="mt-4 p-4 bg-green-100 rounded">
            <h2 className="font-bold">Ticket Generado:</h2>
            <p><strong>Número:</strong> {numero}</p>
            <p>{ticket}</p>
          </div>
        )}
      </div>
    </div>
  );
}
