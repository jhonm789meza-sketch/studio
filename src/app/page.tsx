'use client';
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RaffleManager } from '@/lib/RaffleManager';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Image from 'next/image';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House, Share2, MessageCircle, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';
import { Checkbox } from '@/components/ui/checkbox';

type RaffleMode = 'two-digit' | 'three-digit';
type Tab = 'board' | 'register' | 'participants';

const initialRaffleData = {
    drawnNumbers: [],
    lastDrawnNumber: null,
    prize: '',
    value: '',
    isWinnerConfirmed: false,
    isDetailsConfirmed: false,
    name: '',
    phoneNumber: '',
    raffleNumber: '',
    nequiAccountNumber: '3145696687',
    qrCodeImageUrl: '',
    gameDate: '',
    lottery: '',
    customLottery: '',
    organizerName: '',
    participants: [],
    raffleRef: '',
    winner: null,
    manualWinnerNumber: '',
    isPaid: false,
    adminId: null,
};


const App = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('board');
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
    const [isShareDialogOpen, setIsShareDialogOpen]    = useState(false);
    const [adminRefSearch, setAdminRefSearch] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [guestRaffleRef, setGuestRaffleRef] = useState<string | null>(null);


    const currentState = raffleMode === 'two-digit' ? twoDigitState : threeDigitState;
    const setCurrentState = raffleMode === 'two-digit' ? setTwoDigitState : setThreeDigitState;

    const raffleManager = new RaffleManager(db);

    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;

    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
    };
    
    useEffect(() => {
        let adminId = localStorage.getItem('rifaAdminId');
        if (!adminId) {
            adminId = `admin_${Date.now()}_${Math.random()}`;
            localStorage.setItem('rifaAdminId', adminId);
        }
        setCurrentAdminId(adminId);
    
        setLoading(true);
    
        const unsubTwoDigit = onSnapshot(doc(db, "raffles", "two-digit"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setTwoDigitState({ ...initialRaffleData, ...docSnapshot.data() });
            } else {
                setTwoDigitState(initialRaffleData);
                setDoc(doc(db, "raffles", "two-digit"), initialRaffleData, { merge: true });
            }
            setLoading(false);
        });
    
        const unsubThreeDigit = onSnapshot(doc(db, "raffles", "three-digit"), (docSnapshot) => {
             if (docSnapshot.exists()) {
                setThreeDigitState({ ...initialRaffleData, ...docSnapshot.data() });
            } else {
                setThreeDigitState(initialRaffleData);
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
        handleLocalFieldChange('raffleNumber', inputValue);

        if (inputValue.length === numberLength && new Set(currentState.drawnNumbers).has(parseInt(inputValue))) {
             showNotification('Este número ya ha sido asignado', 'warning');
        }
    };
    
    const handleLocalFieldChange = (field: string, value: any) => {
        setCurrentState((s: any) => ({ ...s, [field]: value }));
    };

    const isCurrentUserAdmin = !!currentState.adminId && currentState.adminId === currentAdminId;

    const toggleNumber = (number: number) => {
        if (isCurrentUserAdmin) {
            showNotification('El administrador no puede seleccionar números.', 'info');
            return;
        }
        if (!currentState.isDetailsConfirmed) {
            showNotification('Primero debes confirmar los detalles del premio para seleccionar un número.', 'info');
            return;
        }
        if (currentState.isWinnerConfirmed || !!currentState.winner) {
            showNotification('El juego ha terminado. Reinicia el tablero para comenzar de nuevo.', 'info');
            return;
        }
        if (new Set(currentState.drawnNumbers).has(number)) {
            showNotification('Este número ya está asignado', 'warning');
            return;
        }
        setCurrentState((s:any) => ({ ...s, raffleNumber: String(number).padStart(numberLength, '0')}));
        handleTabClick('register');
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
        if (!currentState.organizerName.trim() || !currentState.prize.trim() || !currentState.value.trim() || !currentState.gameDate || !currentState.lottery || !currentState.nequiAccountNumber.trim() || (currentState.lottery === 'Otro' && !currentState.customLottery.trim())) {
            showNotification('Por favor, completa todos los campos de configuración del premio.', 'warning');
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
        
        const participantName = currentState.name;
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
        
        setCurrentState((s:any) => ({
            ...s,
            name: '',
            phoneNumber: '',
            raffleNumber: '',
        }));
        setIsPaymentConfirmed(false);

        if (isCurrentUserAdmin) {
            showNotification(`¡Nuevo pago recibido! Se ha registrado el tiquete para ${participantName}.`, 'success');
        } else {
            showNotification('Tiquete generado correctamente', 'success');
        }
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
        setGuestRaffleRef(null);
        setRaffleMode(mode);
        handleTabClick('board'); // Reset to board tab on mode change
        showNotification(`Cambiado a modo de ${mode === 'two-digit' ? '2' : '3'} cifras.`, 'success');
    };

    const handleAdminSearch = async () => {
        if (!adminRefSearch.trim()) {
            showNotification('Por favor, ingresa una referencia.', 'warning');
            return;
        }
    
        const refUpper = adminRefSearch.toUpperCase();
        let found = false;
        let isTwoDigit = false;
    
        const twoDigitDoc = await getDoc(doc(db, "raffles", "two-digit"));
        if (twoDigitDoc.exists() && twoDigitDoc.data().raffleRef?.toUpperCase() === refUpper) {
            setRaffleMode('two-digit');
            isTwoDigit = true;
            found = true;
        } else {
            const threeDigitDoc = await getDoc(doc(db, "raffles", "three-digit"));
            if (threeDigitDoc.exists() && threeDigitDoc.data().raffleRef?.toUpperCase() === refUpper) {
                setRaffleMode('three-digit');
                isTwoDigit = false;
                found = true;
            }
        }
    
        if (found) {
            if(isTwoDigit) {
                setTwoDigitState({ ...initialRaffleData, ...twoDigitDoc.data() });
            } else {
                const threeDigitDoc = await getDoc(doc(db, "raffles", "three-digit"));
                setThreeDigitState({ ...initialRaffleData, ...threeDigitDoc.data()! });
            }
            
            showNotification(`Cargando rifa con referencia: ${adminRefSearch}`, 'success');
            setGuestRaffleRef(refUpper);
            setIsAdminLoginOpen(false);
            setAdminRefSearch('');
            handleTabClick('board');
        } else {
            showNotification('No se encontró ninguna rifa en juego con esa referencia.', 'error');
            setGuestRaffleRef(null);
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
        handleLocalFieldChange(field, value);
        await setDoc(doc(db, "raffles", raffleMode), { [field]: value }, { merge: true });
    };

    const handleActivateBoard = async () => {
        if (currentState.adminId) {
            showNotification(`Este tablero ya tiene un administrador. No puedes sobrescribir una rifa existente.`, 'error');
            return;
        }

        try {
            window.open('nequi://', '_blank');
            await setDoc(doc(db, "raffles", raffleMode), { isPaid: true, adminId: currentAdminId }, { merge: true });
            showNotification('¡Tablero activado! Ahora eres el administrador y puedes configurar los detalles del premio.', 'success');
        } catch (error) {
            console.error("Error activating board:", error);
            showNotification("Error al activar el tablero.", "error");
        }
    };

    const handleShare = (platform: 'whatsapp' | 'facebook' | 'copy') => {
        const shareText = `¡Participa en la rifa por un ${currentState.prize}! Organizada por ${currentState.organizerName}. Referencia: ${currentState.raffleRef}`;
        const shareUrl = window.location.href;
        let url = '';

        switch (platform) {
            case 'whatsapp':
                url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(shareUrl);
                showNotification('Enlace copiado al portapapeles', 'success');
                return;
        }

        window.open(url, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleNequiPayment = () => {
        window.open('nequi://', '_blank');
        setIsPaymentConfirmed(true);
    }


    const allNumbers = raffleMode === 'two-digit'
        ? Array.from({ length: 100 }, (_, i) => i)
        : Array.from({ length: 900 }, (_, i) => i + 100);

    const twoDigitRafflesInPlay = twoDigitState.isDetailsConfirmed ? 1 : 0;
    const threeDigitRafflesInPlay = threeDigitState.isDetailsConfirmed ? 1 : 0;
    
    const drawnNumbersSet = new Set(currentState.drawnNumbers);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Cargando...</div>;
    }
    
    // This is the single source of truth for determining admin access.
    // It strictly compares the adminId from the database with the one in the user's local storage.
    
    const isGuestViewingSharedRaffle = guestRaffleRef != null && guestRaffleRef === currentState.raffleRef?.toUpperCase();
    const shouldShowAsPaid = currentState.isPaid && (isCurrentUserAdmin || isGuestViewingSharedRaffle);
    
    const isRegisterFormValidForSubmit = currentState.name && currentState.phoneNumber && currentState.raffleNumber && !drawnNumbersSet.has(parseInt(currentState.raffleNumber)) && isPaymentConfirmed;

    const renderBoardContent = () => {
        if (!shouldShowAsPaid) {
            return (
                <div className="text-center p-10 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Tablero Bloqueado</h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Para ver el tablero de la rifa de {raffleMode === 'two-digit' ? '2' : '3'} cifras, busca el juego por su referencia. Si quieres crear tu propia rifa, actívala.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button onClick={() => setIsAdminLoginOpen(true)} size="lg">
                            Buscar por Referencia
                        </Button>
                         <Button onClick={handleActivateBoard} size="lg" className="bg-green-500 hover:bg-green-600 text-white font-bold">
                             Pagar $10.000 por Nequi
                         </Button>
                    </div>
                </div>
            );
        }
        
        return (
            <>
                <div className="mb-6">
                    {isCurrentUserAdmin && (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-lg mb-6">
                          <p className="font-bold">Eres el administrador de este tablero.</p>
                      </div>
                    )}
                    {currentState.winner && (
                        <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
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
                    
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración del Premio</h2>
                    {currentState.isDetailsConfirmed && currentState.raffleRef && (
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Referencia del Juego</p>
                            <p className="text-2xl font-bold text-gray-800 tracking-wider">{currentState.raffleRef}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div>
                           <Label htmlFor="organizer-name-input">Quien Organiza:</Label>
                           <Input
                               id="organizer-name-input"
                               type="text"
                               value={currentState.organizerName}
                               onChange={(e) => handleLocalFieldChange('organizerName', e.target.value)}
                               onBlur={(e) => handleFieldChange('organizerName', e.target.value)}
                               placeholder="Nombre del organizador"
                               disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
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
                               placeholder="Ej: Carro o una bicicleta"
                               disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
                               className="w-full mt-1"
                           />
                       </div>
                       <div>
                           <Label htmlFor="value-input">Valor:</Label>
                           <Input
                               id="value-input"
                               type="text"
                               value={formatValue(currentState.value)}
                               onChange={(e) => handleLocalFieldChange('value', e.target.value.replace(/[^\d]/g, ''))}
                               onBlur={(e) => handleFieldChange('value', e.target.value.replace(/[^\d]/g, ''))}
                               placeholder="Ej: 5000"
                               disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
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
                               disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
                               className="w-full mt-1"
                           />
                       </div>
                       <div>
                           <Label htmlFor="lottery-input">Lotería:</Label>
                           <select
                               id="lottery-input"
                               value={currentState.lottery}
                               onChange={(e) => {
                                   const value = e.target.value;
                                   handleFieldChange('lottery', value);
                               }}
                               disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
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
                            <Label htmlFor="nequi-account-input">Cuenta Nequi:</Label>
                            <Input
                                id="nequi-account-input"
                                type="tel"
                                value={currentState.nequiAccountNumber}
                                onChange={(e) => handleLocalFieldChange('nequiAccountNumber', e.target.value)}
                                onBlur={(e) => handleFieldChange('nequiAccountNumber', e.target.value)}
                                placeholder="Ej: 3001234567"
                                disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
                                className="w-full mt-1"
                            />
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
                                    disabled={currentState.isDetailsConfirmed || !isCurrentUserAdmin}
                                    className="w-full mt-1"
                                />
                            </div>
                        )}
                       {isCurrentUserAdmin && !currentState.isDetailsConfirmed && (
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
               {isCurrentUserAdmin && (
                 <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                     <h2 className="text-2xl font-bold text-gray-800 mb-4">Sorteo</h2>
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
                                         disabled={currentState.isWinnerConfirmed || !!currentState.winner}
                                         className="w-36"
                                     />
                                     <Button
                                         onClick={handleDrawWinner}
                                         disabled={currentState.isWinnerConfirmed || !!currentState.winner}
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
               )}

               <div>
                   <div className="flex justify-between items-center mb-4">
                       <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                           Tablero de Números ({raffleMode === 'two-digit' ? '00-99' : '100-999'})
                       </h2>
                   </div>
                   <div className={`grid gap-2 ${raffleMode === 'two-digit' ? 'grid-cols-10' : 'grid-cols-10 md:grid-cols-20 lg:grid-cols-25'}`}>
                       {allNumbers.map((number) => (
                           <div
                               key={number}
                               onClick={() => toggleNumber(number)}
                               className={`
                                   number-cell text-center py-2 rounded-lg transition-all text-sm
                                   ${currentState.isWinnerConfirmed || !currentState.isDetailsConfirmed || !!currentState.winner ? 'cursor-not-allowed' : 'cursor-pointer'}
                                   ${drawnNumbersSet.has(number)
                                       ? 'bg-red-600 text-white shadow-lg transform scale-105 cursor-not-allowed'
                                       : !currentState.isDetailsConfirmed || !!currentState.winner
                                       ? 'bg-gray-200 text-gray-500'
                                       : 'bg-green-200 text-green-800 hover:bg-green-300 hover:shadow-md'
                                   }
                                   ${currentState.winner?.raffleNumber === String(number).padStart(numberLength, '0') ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                               `}
                           >
                               {String(number).padStart(numberLength, '0')}
                           </div>
                       ))}
                   </div>
                   {!!currentState.winner && !currentState.isWinnerConfirmed && (
                        <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                            <p className="font-bold">Tablero Bloqueado</p>
                            <p>Se ha encontrado un ganador. Confirma el resultado o reinicia el tablero para continuar.</p>
                        </div>
                    )}
                   {!currentState.isDetailsConfirmed && (
                        <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                            <p className="font-bold">Tablero Bloqueado</p>
                            <p>Debes completar y confirmar los detalles del premio para poder seleccionar números.</p>
                        </div>
                    )}
               </div>
            </>
        )
    }

    const WhatsappIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.894 11.892-1.99 0-3.902-.539-5.587-1.528L.057 24zM7.329 6.848c-.282-.475-.589-.481-.844-.488-.237-.008-.501-.008-.76-.008-.282 0-.742.113-1.124.528-.403.43-.997 1.01-1.229 2.111-.225 1.061-.202 2.545.183 3.899.418 1.458 1.439 3.012 3.23 4.803 2.068 2.01 4.032 3.109 6.275 3.935 2.455.897 4.542.822 5.922.481 1.539-.36 2.768-1.442 3.218-2.819.466-1.428.466-2.67.339-2.956-.129-.282-.466-.445-.997-.737s-3.109-1.54-3.595-1.725c-.486-.183-.844-.282-1.203.282-.359.565-1.369 1.725-1.687 2.083-.318.358-.636.403-.994.128-.359-.275-1.516-.55-2.887-1.771-1.048-.95-1.748-2.13-2.003-2.488-.255-.358-.016-.54.239-.779.237-.225.501-.589.756-.882.256-.282.338-.475.502-.812.164-.338.083-.618-.041-.856-.125-.238-.997-2.474-1.368-3.385z"/>
        </svg>
    );
    
    const FacebookIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
        </svg>
    );

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
                                {isGuestViewingSharedRaffle && (
                                    <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)}>
                                        <Share2 className="mr-2 h-4 w-4" />
                                        <span>Compartir</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-bold">Tablero de Rifa</h1>
                    </div>
                    <div></div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'board' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => handleTabClick('board')}
                    >
                        Tablero
                    </button>
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'register' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => handleTabClick('register')}
                        disabled={!shouldShowAsPaid}
                    >
                        Registrar
                    </button>
                    <button 
                        className={`px-6 py-3 font-medium text-lg ${activeTab === 'participants' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => handleTabClick('participants')}
                        disabled={!shouldShowAsPaid}
                    >
                        Participantes
                    </button>
                </div>

                <div className="p-6">
                    <div className={activeTab === 'board' ? 'tab-content active' : 'tab-content'}>
                        {renderBoardContent()}
                    </div>
                    <div className={activeTab === 'register' ? 'tab-content active' : 'tab-content'}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrar Participante</h2>
                        <fieldset disabled={isCurrentUserAdmin || currentState.isWinnerConfirmed || !currentState.isDetailsConfirmed || !shouldShowAsPaid} className="disabled:opacity-50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox id="payment-confirmed" checked={isPaymentConfirmed} onCheckedChange={(checked) => setIsPaymentConfirmed(!!checked)} />
                                <label
                                    htmlFor="payment-confirmed"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Pago Recibido
                                </label>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleNequiPayment}
                                >
                                    Pagar con Nequi
                                </Button>
                                <Button
                                    onClick={handleTicketConfirmation}
                                    disabled={!isRegisterFormValidForSubmit || currentState.isWinnerConfirmed}
                                    className="w-full px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Generar Tiquete
                                </Button>
                            </div>

                        </fieldset>

                        {isCurrentUserAdmin && (
                            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Modo Administrador</p>
                                <p>Como administrador, no puedes registrar participantes. Esta tarea deben realizarla los propios jugadores.</p>
                            </div>
                        )}

                        {(!currentState.isDetailsConfirmed || !shouldShowAsPaid) && !isCurrentUserAdmin && (
                                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes activar o buscar una rifa y confirmar los detalles del premio en la pestaña "Tablero" para poder registrar participantes.</p>
                            </div>
                        )}

                        {currentState.isWinnerConfirmed && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Juego terminado</p>
                                <p>El registro de nuevos participantes está deshabilitado porque ya se ha confirmado un ganador. Reinicia el tablero para comenzar una nueva rifa.</p>
                            </div>
                        )}
                    </div>
                    <div className={activeTab === 'participants' ? 'tab-content active' : 'tab-content'}>
                        <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Participantes Registrados</h2>
                        </div>

                        {!shouldShowAsPaid ? (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                <p className="font-bold">Aviso</p>
                                <p>Debes activar o buscar una rifa en la pestaña "Tablero" para poder ver los participantes.</p>
                            </div>
                        ) : currentState.participants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                #
                                            </th>
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
                                        {currentState.participants.map((p: any, index: number) => (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {index + 1}
                                                </td>
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
                        <div ref={ticketModalRef} className="bg-white rounded-t-lg p-6 relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center z-0">
                                <p className="text-gray-200 text-7xl font-black transform -rotate-45 opacity-40 select-none">
                                    RIFAEXPRESS
                                </p>
                            </div>
                            <div className="relative z-10">
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
                                            <span className="text-gray-600">QUIEN ORGANIZA:</span>
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

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Compartir Rifa</DialogTitle>
                        <DialogDescription>
                            Comparte esta rifa con tus amigos y familiares.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <Button onClick={() => handleShare('whatsapp')} className="bg-green-500 hover:bg-green-600 text-white w-full">
                            <WhatsappIcon />
                            <span className="ml-2">WhatsApp</span>
                        </Button>
                        <Button onClick={() => handleShare('facebook')} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                            <FacebookIcon />
                            <span className="ml-2">Facebook</span>
                        </Button>
                        <Button onClick={() => handleShare('copy')} variant="outline" className="w-full">
                            <Copy />
                            <span className="ml-2">Copiar Enlace</span>
                        </Button>
                    </div>
                     <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsShareDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default App;
