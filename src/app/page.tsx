'use client';
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RaffleManager } from '@/lib/RaffleManager';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';

type RaffleMode = 'two-digit' | 'three-digit';

const initialRaffleData = {
    drawnNumbers: [],
    lastDrawnNumber: null,
    prize: '',
    value: '10000',
    isWinnerConfirmed: false,
    isDetailsConfirmed: false,
    name: '',
    phoneNumber: '',
    raffleNumber: '',
    nequiAccountNumber: '3145696687',
    gameDate: '',
    lottery: '',
    customLottery: '',
    organizerName: '',
    participants: [],
    raffleRef: '',
    winner: null,
    manualWinnerNumber: '',
    isPaid: false, // New field to track payment status
};


const App = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board');
    const [currencySymbol] = useState('$');

    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketInfo, setTicketInfo] = useState<any>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    
    const ticketModalRef = useRef(null);

    const [raffleMode, setRaffleMode] = useState<RaffleMode>('two-digit');
    
    const [twoDigitState, setTwoDigitState] = useState<any>(initialRaffleData);
    const [threeDigitState, setThreeDigitState] = useState<any>(initialRaffleData);

    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
    const [adminRefSearch, setAdminRefSearch] = useState('');
    const [paymentInitiated, setPaymentInitiated] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const currentState = raffleMode === 'two-digit' ? twoDigitState : threeDigitState;
    const setCurrentState = raffleMode === 'two-digit' ? setTwoDigitState : setThreeDigitState;

    const raffleManager = new RaffleManager(db);

    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;

    useEffect(() => {
        setLoading(true);
        const unsubTwoDigit = onSnapshot(doc(db, "raffles", "two-digit"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setTwoDigitState({ ...initialRaffleData, ...docSnapshot.data() });
            } else {
                setDoc(doc(db, "raffles", "two-digit"), initialRaffleData, { merge: true });
            }
            setLoading(false);
        });
        const unsubThreeDigit = onSnapshot(doc(db, "raffles", "three-digit"), (docSnapshot) => {
             if (docSnapshot.exists()) {
                setThreeDigitState({ ...initialRaffleData, ...docSnapshot.data() });
            } else {
                setDoc(doc(db, "raffles", "three-digit"), initialRaffleData, { merge: true });
            }
             setLoading(false);
        });


        return () => {
            unsubTwoDigit();
            unsubThreeDigit();
        };
    }, []);

    const showNotification = (message: string, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const showConfirmationDialog = (message: string, action: () => void) => {
        setConfirmationMessage(message);
        setConfirmationAction(() => action);
        setShowConfirmation(true);
    };
    
    const formatValue = (rawValue: string) => {
        if (!rawValue) return '';
        const numericValue = rawValue.toString().replace(/[^\d]/g, '');
        if (numericValue === '') return '';
        
        const number = parseFloat(numericValue);
        if (isNaN(number)) return '';
        
        return currencySymbol + ' ' + number.toLocaleString('es-CO');
    };

    const handleRaffleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.replace(/\D/g, '');
        setPaymentInitiated(false);
        setCurrentState((s:any) => ({...s, raffleNumber: inputValue, name: '', phoneNumber: ''}));

        if (inputValue.length === numberLength && new Set(currentState.drawnNumbers).has(parseInt(inputValue))) {
             showNotification('Este número ya ha sido asignado', 'warning');
        }
    };
    
    const handleLocalFieldChange = (field: string, value: any) => {
        if (field === 'raffleNumber') {
          setPaymentInitiated(false);
          setCurrentState((s: any) => ({ ...s, name: '', phoneNumber: '', [field]: value }));
        } else {
          setCurrentState((s: any) => ({ ...s, [field]: value }));
        }
    };

    const toggleNumber = (number: number) => {
        if (currentState.isWinnerConfirmed) {
            showNotification('El juego ha terminado. Reinicia el tablero para comenzar de nuevo.', 'info');
            return;
        }
        if (new Set(currentState.drawnNumbers).has(number)) {
            showNotification('Este número ya está asignado', 'warning');
            return;
        }
        setPaymentInitiated(false);
        setCurrentState((s:any) => ({ ...s, raffleNumber: String(number).padStart(numberLength, '0'), name: '', phoneNumber: '' }));
        setActiveTab('register');
    };

    const handleConfirmWinner = async () => {
        if (!currentState.winner) {
            showNotification('Primero debes sortear un ganador.', 'warning');
            return;
        }
        await setDoc(doc(db, "raffles", raffleMode), { isWinnerConfirmed: true }, { merge: true });
        showNotification('¡Resultado confirmado! El tablero ha sido bloqueado.', 'success');
    };

    const handleConfirmDetails = async () => {
        if (!currentState.organizerName.trim()) {
            showNotification('Por favor ingresa el nombre del organizador', 'warning');
            return;
        }
        if (!currentState.prize.trim()) {
            showNotification('Por favor ingresa el premio', 'warning');
            return;
        }
        if (!currentState.value.trim()) {
            showNotification('Por favor ingresa el valor', 'warning');
            return;
        }
        if (!currentState.gameDate) {
            showNotification('Por favor ingresa la fecha del juego', 'warning');
            return;
        }
        if (!currentState.lottery) {
            showNotification('Por favor selecciona la lotería', 'warning');
            return;
        }
        if (currentState.lottery === 'Otro' && !currentState.customLottery.trim()) {
            showNotification('Por favor especifica la lotería', 'warning');
            return;
        }
        if (!currentState.nequiAccountNumber.trim()) {
            showNotification('Por favor ingresa el número de cuenta Nequi', 'warning');
            return;
        }
        
        const newRef = await raffleManager.startNewRaffle();
        const raffleData = {
            ...currentState,
            raffleRef: newRef,
            isDetailsConfirmed: true,
        };

        await setDoc(doc(db, "raffles", raffleMode), raffleData, { merge: true });
        showNotification('Detalles del premio confirmados', 'success');
    };

    const resetBoard = () => {
        showConfirmationDialog(
            '¿Estás seguro de que deseas reiniciar el tablero? Se perderán todos los datos de esta modalidad.',
            async () => {
                await deleteDoc(doc(db, "raffles", raffleMode));
                const resetState = { ...initialRaffleData };
                if (raffleMode === 'two-digit') {
                    setTwoDigitState(resetState);
                } else {
                    setThreeDigitState(resetState);
                }
                await setDoc(doc(db, "raffles", raffleMode), resetState, { merge: true });
                showNotification('Tablero reiniciado correctamente', 'success');
                setShowConfetti(false);
            }
        );
    };

    const handleTicketConfirmation = async () => {
        if (!currentState.name.trim()) {
            showNotification('Por favor ingresa el nombre', 'warning');
            return;
        }
        if (!currentState.phoneNumber.trim()) {
            showNotification('Por favor ingresa el celular', 'warning');
            return;
        }
        if (!currentState.raffleNumber.trim()) {
            showNotification('Por favor ingresa el número de rifa', 'warning');
            return;
        }
        
        const num = parseInt(currentState.raffleNumber, 10);

        if (currentState.raffleNumber.length !== numberLength) {
             showNotification(`El número para esta modalidad debe ser de ${numberLength} cifras`, 'warning');
             return;
        }

        if (raffleMode === 'three-digit' && (num < 100 || num > 999)) {
            if (String(num).length === 3) { // Only show if the user has typed a 3 digit number.
                showNotification('El número para esta modalidad debe estar entre 100 y 999', 'warning');
            }
            return;
        }

        if (new Set(currentState.drawnNumbers).has(num)) {
            showNotification('Este número ya está asignado', 'warning');
            return;
        }

        const formattedRaffleNumber = String(num).padStart(numberLength, '0');

        const newParticipant = {
            id: Date.now(),
            name: currentState.name,
            phoneNumber: currentState.phoneNumber,
            raffleNumber: formattedRaffleNumber,
            timestamp: new Date()
        };
        
        const updatedParticipants = [...currentState.participants, newParticipant];
        const updatedDrawnNumbers = [...currentState.drawnNumbers, num];

        await setDoc(doc(db, "raffles", raffleMode), {
            participants: updatedParticipants,
            drawnNumbers: updatedDrawnNumbers
        }, { merge: true });

        const ticketData = {
            prize: currentState.prize,
            value: formatValue(currentState.value),
            name: currentState.name,
            phoneNumber: currentState.phoneNumber,
            raffleNumber: formattedRaffleNumber,
            date: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            gameDate: currentState.gameDate,
            lottery: currentState.lottery === 'Otro' ? currentState.customLottery : currentState.lottery,
            raffleRef: currentState.raffleRef,
            organizerName: currentState.organizerName,
        };
        
        setTicketInfo(ticketData);
        setIsTicketModalOpen(true);
        setPaymentInitiated(false);
        
        setCurrentState((s:any) => ({
            ...s,
            name: '',
            phoneNumber: '',
            raffleNumber: '',
        }));

        showNotification('Tiquete generado correctamente', 'success');
    };

    const handleDownloadTicket = () => {
        if (!ticketModalRef.current || !ticketInfo) return;

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
    
    const changeRaffleMode = (mode: RaffleMode) => {
        if (mode === raffleMode) return;
        setRaffleMode(mode);
        setActiveTab('board'); // Reset to board tab on mode change
        showNotification(`Cambiado a modo de ${mode === 'two-digit' ? '2' : '3'} cifras.`, 'success');
    };

    const handleAdminSearch = async () => {
        if (!adminRefSearch.trim()) {
            showNotification('Por favor, ingresa una referencia.', 'warning');
            return;
        }
        
        const twoDigitDoc = await getDoc(doc(db, "raffles", "two-digit"));
        const threeDigitDoc = await getDoc(doc(db, "raffles", "three-digit"));

        let found = false;
        if (twoDigitDoc.exists() && twoDigitDoc.data().raffleRef && twoDigitDoc.data().raffleRef.toLowerCase() === adminRefSearch.toLowerCase()) {
            setRaffleMode('two-digit');
            found = true;
        } else if (threeDigitDoc.exists() && threeDigitDoc.data().raffleRef && threeDigitDoc.data().raffleRef.toLowerCase() === adminRefSearch.toLowerCase()) {
            setRaffleMode('three-digit');
            found = true;
        }

        if (found) {
            showNotification(`Cargando rifa con referencia: ${adminRefSearch}`, 'success');
            setIsAdminLoginOpen(false);
            setAdminRefSearch('');
            setActiveTab('board');
        } else {
            showNotification('No se encontró ninguna rifa en juego con esa referencia.', 'error');
        }
    };
    
    const handleDrawWinner = async () => {
        const winningNumberStr = currentState.manualWinnerNumber;
        if (!winningNumberStr || winningNumberStr.length !== numberLength) {
            showNotification(`Por favor, ingresa un número ganador válido de ${numberLength} cifras.`, 'warning');
            return;
        }

        const winner = currentState.participants.find((p: any) => p.raffleNumber === winningNumberStr);

        if (winner) {
            await setDoc(doc(db, "raffles", raffleMode), { winner }, { merge: true });
            setShowConfetti(true);
            showNotification(`¡El ganador es ${winner.name} con el número ${winner.raffleNumber}!`, 'success');
            setTimeout(() => setShowConfetti(false), 8000);
        } else {
            // Number was not sold
             const houseWinner = {
                name: "El Premio Queda en Casa",
                raffleNumber: winningNumberStr,
                isHouse: true,
            };
            await setDoc(doc(db, "raffles", raffleMode), { winner: houseWinner }, { merge: true });
            showNotification(`El número ${winningNumberStr} no fue vendido. El premio queda en casa.`, 'info');
        }
    };

    const handleFieldChange = async (field: string, value: any) => {
        if (currentState.isDetailsConfirmed) return;
        try {
            await setDoc(doc(db, "raffles", raffleMode), { [field]: value }, { merge: true });
        } catch (error) {
            console.error("Error updating document:", error);
            showNotification("Error al guardar los cambios.", "error");
        }
    };
    
    const handleActivateBoard = async () => {
        showConfirmationDialog(
            `Estás a punto de pagar $10.000 para activar este tablero de ${raffleMode === 'two-digit' ? '2' : '3'} cifras. ¿Continuar?`,
            async () => {
                try {
                    await setDoc(doc(db, "raffles", raffleMode), { isPaid: true }, { merge: true });
                    showNotification('¡Tablero activado! Ahora puedes configurar los detalles del premio.', 'success');
                } catch (error) {
                    console.error("Error activating board:", error);
                    showNotification("Error al activar el tablero.", "error");
                }
            }
        );
    };

    const allNumbers = raffleMode === 'two-digit'
        ? Array.from({ length: 100 }, (_, i) => i)
        : Array.from({ length: 900 }, (_, i) => i + 100);

    const twoDigitRafflesInPlay = twoDigitState.isDetailsConfirmed ? 1 : 0;
    const threeDigitRafflesInPlay = threeDigitState.isDetailsConfirmed ? 1 : 0;
    
    const drawnNumbersSet = new Set(currentState.drawnNumbers);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Cargando...</div>;
    }

    const nequiPaymentUrl = `nequi://app/transfer?phone=${currentState.nequiAccountNumber}&amount=${currentState.value.replace(/[^\d]/g, '')}&message=${encodeURIComponent(`Pago Rifa: ${currentState.raffleRef}`)}`;
    
    const isRegisterReadyForPayment = currentState.raffleNumber && !drawnNumbersSet.has(parseInt(currentState.raffleNumber));
    const isRegisterFormValidForSubmit = currentState.name && currentState.phoneNumber && isRegisterReadyForPayment;

    const renderBoardContent = () => {
        if (!currentState.isPaid) {
            return (
                <div className="text-center p-10 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Tablero Bloqueado</h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Para usar este tablero de rifa de {raffleMode === 'two-digit' ? '2' : '3'} cifras, necesitas activarlo.
                    </p>
                    <Button onClick={handleActivateBoard} size="lg" className="bg-green-500 hover:bg-green-600 text-white font-bold">
                        Pagar $10,000 para Activar
                    </Button>
                </div>
            )
        }
        return (
            <>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración del Premio</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div>
                           <Label htmlFor="organizer-name-input">Organizador:</Label>
                           <Input
                               id="organizer-name-input"
                               type="text"
                               value={currentState.organizerName}
                               onChange={(e) => handleLocalFieldChange('organizerName', e.target.value)}
                               onBlur={(e) => handleFieldChange('organizerName', e.target.value)}
                               placeholder="Nombre del organizador"
                               disabled={currentState.isDetailsConfirmed}
                               className="w-full mt-1"
                           />
                       </div>
                       <div>
                           <Label htmlFor="prize-input">Premio:</Label>
                           <Input
                               id="prize-input"
                               type="text"
                               value={currentState.prize}
                               onChange={(e) => handleLocalFieldChange('prize', e.target.value)}
                               onBlur={(e) => handleFieldChange('prize', e.target.value)}
                               placeholder="Ej: Carro, Moto, Dinero"
                               disabled={currentState.isDetailsConfirmed}
                               className="w-full mt-1"
                           />
                       </div>
                       <div>
                           <Label htmlFor="value-input">Valor:</Label>
                           <Input
                               id="value-input"
                               type="text"
                               value={formatValue(currentState.value)}
                               onChange={(e) => {
                                   const numericValue = e.target.value.replace(/[^\d]/g, '');
                                   handleLocalFieldChange('value', numericValue);
                               }}
                               onBlur={(e) => {
                                   const numericValue = e.target.value.replace(/[^\d]/g, '');
                                   handleFieldChange('value', numericValue)
                               }}
                               placeholder="Ej: 5.000.000"
                               disabled={currentState.isDetailsConfirmed}
                               className="w-full mt-1"
                           />
                       </div>
                       <div>
                           <Label htmlFor="game-date-input">Fecha de juego:</Label>
                           <Input
                               id="game-date-input"
                               type="date"
                               value={currentState.gameDate}
                               onChange={(e) => handleLocalFieldChange('gameDate', e.target.value)}
                               onBlur={(e) => handleFieldChange('gameDate', e.target.value)}
                               disabled={currentState.isDetailsConfirmed}
                               className="w-full mt-1"
                           />
                       </div>
                       <div className='grid grid-cols-2 gap-4'>
                           <div>
                               <Label htmlFor="lottery-input">Lotería:</Label>
                               <select
                                   id="lottery-input"
                                   value={currentState.lottery}
                                   onChange={(e) => {
                                       const value = e.target.value;
                                       handleLocalFieldChange('lottery', value);
                                       handleFieldChange('lottery', value);
                                   }}
                                   disabled={currentState.isDetailsConfirmed}
                                   className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed mt-1"
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
                           <div>
                           <Label htmlFor="nequi-account-input">Número cuenta Nequi:</Label>
                           <Input
                               id="nequi-account-input"
                               type="tel"
                               value={currentState.nequiAccountNumber}
                               onChange={(e) => handleLocalFieldChange('nequiAccountNumber', e.target.value.replace(/\D/g, ''))}
                               onBlur={(e) => handleFieldChange('nequiAccountNumber', e.target.value.replace(/\D/g, ''))}
                               placeholder="Número de Nequi para pagos"
                               disabled={currentState.isDetailsConfirmed}
                               className="w-full mt-1"
                           />
                       </div>
                       </div>

                        {currentState.lottery === 'Otro' && (
                            <div>
                                <Label htmlFor="custom-lottery-input">Especificar Lotería:</Label>
                                <Input
                                    id="custom-lottery-input"
                                    type="text"
                                    value={currentState.customLottery}
                                    onChange={(e) => handleLocalFieldChange('customLottery', e.target.value)}
                                    onBlur={(e) => handleFieldChange('customLottery', e.target.value)}
                                    placeholder="Nombre de la lotería"
                                    disabled={currentState.isDetailsConfirmed}
                                    className="w-full mt-1"
                                />
                            </div>
                        )}
                       {!currentState.isDetailsConfirmed && (
                           <div className="md:col-span-2">
                               <Button
                                   onClick={handleConfirmDetails}
                                   className="w-full md:w-auto bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                               >
                                   Confirmar Detalles del Premio
                               </Button>
                           </div>
                       )}
                    </div>
                </div>
               <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                   <h2 className="text-2xl font-bold text-gray-800 mb-4">Sorteo</h2>
                    {currentState.winner && (
                       <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                           {currentState.winner.isHouse ? (
                               <p className="font-bold text-lg flex items-center"><House className="mr-2"/>¡El premio queda en casa!</p>
                           ) : (
                               <p className="font-bold text-lg flex items-center"><Award className="mr-2"/>¡Tenemos un ganador!</p>
                           )}
                           <p><strong>Número:</strong> {currentState.winner.raffleNumber}</p>
                           {!currentState.winner.isHouse && (
                            <p><strong>Nombre:</strong> {currentState.winner.name}</p>
                           )}
                       </div>
                   )}
                   <div className="flex flex-wrap gap-3 items-center">
                       {!currentState.isWinnerConfirmed && (
                           <>
                               <div className="flex items-center gap-2">
                                   <Label htmlFor="manual-winner-input" className="sr-only">Número Ganador</Label>
                                   <Input
                                       id="manual-winner-input"
                                       type="text"
                                       placeholder={`Número (${numberLength} cifras)`}
                                       value={currentState.manualWinnerNumber}
                                       onChange={(e) => handleLocalFieldChange('manualWinnerNumber', e.target.value.replace(/\D/g, ''))}
                                       maxLength={numberLength}
                                       disabled={currentState.isWinnerConfirmed || currentState.participants.length === 0}
                                       className="w-36"
                                   />
                                   <Button
                                       onClick={handleDrawWinner}
                                       disabled={currentState.isWinnerConfirmed || currentState.participants.length === 0}
                                       className="bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                                   >
                                       Buscar Ganador
                                   </Button>
                               </div>
                           </>
                       )}
                       {currentState.winner && !currentState.isWinnerConfirmed && (
                           <Button
                               onClick={handleConfirmWinner}
                               className="bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                           >
                               Confirmar Resultado
                           </Button>
                       )}
                       <Button
                           onClick={resetBoard}
                           className="bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                       >
                           Reiniciar Tablero
                       </Button>
                   </div>
                   {currentState.isWinnerConfirmed && (
                       <p className="mt-4 text-green-600 font-semibold">El resultado ha sido confirmado y el tablero está cerrado.</p>
                   )}
               </div>

               <div>
                   <div className="flex justify-between items-center mb-4">
                       <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                           Tablero de Números ({raffleMode === 'two-digit' ? '00-99' : '100-999'})
                           {currentState.isDetailsConfirmed && currentState.raffleRef && (
                             <span className="ml-2 text-base font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                 Ref: {currentState.raffleRef}
                             </span>
                           )}
                       </h2>
                   </div>
                   <div className={`grid gap-2 ${raffleMode === 'two-digit' ? 'grid-cols-10' : 'grid-cols-10 md:grid-cols-20 lg:grid-cols-25'}`}>
                       {allNumbers.map((number) => (
                           <div
                               key={number}
                               onClick={() => toggleNumber(number)}
                               className={`
                                   number-cell text-center py-2 rounded-lg transition-all text-sm
                                   ${currentState.isWinnerConfirmed ? 'cursor-not-allowed bg-gray-300 text-gray-500' : 'cursor-pointer'}
                                   ${currentState.isDetailsConfirmed && drawnNumbersSet.has(number)
                                       ? 'bg-red-600 text-white shadow-lg transform scale-105 cursor-not-allowed'
                                       : 'bg-green-200 text-green-800 hover:bg-green-300 hover:shadow-md'
                                   }
                                   ${currentState.winner?.raffleNumber === String(number).padStart(numberLength, '0') ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                               `}
                           >
                               {String(number).padStart(numberLength, '0')}
                           </div>
                       ))}
                   </div>
               </div>
            </>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 font-sans">
            {showConfetti && <Confetti />}
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex justify-between items-center">
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuCheckboxItem
                                    checked={raffleMode === 'two-digit'}
                                    onSelect={() => changeRaffleMode('two-digit')}
                                >
                                    Rifa de 2 Cifras
                                    {twoDigitRafflesInPlay > 0 && (
                                        <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {twoDigitRafflesInPlay} en juego
                                        </span>
                                    )}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={raffleMode === 'three-digit'}
                                    onSelect={() => changeRaffleMode('three-digit')}
                                >
                                    Rifa de 3 Cifras
                                    {threeDigitRafflesInPlay > 0 && (
                                        <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {threeDigitRafflesInPlay} en juego
                                        </span>
                                    )}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setIsAdminLoginOpen(true)}>
                                    Buscar por Referencia
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-bold">Tablero de Rifa</h1>
                        {currentState.isDetailsConfirmed && currentState.raffleRef && (
                           <p className="text-lg opacity-90">Referencia del Juego: {currentState.raffleRef}</p>
                        )}
                    </div>
                    <div></div>
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
                        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
                            notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
                            notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}>
                            {notification.message}
                        </div>
                    )}

                    <div className={`tab-content ${activeTab === 'board' ? 'active' : ''}`}>
                         {renderBoardContent()}
                    </div>

                    <div className={`tab-content ${activeTab === 'register' ? 'active' : ''}`}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrar Participante</h2>
                        <fieldset disabled={currentState.isWinnerConfirmed || !currentState.isDetailsConfirmed || !currentState.isPaid} className="disabled:opacity-50 space-y-4">
                            <div>
                                <Label htmlFor="raffle-number-input">Número de rifa ({raffleMode === 'two-digit' ? '00-99' : '100-999'}):</Label>
                                <Input
                                    id="raffle-number-input"
                                    type="text"
                                    value={currentState.raffleNumber}
                                    onChange={handleRaffleNumberChange}
                                    placeholder={`Ej: ${raffleMode === 'two-digit' ? '05' : '142'}`}
                                    className="w-full mt-1"
                                    maxLength={numberLength}
                                />
                                {currentState.raffleNumber && drawnNumbersSet.has(parseInt(currentState.raffleNumber)) && (
                                    <p className="text-red-500 text-sm mt-1">Este número ya está asignado</p>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <a
                                    href={isRegisterReadyForPayment ? nequiPaymentUrl : '#'}
                                    className={`inline-block px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors h-10 leading-tight ${(!isRegisterReadyForPayment || !currentState.nequiAccountNumber || !currentState.value) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-disabled={!isRegisterReadyForPayment || !currentState.nequiAccountNumber || !currentState.value}
                                    onClick={(e) => {
                                        if (!isRegisterReadyForPayment || !currentState.nequiAccountNumber || !currentState.value) {
                                            e.preventDefault();
                                            showNotification('Completa todos los campos para poder pagar.', 'warning');
                                        } else {
                                            setPaymentInitiated(true);
                                            showNotification('Redirigiendo a Nequi... Una vez completes el pago, podrás generar tu tiquete.', 'info');
                                        }
                                    }}
                                >
                                    Pagar con Nequi
                                </a>
                            </div>

                            <fieldset disabled={!paymentInitiated} className="space-y-4">
                                <div>
                                    <Label htmlFor="name-input">Nombre completo:</Label>
                                    <Input
                                        id="name-input"
                                        type="text"
                                        value={currentState.name}
                                        onChange={(e) => handleLocalFieldChange('name', e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="phone-input">Celular:</Label>
                                    <Input
                                        id="phone-input"
                                        type="tel"
                                        value={currentState.phoneNumber}
                                        onChange={(e) => handleLocalFieldChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Ej: 3001234567"
                                        className="w-full mt-1"
                                    />
                                </div>
                            </fieldset>

                             <Button
                                onClick={handleTicketConfirmation}
                                disabled={!paymentInitiated || !isRegisterFormValidForSubmit || currentState.isWinnerConfirmed}
                                className="w-full px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Generar Tiquete
                            </Button>

                            {paymentInitiated && (
                                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mt-4" role="alert">
                                    <p className="font-bold">Acción requerida</p>
                                    <p>Si ya has completado el pago en Nequi, completa tu información y haz clic en "Generar Tiquete" para confirmar tu número.</p>
                                </div>
                            )}
                        </fieldset>

                        {(!currentState.isDetailsConfirmed || !currentState.isPaid) && (
                             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes activar y confirmar los detalles del premio en la pestaña "Tablero" para poder registrar participantes.</p>
                            </div>
                        )}

                        {currentState.isWinnerConfirmed && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Juego terminado</p>
                                <p>El registro de nuevos participantes está deshabilitado porque ya se ha confirmado un ganador. Reinicia el tablero para comenzar una nueva rifa.</p>
                            </div>
                        )}
                    </div>

                    <div className={`tab-content ${activeTab === 'participants' ? 'active' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold text-gray-800">Participantes Registrados</h2>
                        </div>

                        {!currentState.isDetailsConfirmed || !currentState.isPaid ? (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes activar y confirmar los detalles del premio en la pestaña "Tablero" para poder ver los participantes.</p>
                            </div>
                        ) : currentState.participants.length > 0 ? (
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
                                        {currentState.participants.map((p: any) => (
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
                            <p className="text-gray-500">No hay participantes registrados.</p>
                        )}
                    </div>
                </div>
            </div>

            {showConfirmation && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[101]">
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
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[101] font-mono">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
                        <div ref={ticketModalRef} className="bg-white rounded-t-lg p-6">
                            <div className="border-b border-dashed border-gray-400 pb-6">
                                <h2 className="text-2xl font-bold text-center mb-2">RIFA EXPRESS</h2>
                                {ticketInfo.raffleRef && (
                                    <p className="text-center text-sm font-semibold text-gray-700 mb-2">
                                        Referencia: {ticketInfo.raffleRef}
                                    </p>
                                )}
                                <p className="text-center text-sm text-gray-600">COMPROBANTE DE COMPRA</p>
                                <div className="text-center text-sm text-gray-600 mt-2">
                                    <span>{ticketInfo.date}</span> - <span>{ticketInfo.time}</span>
                                </div>
                            </div>

                            <div className="py-6 space-y-3 text-sm">
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
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ORGANIZA:</span>
                                        <span className="font-semibold text-right">{ticketInfo.organizerName}</span>
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
                        </div>
                        
                        <div className="p-6 bg-gray-50 rounded-b-lg flex flex-col items-center mt-auto">
                             <div className="flex justify-center space-x-3 w-full">
                                <Button
                                    onClick={handleDownloadTicket}
                                    className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold shadow-md"
                                >
                                    Descargar PDF
                                </Button>
                                <Button
                                    onClick={() => setIsTicketModalOpen(false)}
                                    variant="outline"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buscar Juego por Referencia</DialogTitle>
                        <DialogDescription>
                            Ingresa la referencia del juego para cargarlo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="admin-ref-search" className="text-right">
                                Referencia
                            </Label>
                            <Input
                                id="admin-ref-search"
                                value={adminRefSearch}
                                onChange={(e) => setAdminRefSearch(e.target.value)}
                                className="col-span-3"
                                placeholder="Ej: JM1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAdminLoginOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleAdminSearch}>Buscar Juego</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default App;
