
'use client';
import { useState, useEffect, useRef } from 'react';

const App = () => {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board');
    const [drawnNumbers, setDrawnNumbers] = useState(new Set());
    const [lastDrawnNumber, setLastDrawnNumber] = useState(null);
    const [prize, setPrize] = useState('');
    const [value, setValue] = useState('');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [isWinnerConfirmed, setIsWinnerConfirmed] = useState(false);
    const [isDetailsConfirmed, setIsDetailsConfirmed] = useState(false);
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [raffleNumber, setRaffleNumber] = useState('');
    const [paidWithNequi, setPaidWithNequi] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketInfo, setTicketInfo] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const prevRaffleNumber = useRef(null);

    // Simulación de Firebase
    useEffect(() => {
        setTimeout(() => {
            setDb({}); 
            setUserId('demo-user-id');
            setLoading(false);
            
            setParticipants([
                { id: 1, name: 'Juan Pérez', phoneNumber: '3001234567', raffleNumber: '05' },
                { id: 2, name: 'María García', phoneNumber: '3109876543', raffleNumber: '12' },
                { id: 3, name: 'Carlos Rodríguez', phoneNumber: '3204567890', raffleNumber: '23' }
            ]);
            
            const exampleDrawn = new Set([5, 12, 23]);
            setDrawnNumbers(exampleDrawn);
        }, 1000);
    }, []);

    const showNotification = (message, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const showConfirmationDialog = (message, action) => {
        setConfirmationMessage(message);
        setConfirmationAction(() => action);
        setShowConfirmation(true);
    };

    const formatValue = (rawValue) => {
        if (!rawValue) return '';
        const numericValue = rawValue.replace(/[^\d.]/g, '');
        if (!numericValue) return '';
        
        const number = parseFloat(numericValue);
        if (isNaN(number)) return '';
        
        return currencySymbol + number.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const handleValueChange = (e) => {
        const inputValue = e.target.value;
        const cleanedValue = inputValue.replace(/[^\d.]/g, '');
        const parts = cleanedValue.split('.');
        if (parts.length > 2) {
            setValue(parts[0] + '.' + parts.slice(1).join(''));
        } else {
            setValue(cleanedValue);
        }
    };

    const handleRaffleNumberChange = (e) => {
        const inputValue = e.target.value.replace(/\D/g, '');
        if (inputValue === '' || (inputValue >= 1 && inputValue <= 99)) {
            setRaffleNumber(inputValue);
            
            if (inputValue && drawnNumbers.has(parseInt(inputValue))) {
                showNotification('Este número ya ha sido asignado', 'warning');
            }
        }
    };

    const drawRandomNumber = () => {
        if (!db || isWinnerConfirmed) return;
        
        const allNumbers = Array.from({ length: 99 }, (_, i) => i + 1);
        const takenNumbers = new Set(participants.map(p => parseInt(p.raffleNumber, 10)));
        const availableNumbers = allNumbers.filter(num => !takenNumbers.has(num));
        
        if (availableNumbers.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const newDrawnNumber = availableNumbers[randomIndex];
            
            const newParticipant = {
                id: Date.now(),
                raffleNumber: newDrawnNumber.toString(),
                name: 'Sorteo',
                phoneNumber: 'N/A',
                timestamp: new Date()
            };
            
            setParticipants([...participants, newParticipant]);
            setDrawnNumbers(new Set([...drawnNumbers, newDrawnNumber]));
            setLastDrawnNumber(newDrawnNumber);
            setIsWinnerConfirmed(false);
            
            showNotification(`Número ${newDrawnNumber} sorteado!`, 'success');
        } else {
            setLastDrawnNumber('¡Todos los números han sido sorteados!');
            showNotification('Todos los números han sido sorteados', 'info');
        }
    };

    const toggleNumber = (number) => {
        if (isWinnerConfirmed) {
            showNotification('El juego ha terminado. Reinicia el tablero para comenzar de nuevo.', 'info');
            return;
        }
        if (drawnNumbers.has(number)) {
            showNotification('Este número ya está asignado', 'warning');
            return;
        }
        setRaffleNumber(String(number));
        setActiveTab('register');
    };

    const handleConfirmWinner = () => {
        setIsWinnerConfirmed(true);
        showNotification('¡Ganador confirmado!', 'success');
    };

    const handleConfirmDetails = () => {
        if (!prize.trim()) {
            showNotification('Por favor ingresa el premio', 'warning');
            return;
        }
        if (!value.trim()) {
            showNotification('Por favor ingresa el valor', 'warning');
            return;
        }
        setIsDetailsConfirmed(true);
        showNotification('Detalles del premio confirmados', 'success');
    };

    const resetBoard = () => {
        showConfirmationDialog(
            '¿Estás seguro de que deseas reiniciar el tablero? Se perderán todos los datos.',
            () => {
                setDrawnNumbers(new Set());
                setLastDrawnNumber(null);
                setPrize('');
                setValue('');
                setName('');
                setPhoneNumber('');
                setRaffleNumber('');
                setPaidWithNequi(false);
                setIsWinnerConfirmed(false);
                setIsDetailsConfirmed(false);
                setParticipants([]);
                prevRaffleNumber.current = null;
                showNotification('Tablero reiniciado correctamente', 'success');
            }
        );
    };

    const handleTicketConfirmation = () => {
        if (!name.trim()) {
            showNotification('Por favor ingresa el nombre', 'warning');
            return;
        }
        if (!phoneNumber.trim()) {
            showNotification('Por favor ingresa el celular', 'warning');
            return;
        }
        if (!raffleNumber.trim()) {
            showNotification('Por favor ingresa el número de rifa', 'warning');
            return;
        }
        
        const num = parseInt(raffleNumber, 10);
        if (drawnNumbers.has(num)) {
            showNotification('Este número ya está asignado', 'warning');
            return;
        }

        const formattedRaffleNumber = String(num).padStart(2, '0');

        const newParticipant = {
            id: Date.now(),
            name,
            phoneNumber,
            raffleNumber: formattedRaffleNumber,
            paidWithNequi,
            timestamp: new Date()
        };
        
        setParticipants([...participants, newParticipant]);
        setDrawnNumbers(new Set([...drawnNumbers, num]));

        setTicketInfo({
            prize,
            value: formatValue(value),
            name,
            phoneNumber,
            raffleNumber: formattedRaffleNumber,
            paidWithNequi
        });
        
        setIsTicketModalOpen(true);
        
        setName('');
        setPhoneNumber('');
        setRaffleNumber('');
        setPaidWithNequi(false);
        prevRaffleNumber.current = null;

        showNotification('Tiquete generado correctamente', 'success');
    };

    const handlePayment = () => {
        // Lógica de pago simulada
        showNotification('Pago realizado con éxito!', 'success');
        setIsTicketModalOpen(false); // Cierra el modal después de pagar
    };

    const handleDownloadTicket = () => {
        if (!ticketInfo) return;
        
        const ticketText = `
--- Tiquete de Compra ---
Premio: ${ticketInfo.prize}
Valor: ${ticketInfo.value}
-------------------------
Nombre: ${ticketInfo.name}
Celular: ${ticketInfo.phoneNumber}
Número de Rifa: ${ticketInfo.raffleNumber}
Pago con Nequi: ${ticketInfo.paidWithNequi ? 'Sí' : 'No'}
-------------------------
        `.trim();

        const blob = new Blob([ticketText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiquete_${ticketInfo.raffleNumber}.txt`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Tiquete descargado', 'success');
    };

    const allNumbers = Array.from({ length: 99 }, (_, i) => i + 1);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 font-sans">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 text-center">
                    <h1 className="text-4xl font-bold mb-2">Tablero de Rifa</h1>
                    <p className="text-lg opacity-90">Gestiona tu rifa de forma fácil y divertida</p>
                </div>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'board' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('board')}
                    >
                        Tablero
                    </button>
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'register' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('register')}
                    >
                        Registrar
                    </button>
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'participants' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('participants')}
                    >
                        Participantes
                    </button>
                </div>

                <div className="p-6">
                    {notification.show && (
                        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
                            notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
                            notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}>
                            {notification.message}
                        </div>
                    )}

                    <div className={`tab-content ${activeTab === 'board' ? 'active' : ''}`}>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración del Premio</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="prize-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Premio:
                                    </label>
                                    <input
                                        id="prize-input"
                                        type="text"
                                        value={prize}
                                        onChange={(e) => setPrize(e.target.value)}
                                        placeholder="Ej: Carro, Moto, Dinero"
                                        disabled={isDetailsConfirmed}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="value-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor:
                                    </label>
                                    <input
                                        id="value-input"
                                        type="text"
                                        value={formatValue(value)}
                                        onChange={handleValueChange}
                                        placeholder="Ej: 5,000,000.00"
                                        disabled={isDetailsConfirmed}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            
                            {prize && value && !isDetailsConfirmed && (
                                <button
                                    onClick={handleConfirmDetails}
                                    className="px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                    Confirmar Detalles del Premio
                                </button>
                            )}
                            
                            {isDetailsConfirmed && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <h3 className="font-semibold text-green-800">Premio confirmado:</h3>
                                    <p className="text-lg">{prize} - {formatValue(value)}</p>
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Sorteo</h2>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <p className="text-lg font-semibold text-gray-700">Último número sorteado:</p>
                                <div className="mt-2 text-5xl font-bold text-purple-600">
                                    {lastDrawnNumber !== null ? (typeof lastDrawnNumber === 'number' ? String(lastDrawnNumber).padStart(2, '0') : lastDrawnNumber) : '--'}
                                </div>
                                {isWinnerConfirmed && (
                                    <p className="text-green-600 font-bold mt-2 text-lg">
                                        ¡Ganador confirmado! El juego ha terminado.
                                    </p>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                                {isDetailsConfirmed && (
                                    <button
                                        onClick={drawRandomNumber}
                                        disabled={isWinnerConfirmed}
                                        className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Sortear número aleatorio
                                    </button>
                                )}
                                {lastDrawnNumber !== null && typeof lastDrawnNumber === 'number' && !isWinnerConfirmed && (
                                    <button
                                        onClick={handleConfirmWinner}
                                        className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        Confirmar Ganador
                                    </button>
                                )}
                                <button
                                    onClick={resetBoard}
                                    className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Reiniciar Tablero
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tablero de Números</h2>
                            <div className="grid grid-cols-10 gap-2">
                                {allNumbers.map((number) => (
                                    <div
                                        key={number}
                                        onClick={() => toggleNumber(number)}
                                        className={`
                                            number-cell text-center py-2 rounded-lg transition-all 
                                            ${isWinnerConfirmed ? 'cursor-not-allowed bg-gray-300 text-gray-500' : 'cursor-pointer'}
                                            ${drawnNumbers.has(number)
                                                ? 'bg-purple-600 text-white shadow-lg transform scale-105 cursor-not-allowed'
                                                : isWinnerConfirmed ? '' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        {String(number).padStart(2, '0')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={`tab-content ${activeTab === 'register' ? 'active' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrar Participante</h2>
                        <fieldset disabled={isWinnerConfirmed} className="disabled:opacity-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label htmlFor="name-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo:
                                    </label>
                                    <input
                                        id="name-input"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Celular:
                                    </label>
                                    <input
                                        id="phone-input"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="Ej: 3001234567"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="raffle-number-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de rifa (1-99):
                                    </label>
                                    <input
                                        id="raffle-number-input"
                                        type="text"
                                        value={raffleNumber}
                                        onChange={handleRaffleNumberChange}
                                        placeholder="Ej: 5"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    {raffleNumber && drawnNumbers.has(parseInt(raffleNumber)) && (
                                        <p className="text-red-500 text-sm mt-1">Este número ya está asignado</p>
                                    )}
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleTicketConfirmation}
                                        disabled={!name || !phoneNumber || !raffleNumber || drawnNumbers.has(parseInt(raffleNumber)) || isWinnerConfirmed}
                                        className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Generar Tiquete
                                    </button>
                                </div>
                                 <div className="flex items-center pt-4">
                                     <input
                                         id="nequi-checkbox"
                                         type="checkbox"
                                         checked={paidWithNequi}
                                         onChange={(e) => setPaidWithNequi(e.target.checked)}
                                         className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                     />
                                     <label htmlFor="nequi-checkbox" className="ml-2 block text-sm font-medium text-gray-700">
                                         Consignación Nequi
                                     </label>
                                 </div>
                            </div>
                        </fieldset>

                        {isWinnerConfirmed && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                                <p className="font-bold">Juego terminado</p>
                                <p>El registro de nuevos participantes está deshabilitado porque ya se ha confirmado un ganador. Reinicia el tablero para comenzar una nueva rifa.</p>
                            </div>
                        )}
                        
                        {isDetailsConfirmed && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-4">
                                <h3 className="font-semibold text-purple-800">Premio en juego:</h3>
                                <p className="text-lg">{prize} - {formatValue(value)}</p>
                            </div>
                        )}
                    </div>

                    <div className={`tab-content ${activeTab === 'participants' ? 'active' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Participantes Registrados</h2>
                        {participants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nombre
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Celular
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Número
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {participants.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {p.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {p.phoneNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">
                                                    {p.raffleNumber}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No hay participantes registrados aún.</p>
                        )}
                    </div>
                </div>
            </div>

            {showConfirmation && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar acción</h3>
                        <p className="text-gray-500 mb-6">{confirmationMessage}</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if(confirmationAction) confirmationAction();
                                    setShowConfirmation(false);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isTicketModalOpen && ticketInfo && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Tiquete de Compra</h2>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold">Premio:</span>
                                <span>{ticketInfo.prize}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold">Valor:</span>
                                <span>{ticketInfo.value}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold">Nombre:</span>
                                <span>{ticketInfo.name}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold">Celular:</span>
                                <span>{ticketInfo.phoneNumber}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-semibold">Número de Rifa:</span>
                                <span className="text-purple-600 font-bold">{ticketInfo.raffleNumber}</span>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                             <button
                                onClick={handlePayment}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Pagar
                            </button>
                            <button
                                onClick={handleDownloadTicket}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                            >
                                Descargar Tiquete
                            </button>
                            <button
                                onClick={() => setIsTicketModalOpen(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

    