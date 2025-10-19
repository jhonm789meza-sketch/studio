'use client';

import { useState, useEffect } from 'react';

interface TicketContent {
  event_name: string;
  date: string;
  time: string;
  location: string;
  seat: string;
  price: string;
  organizer: string;
  ticket_id: string;
  qr_data: string;
}

interface TicketData {
  content: TicketContent;
  image: string; // This will be the QR code data URL
  qr_code: string;
}

// Componente de Preview del Ticket
function TicketPreview({ data }: { data: TicketData }) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-6 text-white transform rotate-0 hover:rotate-0 transition-transform">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="text-left">
            <div className="text-sm opacity-80">TICKET ID</div>
            <div className="font-mono font-bold text-lg">{data.content.ticket_id}</div>
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
            E-TICKET
          </div>
        </div>
        
        <h3 className="text-2xl sm:text-3xl font-bold mb-2">{data.content.event_name}</h3>
        <p className="text-blue-100 text-lg">{data.content.organizer}</p>
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 rounded-lg p-4">
          <div className="text-sm opacity-80">FECHA</div>
          <div className="font-semibold text-lg">{data.content.date}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-4">
          <div className="text-sm opacity-80">HORA</div>
          <div className="font-semibold text-lg">{data.content.time}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 col-span-2">
          <div className="text-sm opacity-80">LOCACIÓN</div>
          <div className="font-semibold text-lg">{data.content.location}</div>
        </div>
      </div>

      {/* Asiento y Precio */}
      <div className="flex justify-between items-center bg-white/10 rounded-lg p-4 mb-6">
        <div>
          <div className="text-sm opacity-80">ASIENTO</div>
          <div className="font-bold text-xl">{data.content.seat}</div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-80">PRECIO</div>
          <div className="font-bold text-2xl text-green-300">{data.content.price}</div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg p-3">
          <img 
            src={data.qr_code} 
            alt="QR Code" 
            className="w-32 h-32 sm:w-40 sm:h-40"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-sm opacity-70">
        Presentar este ticket en la entrada • No transferible • Generado por IA
      </div>
    </div>
  );
}


export default function TicketGeneratorClient() {
  const [prompt, setPrompt] = useState('');
  const [ticketType, setTicketType] = useState('event');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const generateTicket = async () => {
    if (!prompt.trim()) {
      setError('Por favor describe tu ticket');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type: ticketType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error generando ticket');
      }

      setTicket(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadTicket = () => {
    if (!ticket) return;
    
    const link = document.createElement('a');
    link.href = ticket.qr_code; // Usamos el QR como imagen descargable
    link.download = `ticket-${ticket.content.ticket_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearTicket = () => {
    setTicket(null);
    setPrompt('');
  };

  const generateSampleTicket = () => {
    const samples = [
      "Concierto de rock en el estadio nacional con asientos VIP",
      "Conferencia de tecnología con keynote speakers internacionales",
      "Obra de teatro clásico en el teatro municipal",
      "Festival de gastronomía con chefs reconocidos",
      "Exposición de arte contemporáneo con entrada premium"
    ];
    const newPrompt = samples[Math.floor(Math.random() * samples.length)];
    setPrompt(newPrompt);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando generador de tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            🎫 Generador de Tickets IA
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Crea tickets profesionales para eventos usando inteligencia artificial avanzada
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Panel de Control */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  Configura tu Ticket
                </h2>
                
                {/* Tipo de Ticket */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🎭 Tipo de Evento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: 'event', label: 'Evento', emoji: '🎪' },
                      { value: 'concert', label: 'Concierto', emoji: '🎵' },
                      { value: 'conference', label: 'Conferencia', emoji: '💼' },
                      { value: 'sports', label: 'Deportes', emoji: '⚽' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setTicketType(type.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          ticketType === type.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.emoji}</div>
                        <div className="text-sm font-medium">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ✍ Describe tu evento
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Concierto de rock en el estadio nacional, asientos VIP, precio alrededor de $75, fecha próximo mes..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <button
                      onClick={generateSampleTicket}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      🎲 Ejemplo Aleatorio
                    </button>
                    <button
                      onClick={() => setPrompt('')}
                      className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                    >
                      🗑 Limpiar
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón de Generación */}
              <div className="space-y-4">
                <button
                  onClick={generateTicket}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Generando con IA...
                    </span>
                  ) : (
                    '✨ Generar Ticket con IA'
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">⚠</span>
                      {error}
                    </div>
                  </div>
                )}
              </div>

              {/* Estadísticas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Características</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    IA Avanzada
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    Código QR
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    Diseño Profesional
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    Descarga Instantánea
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview del Ticket */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Vista Previa
              </h2>
              {ticket && (
                <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                  ✅ Generado
                </span>
              )}
            </div>
            
            {ticket ? (
              <div className="space-y-6">
                {/* Ticket Preview */}
                <div className="transform hover:scale-[1.01] transition-transform duration-200">
                  <TicketPreview data={ticket} />
                </div>
                
                {/* Acciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={downloadTicket}
                    className="bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    📥 Descargar Ticket
                  </button>
                  <button
                    onClick={clearTicket}
                    className="bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    🗑 Generar Nuevo
                  </button>
                </div>

                {/* Información del Ticket */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Detalles del Ticket</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">ID del Ticket:</span>
                      <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                        {ticket.content.ticket_id}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Generado:</span>
                      <span className="text-blue-800">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-3 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center h-full flex items-center justify-center min-h-[400px]">
                <div>
                  <div className="text-6xl sm:text-8xl text-gray-300 mb-4">🎫</div>
                  <p className="text-gray-500 text-lg sm:text-xl mb-4">
                    Tu ticket generado aparecerá aquí
                  </p>
                  <p className="text-gray-400 text-sm">
                    Describe tu evento y haz clic en &quot;Generar Ticket con IA&quot;
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
