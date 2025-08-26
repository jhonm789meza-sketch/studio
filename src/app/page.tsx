'use client';
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RaffleManager } from '@/lib/RaffleManager';


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
    const [nequiAccountNumber, setNequiAccountNumber] = useState('');
    const [gameDate, setGameDate] = useState('');
    const [lottery, setLottery] = useState('');
    const [customLottery, setCustomLottery] = useState('');
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketInfo, setTicketInfo] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const prevRaffleNumber = useRef(null);
    const ticketModalRef = useRef(null);
    const [raffleManager, setRaffleManager] = useState(null);
    const [raffleRef, setRaffleRef] = useState('');

    useEffect(() => {
        const manager = new RaffleManager();
        setRaffleManager(manager);
        setRaffleRef(manager.getRef());
    }, []);

    // Simulación de Firebase
    useEffect(() => {
        setTimeout(() => {
            setDb({}); 
            setUserId('demo-user-id');
            setLoading(false);
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
        const numericValue = rawValue.toString().replace(/[^\d]/g, '');
        if (numericValue === '') return '';
        
        const number = parseFloat(numericValue);
        if (isNaN(number)) return '';
        
        return currencySymbol + ' ' + number.toLocaleString('es-CO');
    };

    const handleValueChange = (e) => {
        const inputValue = e.target.value;
        const numericValue = inputValue.replace(/[^\d]/g, '');
        setValue(numericValue);
    };

    const handleRaffleNumberChange = (e) => {
        const inputValue = e.target.value.replace(/\D/g, '');
        if (inputValue === '' || (inputValue >= 0 && inputValue <= 99)) {
            setRaffleNumber(inputValue);
            
            if (inputValue && drawnNumbers.has(parseInt(inputValue))) {
                showNotification('Este número ya ha sido asignado', 'warning');
            }
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
        setRaffleNumber(String(number).padStart(2, '0'));
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
        if (!gameDate) {
            showNotification('Por favor ingresa la fecha del juego', 'warning');
            return;
        }
        if (!lottery) {
            showNotification('Por favor selecciona la lotería', 'warning');
            return;
        }
        if (lottery === 'Otro' && !customLottery.trim()) {
            showNotification('Por favor especifica la lotería', 'warning');
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
                setNequiAccountNumber('');
                setGameDate('');
                setLottery('');
                setCustomLottery('');
                setIsWinnerConfirmed(false);
                setIsDetailsConfirmed(false);
                setParticipants([]);
                prevRaffleNumber.current = null;
                if (raffleManager) {
                    raffleManager.generateNewRef();
                    setRaffleRef(raffleManager.getRef());
                }
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
            timestamp: new Date()
        };
        
        setParticipants([...participants, newParticipant]);
        setDrawnNumbers(new Set([...drawnNumbers, num]));

        const currentDate = new Date();
        setTicketInfo({
            prize,
            value: formatValue(value),
            name,
            phoneNumber,
            raffleNumber: formattedRaffleNumber,
            date: currentDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: currentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            gameDate,
            lottery: lottery === 'Otro' ? customLottery : lottery,
        });
        
        setIsTicketModalOpen(true);
        
        setName('');
        setPhoneNumber('');
        setRaffleNumber('');
        
        prevRaffleNumber.current = null;

        showNotification('Tiquete generado correctamente', 'success');
    };

    const handlePayment = () => {
        // Lógica de pago simulada
        showNotification('Pago realizado con éxito!', 'success');
    };

    const handleDownloadTicket = () => {
        if (!ticketModalRef.current) return;

        html2canvas(ticketModalRef.current, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`tiquete_${ticketInfo.raffleNumber}.pdf`);
            showNotification('Tiquete descargado', 'success');
        });
    };

    const allNumbers = Array.from({ length: 100 }, (_, i) => i);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 font-sans">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 text-center">
                    <h1 className="text-4xl font-bold mb-2">Tablero de Rifa</h1>
                    <p className="text-lg opacity-90">Referencia del Juego: {raffleRef}</p>
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
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                                        placeholder="Ej: 5.000.000"
                                        disabled={isDetailsConfirmed}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="game-date-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de juego:
                                    </label>
                                    <input
                                        id="game-date-input"
                                        type="date"
                                        value={gameDate}
                                        onChange={(e) => setGameDate(e.target.value)}
                                        disabled={isDetailsConfirmed}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lottery-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Lotería:
                                    </label>
                                    <select
                                        id="lottery-input"
                                        value={lottery}
                                        onChange={(e) => setLottery(e.target.value)}
                                        disabled={isDetailsConfirmed}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Selecciona una lotería</option>
                                        <option value="Lotería de Bogotá">Lotería de Bogotá</option>
                                        <option value="Lotería de Medellín">Lotería de Medellín</option>
                                        <option value="Lotería de Cundinamarca">Lotería de Cundinamarca</option>
                                        <option value="Lotería del Valle">Lotería del Valle</option>
                                        <option value="Lotería del Tolima">Lotería del Tolima</option>
                                        <option value="Lotería de la Cruz Roja">Lotería de la Cruz Roja</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                 {lottery === 'Otro' && (
                                     <div>
                                         <label htmlFor="custom-lottery-input" className="block text-sm font-medium text-gray-700 mb-1">
                                             Especificar Lotería:
                                         </label>
                                         <input
                                             id="custom-lottery-input"
                                             type="text"
                                             value={customLottery}
                                             onChange={(e) => setCustomLottery(e.target.value)}
                                             placeholder="Nombre de la lotería"
                                             disabled={isDetailsConfirmed}
                                             className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                         />
                                     </div>
                                 )}
                                <div className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label htmlFor="nequi-account-input" className="block text-sm font-medium text-gray-700 mb-1">
                                            Número de Cuenta Nequi:
                                        </label>
                                        <input
                                            id="nequi-account-input"
                                            type="tel"
                                            value={nequiAccountNumber}
                                            onChange={(e) => setNequiAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Ej: 3001234567"
                                            disabled={isDetailsConfirmed}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePayment}
                                        className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors h-10"
                                        disabled={!nequiAccountNumber || isDetailsConfirmed}
                                    >
                                        Pagar
                                    </button>
                                </div>
                                {!isDetailsConfirmed && (
                                    <div className="md:col-span-2">
                                        <button
                                            onClick={handleConfirmDetails}
                                            className="px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                        >
                                            Confirmar Detalles del Premio
                                        </button>
                                    </div>
                                )}
                             </div>
                         </div>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Sorteo</h2>
                            <div className="flex flex-wrap gap-3">
                                {isWinnerConfirmed && (
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
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                Tablero de Números
                                <span className="ml-2 text-base font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    Ref: {raffleRef}
                                </span>
                            </h2>
                            <div className="grid grid-cols-10 gap-2">
                                {allNumbers.map((number) => (
                                    <div
                                        key={number}
                                        onClick={() => toggleNumber(number)}
                                        className={`
                                            number-cell text-center py-2 rounded-lg transition-all 
                                            ${isWinnerConfirmed ? 'cursor-not-allowed bg-gray-300 text-gray-500' : 'cursor-pointer'}
                                            ${isDetailsConfirmed && drawnNumbers.has(number)
                                                ? 'bg-red-600 text-white shadow-lg transform scale-105 cursor-not-allowed'
                                                : 'bg-green-200 text-green-800 hover:bg-green-300 hover:shadow-md'
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
                        <fieldset disabled={isWinnerConfirmed || !isDetailsConfirmed} className="disabled:opacity-50 space-y-4">
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
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ej: 3001234567"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="raffle-number-input" className="block text-sm font-medium text-gray-700 mb-1">
                                    Número de rifa (00-99):
                                </label>
                                <input
                                    id="raffle-number-input"
                                    type="text"
                                    value={raffleNumber}
                                    onChange={handleRaffleNumberChange}
                                    placeholder="Ej: 05"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                {raffleNumber && drawnNumbers.has(parseInt(raffleNumber)) && (
                                    <p className="text-red-500 text-sm mt-1">Este número ya está asignado</p>
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={handleTicketConfirmation}
                                    disabled={!name || !phoneNumber || !raffleNumber || drawnNumbers.has(parseInt(raffleNumber)) || isWinnerConfirmed}
                                    className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Generar Tiquete
                                </button>
                            </div>
                        </fieldset>

                        {!isDetailsConfirmed && (
                             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes confirmar los detalles del premio en la pestaña "Tablero" para poder registrar participantes.</p>
                            </div>
                        )}

                        {isWinnerConfirmed && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Juego terminado</p>
                                <p>El registro de nuevos participantes está deshabilitado porque ya se ha confirmado un ganador. Reinicia el tablero para comenzar una nueva rifa.</p>
                            </div>
                        )}
                    </div>

                    <div className={`tab-content ${activeTab === 'participants' ? 'active' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Participantes Registrados</h2>
                        {!isDetailsConfirmed ? (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes confirmar los detalles del premio en la pestaña "Tablero" para poder ver los participantes.</p>
                            </div>
                        ) : participants.length > 0 ? (
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
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 font-mono">
                    <div ref={ticketModalRef} className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 border-b border-dashed border-gray-400">
                            <h2 className="text-2xl font-bold text-center mb-4">RIFA EXPRESS</h2>
                            <p className="text-center text-sm text-gray-600">COMPROBANTE DE COMPRA</p>
                            <div className="text-center text-sm text-gray-600 mt-2">
                                <span>{ticketInfo.date}</span> - <span>{ticketInfo.time}</span>
                            </div>
                        </div>

                        <div className="p-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">CLIENTE:</span>
                                <span className="font-semibold text-right">{ticketInfo.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">CELULAR:</span>
                                <span className="font-semibold">{ticketInfo.phoneNumber}</span>
                            </div>
                            
                            <div className="border-t border-b border-dashed border-gray-400 my-4 py-4 space-y-2">
                                <p className="text-center font-bold text-base">DETALLES DE LA RIFA</p>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">PREMIO:</span>
                                    <span className="font-semibold text-right">{ticketInfo.prize}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">VALOR BOLETA:</span>
                                    <span className="font-semibold">{ticketInfo.value}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">FECHA SORTEO:</span>
                                    <span className="font-semibold">{new Date(ticketInfo.gameDate + 'T00:00:00-05:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">JUEGA CON:</span>
                                    <span className="font-semibold">{ticketInfo.lottery}</span>
                                </div>
                                <div className="text-center pt-4">
                                    <p className="text-gray-600 uppercase">Número Asignado</p>
                                    <p className="text-6xl font-bold text-purple-600 tracking-wider">{ticketInfo.raffleNumber}</p>
                                </div>
                            </div>
                            
                            <p className="text-center text-xs text-gray-500 mt-4">
                                ¡Gracias por participar!
                            </p>
                        </div>
                        
                        <div className="p-6 bg-gray-50 rounded-b-lg flex flex-col items-center">
                             <div className="mt-6 flex justify-end space-x-3 w-full">
                                <button
                                    onClick={handleDownloadTicket}
                                    className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold shadow-md"
                                >
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={() => setIsTicketModalOpen(false)}
                                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
