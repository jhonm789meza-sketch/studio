
'use client';
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { RaffleManager } from '@/lib/RaffleManager';
import { db, persistenceEnabled } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc, Unsubscribe } from 'firebase/firestore';
import Image from 'next/image';


import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House, Clock, Users, MessageCircle, DollarSign, Share2, Link as LinkIcon, Loader2, QrCode, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';
import { Switch } from '@/components/ui/switch';
import type { Participant } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';


type RaffleMode = 'two-digit' | 'three-digit';
type Tab = 'board' | 'register' | 'participants' | 'pending' | 'recaudado';

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
    nequiAccountNumber: '',
    isNequiEnabled: true,
    isPaymentLinkEnabled: true,
    paymentLink: '',
    gameDate: '',
    lottery: '',
    customLottery: '',
    organizerName: '',
    organizerPhoneNumber: '',
    participants: [] as Participant[],
    raffleRef: '',
    winner: null,
    manualWinnerNumber: '',
    isPaid: false,
    adminId: null,
    raffleMode: 'two-digit',
    prizeImageUrl: ''
};


const App = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('board');
    const [currencySymbol] = useState('$');
    


    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketInfo, setTicketInfo] = useState<any>(null);
    const [generatedTicketData, setGeneratedTicketData] = useState<any>(null);
    const [isTicketGenerating, setIsTicketGenerating] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    
    const ticketModalRef = useRef<HTMLDivElement>(null);
    const raffleSubscription = useRef<Unsubscribe | null>(null);
    
    const [raffleState, setRaffleState] = useState<any>(null);
    
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [adminRefSearch, setAdminRefSearch] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [isCollectiveMessageDialogOpen, setIsCollectiveMessageDialogOpen] = useState(false);
    const [collectiveMessage, setCollectiveMessage] = useState('');
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const imageUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

    const raffleManager = new RaffleManager(db);
    
    const raffleMode = raffleState?.raffleMode || 'two-digit';
    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;

    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
        if (tab !== 'register') {
            setGeneratedTicketData(null);
        }
    };

    const handleGenerateTicket = async (participant: Participant) => {
        if (!raffleState?.prize) {
            showNotification('El premio debe estar definido para generar un tiquete.', 'warning');
            return;
        }

        const ticketData = {
            ...participant,
            raffleName: raffleState.prize,
            organizerName: raffleState.organizerName,
            gameDate: raffleState.gameDate,
            lottery: raffleState.lottery === 'Otro' ? raffleState.customLottery : raffleState.lottery,
            prizeImageUrl: raffleState.prizeImageUrl,
            raffleRef: raffleState.raffleRef,
            value: raffleState.value,
        };

        setTicketInfo(ticketData);
        setIsTicketModalOpen(true);
    };
    
    const confirmParticipantPayment = async (raffleRef: string, participantId: string, participantData?: any): Promise<Participant | null> => {
        if (!raffleRef) return null;
    
        try {
            if (persistenceEnabled) await persistenceEnabled;
    
            const raffleDocRef = doc(db, "raffles", raffleRef);
            const docSnap = await getDoc(raffleDocRef);
    
            if (docSnap.exists()) {
                const raffleData = docSnap.data();
                let participantToReturn: Participant | null = null;
    
                if (participantData && participantData.raffleNumber) {
                    const newParticipant: Participant = {
                        id: Date.now(),
                        name: participantData.name,
                        phoneNumber: participantData.phoneNumber,
                        raffleNumber: participantData.raffleNumber,
                        timestamp: new Date(),
                        paymentStatus: 'confirmed'
                    };
                    const updatedParticipants = [...raffleData.participants, newParticipant];
                    await setDoc(raffleDocRef, { participants: updatedParticipants }, { merge: true });
                    participantToReturn = newParticipant;
    
                } else if (participantId) {
                    const numericParticipantId = parseInt(participantId, 10);
                    const participantIndex = raffleData.participants.findIndex((p: Participant) => p.id === numericParticipantId);
    
                    if (participantIndex > -1 && raffleData.participants[participantIndex].paymentStatus === 'pending') {
                        const updatedParticipants = [...raffleData.participants];
                        const updatedParticipant = { ...updatedParticipants[participantIndex], paymentStatus: 'confirmed' as 'confirmed' };
                        updatedParticipants[participantIndex] = updatedParticipant;

                        await setDoc(raffleDocRef, { participants: updatedParticipants }, { merge: true });
                        participantToReturn = updatedParticipant;
                    } else {
                        participantToReturn = raffleData.participants.find((p: Participant) => p.id === numericParticipantId);
                    }
                }
    
                if (participantToReturn && participantToReturn.name) {
                     showNotification(`Pago para ${participantToReturn.name} (${participantToReturn.raffleNumber}) confirmado.`, 'success');
                }
                 return participantToReturn;
            }
            return null;
        } catch (error) {
            console.error("Error confirming participant payment:", error);
            showNotification('Error al confirmar el pago del participante.', 'error');
            return null;
        } finally {
            if (window.location.search.includes('status=APPROVED')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('status');
                url.searchParams.delete('participantId');
                url.searchParams.delete('pName');
                url.searchParams.delete('pPhone');
                url.searchParams.delete('pNum');
                window.history.replaceState({}, '', url.toString());
    
                if (raffleRef) {
                    await handleAdminSearch(raffleRef, true);
                }
            }
            if (activeTab !== 'pending') {
                setLoading(false);
            }
        }
    };


    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            if (persistenceEnabled) {
                await persistenceEnabled;
            }

            const adminIdFromStorage = localStorage.getItem('rifaAdminId');
            if (adminIdFromStorage) {
                setCurrentAdminId(adminIdFromStorage);
            }

            const urlParams = new URLSearchParams(window.location.search);
            const refFromUrl = urlParams.get('ref');
            const statusFromUrl = urlParams.get('status');
            const activationAdminId = urlParams.get('adminId');

            // For post-payment registration
            const pName = urlParams.get('pName');
            const pPhone = urlParams.get('pPhone');
            const pNum = urlParams.get('pNum');


            if (refFromUrl) {
                 if (statusFromUrl === 'APPROVED') {
                    if (pName && pPhone && pNum) {
                        // New flow: Register participant after payment confirmation
                        const registeredParticipant = await confirmParticipantPayment(refFromUrl, '', { name: pName, phoneNumber: pPhone, raffleNumber: pNum });
                         if (registeredParticipant) {
                            showNotification('¡Pago exitoso! Tu número ha sido registrado. Puedes generar tu tiquete en la pestaña "Participantes".', 'success');
                        }
                    } else {
                        // Board activation confirmation
                        await confirmActivation(refFromUrl, activationAdminId);
                    }
                 } else {
                    await handleAdminSearch(refFromUrl, true);
                }
            } else {
                setRaffleState(null);
                setLoading(false);
            }
            
    
            const handlePopState = (event: PopStateEvent) => {
                const newUrlParams = new URLSearchParams(window.location.search);
                const newRefFromUrl = newUrlParams.get('ref');
                if (newRefFromUrl && newRefFromUrl !== (raffleState?.raffleRef || '')) {
                    handleAdminSearch(newRefFromUrl, true);
                } else if (!newRefFromUrl) {
                    raffleSubscription.current?.();
                    setRaffleState(null);
                    setCurrentAdminId(null);
                    setLoading(false);
                }
            };
            
            window.addEventListener('popstate', handlePopState);
    
            return () => {
                window.removeEventListener('popstate', handlePopState);
                raffleSubscription.current?.();
            };
        };
    
        initialize();
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
    
    const formatValue = (rawValue: string | number) => {
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

        if (inputValue.length === numberLength && allAssignedNumbers.has(parseInt(inputValue))) {
             showNotification('Este número ya ha sido asignado.', 'warning');
        }
    };
    
    const handleLocalFieldChange = (field: string, value: any) => {
        setRaffleState((s: any) => ({ ...s, [field]: value }));

        if (field === 'prizeImageUrl') {
            if (imageUpdateTimeout.current) {
                clearTimeout(imageUpdateTimeout.current);
            }
            imageUpdateTimeout.current = setTimeout(() => {
                handleFieldChange(field, value);
            }, 1000);
        }
    };

    const handleFieldChange = async (field: string, value: any) => {
        if (!raffleState || !raffleState.raffleRef || !isCurrentUserAdmin) return;
        
        try {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { [field]: value }, { merge: true });
        } catch (error) {
            console.error(`Error updating field ${field}:`, error);
            showNotification(`Error al actualizar el campo ${field}.`, 'error');
        }
    };

    const isCurrentUserAdmin = !!raffleState?.adminId && !!currentAdminId && raffleState.adminId === currentAdminId;
    
    const allAssignedNumbers = new Set(raffleState?.participants.map((p: Participant) => parseInt(p.raffleNumber, 10)) || []);
    const pendingParticipants = raffleState?.participants.filter((p: Participant) => p.paymentStatus === 'pending') || [];
    const confirmedParticipants = raffleState?.participants.filter((p: Participant) => p.paymentStatus === 'confirmed') || [];

    const totalCollected = confirmedParticipants.length * (raffleState?.value ? parseFloat(String(raffleState.value).replace(/[^\d]/g, '')) : 0);

    const toggleNumber = (number: number) => {
        if (!raffleState) return;
        if (!raffleState.isDetailsConfirmed) {
            showNotification('Primero debes confirmar los detalles del premio para seleccionar un número.', 'info');
            return;
        }
        if (raffleState.isWinnerConfirmed || !!raffleState.winner) {
            showNotification('El juego ha terminado. Reinicia el tablero para comenzar de nuevo.', 'info');
            return;
        }
        if (allAssignedNumbers.has(number)) {
            showNotification('Este número ya está asignado.', 'warning');
            return;
        }
        setRaffleState((s:any) => ({ ...s, raffleNumber: String(number).padStart(numberLength, '0')}));
        handleTabClick('register');
    };

    const handleConfirmWinner = async () => {
        if (!raffleState || !raffleState.raffleRef) return;
        if (!raffleState.winner) {
            showNotification('Primero debes sortear un ganador.', 'warning');
            return;
        }
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { isWinnerConfirmed: true }, { merge: true });
        showNotification('¡Resultado confirmado! El tablero ha sido bloqueado.', 'success');
    };

    const handleConfirmDetails = async () => {
        if (!raffleState || !raffleState.raffleRef) return;
        if (!raffleState.organizerName.trim() || !raffleState.prize.trim() || !raffleState.value.trim() || !raffleState.gameDate || !raffleState.lottery || (raffleState.lottery === 'Otro' && !raffleState.customLottery.trim())) {
            showNotification('Por favor, completa todos los campos de configuración del premio.', 'warning');
            return;
        }
        
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { isDetailsConfirmed: true }, { merge: true });
        showNotification('Detalles del premio confirmados', 'success');
    };

    const resetBoard = () => {
        if (!raffleState || !raffleState.raffleRef) return;
        showConfirmationDialog(
            '¿Estás seguro de que deseas reiniciar el tablero? Esta acción eliminará la rifa actual y deberás realizar otro pago para crear una nueva.',
            async () => {
                const oldRaffleRef = raffleState.raffleRef;
                await deleteDoc(doc(db, "raffles", oldRaffleRef));

                setRaffleState(null);
                setCurrentAdminId(null);
                localStorage.removeItem('rifaAdminId');
                window.history.pushState({}, '', window.location.pathname);
                showNotification('Tablero reiniciado. Ahora puedes activar una nueva rifa.', 'success');
                setShowConfetti(false);
            }
        );
    };

    const handleRegisterParticipant = async (isNequiPayment = false, confirmPayment = false) => {
        if (!raffleState || !raffleState.raffleRef) return false;
    
        const name = raffleState.name?.trim();
        const phoneNumber = raffleState.phoneNumber?.trim();
        const raffleNumber = raffleState.raffleNumber?.trim();
    
        if (!name) {
            showNotification('Por favor ingresa el nombre', 'warning');
            return false;
        }
        if (!phoneNumber) {
            showNotification('Por favor ingresa el celular', 'warning');
            return false;
        }
        if (!raffleNumber) {
            showNotification('Por favor ingresa el número de rifa', 'warning');
            return false;
        }
    
        const num = parseInt(raffleNumber, 10);
    
        if (raffleNumber.length !== numberLength) {
             showNotification(`El número para esta modalidad debe ser de ${numberLength} cifras`, 'warning');
             return false;
        }
    
        if (allAssignedNumbers.has(num)) {
            showNotification('Este número ya está asignado', 'warning');
            return false;
        }
    
        const participantName = name;
        const formattedRaffleNumber = String(num).padStart(numberLength, '0');
        const participantId = Date.now();

        const newParticipant: Participant = {
            id: participantId,
            name: name,
            phoneNumber: phoneNumber,
            raffleNumber: formattedRaffleNumber,
            timestamp: new Date(),
            paymentStatus: confirmPayment ? 'confirmed' : 'pending',
            raffleRef: raffleState.raffleRef,
        };
        
        const updatedParticipants = [...raffleState.participants, newParticipant];

        await setDoc(doc(db, "raffles", raffleState.raffleRef), {
            participants: updatedParticipants,
        }, { merge: true });
                
        setRaffleState((s:any) => ({
            ...s,
            name: '',
            phoneNumber: '',
            raffleNumber: '',
        }));
        
        if (isNequiPayment && !confirmPayment) {
            showNotification(`¡Número ${formattedRaffleNumber} registrado para ${participantName}! Tu pago está pendiente de confirmación por el administrador.`, 'success');
        } else if (confirmPayment) {
            showNotification(`¡Participante ${participantName} (${formattedRaffleNumber}) registrado y confirmado!`, 'success');
             if (raffleState.prize) {
                const ticketData = {
                    ...newParticipant,
                    raffleName: raffleState.prize,
                    organizerName: raffleState.organizerName,
                    gameDate: raffleState.gameDate,
                    lottery: raffleState.lottery === 'Otro' ? raffleState.customLottery : raffleState.lottery,
                    raffleRef: raffleState.raffleRef,
                    value: raffleState.value,
                };
                setGeneratedTicketData(ticketData);
             }
        }

        if (!confirmPayment) {
            handleTabClick('board');
        }

        return true;
    };

    const handleConfirmPayment = async (participantId: number) => {
        if (!raffleState || !raffleState.raffleRef || !isCurrentUserAdmin) return;
        await confirmParticipantPayment(raffleState.raffleRef, String(participantId));
    };
    
    const handleDownloadTicket = () => {
        const ticketElement = ticketModalRef.current;
        if (!ticketElement) return;

        const originalWidth = ticketElement.style.width;
        const originalHeight = ticketElement.style.height;

        ticketElement.style.width = '320px';
        ticketElement.style.height = 'auto';
    
        const targetInfo = generatedTicketData || ticketInfo;
        if (!targetInfo) return;
    
        import('html2canvas').then(html2canvas => {
            html2canvas(ticketElement, { 
                useCORS: true, 
                backgroundColor: null,
                scale: 3, // Increase scale for better quality
            }).then(canvas => {
                ticketElement.style.width = originalWidth;
                ticketElement.style.height = originalHeight;

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`tiquete_${targetInfo.raffleNumber}.pdf`);
                showNotification('Tiquete PDF descargado', 'success');
            });
        });
    };

    const handleShareTicket = () => {
        const targetInfo = generatedTicketData || ticketInfo;
        if (!targetInfo || !targetInfo.phoneNumber) return;

        const message = encodeURIComponent(`¡Hola! Aquí tienes tu tiquete para la rifa "${raffleState?.prize}". ¡Mucha suerte!`);
        const whatsappUrl = `https://wa.me/57${targetInfo.phoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        
        if (isTicketModalOpen) {
            closeTicketModal();
        }
        if (generatedTicketData) {
            setGeneratedTicketData(null);
        }
    };
    
    const handleAdminSearch = (refToSearch?: string, isInitialLoad = false) => {
        return new Promise<void>(async (resolve) => {
            setLoading(true);
            
            const aRef = (refToSearch || adminRefSearch).trim().toUpperCase();
            if (!aRef) {
                showNotification('Por favor, ingresa una referencia.', 'warning');
                if(!isInitialLoad) setLoading(false);
                resolve();
                return;
            }

            raffleSubscription.current?.();
            setRaffleState(null);
            
            const raffleDocRef = doc(db, 'raffles', aRef);

            if (persistenceEnabled) {
                await persistenceEnabled;
            }

            raffleSubscription.current = onSnapshot(raffleDocRef, (docSnapshot) => {
                const adminIdFromStorage = localStorage.getItem('rifaAdminId');
                if (adminIdFromStorage) {
                    setCurrentAdminId(adminIdFromStorage);
                }

                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    setRaffleState(data);
                    if (!isInitialLoad) { 
                        showNotification(`Cargando rifa con referencia: ${aRef}`, 'success');
                    }
                    setIsAdminLoginOpen(false);
                    setAdminRefSearch('');
                    handleTabClick('board');
                    if (window.location.search !== `?ref=${aRef}`) {
                        window.history.pushState({}, '', `?ref=${aRef}`);
                    }
                } else {
                    showNotification('No se encontró ninguna rifa con esa referencia.', 'error');
                    setRaffleState(null);
                    setCurrentAdminId(null);
                    window.history.pushState({}, '', window.location.pathname);
                }
                setLoading(false);
                resolve();
            }, (error) => {
                console.error("Error subscribing to raffle:", error);
                showNotification('Error al cargar la rifa.', 'error');
                setLoading(false);
                resolve();
            });
        });
    };
    
    const handleDrawWinner = async () => {
        if (!raffleState || !raffleState.raffleRef) return;
        const winningNumberStr = raffleState.manualWinnerNumber;
        if (!winningNumberStr || winningNumberStr.length !== numberLength) {
            showNotification(`Por favor, ingresa un número ganador válido de ${numberLength} cifras.`, 'warning');
            return;
        }

        const winner = raffleState.participants.find((p: Participant) => p.raffleNumber === winningNumberStr && p.paymentStatus === 'confirmed');

        if (winner) {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { winner }, { merge: true });
            setShowConfetti(true);
            showNotification(`¡El ganador es ${winner.name} con el número ${winner.raffleNumber}!`, 'success');
            setTimeout(() => setShowConfetti(false), 8000);
        } else {
             const houseWinner = {
                name: "El Premio Queda en Casa",
                raffleNumber: winningNumberStr,
                isHouse: true,
            };
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { winner: houseWinner }, { merge: true });
            showNotification(`El número ${winningNumberStr} no fue vendido. El premio queda en casa.`, 'info');
        }
    };

    const handlePaymentMethodToggle = async (field: string, value: boolean) => {
        if (!raffleState || !raffleState.raffleRef || !isCurrentUserAdmin) return;
        handleLocalFieldChange(field, value);
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { [field]: value }, { merge: true });
    };

    const handleActivateBoard = async (mode: RaffleMode) => {
        setLoading(true);
        try {
            const adminId = `admin_${Date.now()}_${Math.random()}`;
            localStorage.setItem('rifaAdminId', adminId);
            setCurrentAdminId(adminId);

            const newRef = await raffleManager.createNewRaffleRef();
            const newRaffleData = {
                ...initialRaffleData,
                raffleMode: mode,
                raffleRef: newRef,
                adminId: adminId,
                isPaid: true,
                prizeImageUrl: '',
            };
            
            await setDoc(doc(db, "raffles", newRef), newRaffleData);

            await handleAdminSearch(newRef, true);
        } catch (error) {
            console.error("Error activating board:", error);
            showNotification("Error al activar el tablero.", "error");
        } finally {
            setLoading(false);
        }
    };

    const confirmActivation = async (raffleRef: string, adminId: string | null) => {
        if (!raffleRef) {
            showNotification('No se encontró una referencia de activación.', 'error');
            setLoading(false);
            return;
        }
    
        try {
            if (persistenceEnabled) {
                await persistenceEnabled;
            }
            const raffleDocRef = doc(db, "raffles", raffleRef);
    
            let docSnap = await getDoc(raffleDocRef);
    
            if (docSnap.exists()) {
                const raffleData = docSnap.data();
                if (raffleData.isPaid) {
                    showNotification('Esta rifa ya ha sido activada.', 'info');
                } else {
                    const newAdminId = `admin_${Date.now()}_${Math.random()}`;
                    localStorage.setItem('rifaAdminId', newAdminId);
                    setCurrentAdminId(newAdminId);
    
                    await setDoc(raffleDocRef, { isPaid: true, adminId: newAdminId }, { merge: true });
                    showNotification('¡Nueva rifa activada! Ahora eres el administrador.', 'success');
                }
            } else {
                console.error(`Raffle with ref ${raffleRef} not found.`);
                showNotification(`No se encontró la rifa con referencia ${raffleRef}.`, 'error');
            }
    
            await handleAdminSearch(raffleRef, true);
    
        } catch (error) {
            console.error("Error activating board:", error);
            showNotification("Error al activar el tablero.", "error");
        } finally {
            setLoading(false);
        }
    };


    const handleTalkToAdmin = () => {
        if (!raffleState || !raffleState.organizerPhoneNumber) {
            showNotification('El número del administrador no está configurado.', 'warning');
            return;
        }
        const message = encodeURIComponent('Hola, te contacto sobre la rifa.');
        const whatsappUrl = `https://wa.me/57${raffleState.organizerPhoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const handleSendCollectiveMessage = () => {
        if (confirmedParticipants.length === 0) {
            showNotification('No hay participantes confirmados para enviar un mensaje.', 'warning');
            return;
        }

        const firstPhoneNumber = confirmedParticipants[0].phoneNumber;
        const message = encodeURIComponent(collectiveMessage);
        
        const whatsappUrl = `https://wa.me/57${firstPhoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        setIsCollectiveMessageDialogOpen(false);
        setCollectiveMessage('');
    };

    const handleShareToWhatsApp = () => {
        const urlToShare = window.location.href;
        const message = encodeURIComponent(`¡Participa en esta increíble rifa!\n`);
        const whatsappUrl = `https://wa.me/?text=${message}${encodeURIComponent(urlToShare)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleShareToFacebook = () => {
        const urlToShare = window.location.href;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;
        window.open(facebookUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const allNumbers = Array.from({ length: totalNumbers }, (_, i) => i);
    
    const backgroundImage = raffleState?.prizeImageUrl;

    const closeTicketModal = () => {
        setIsTicketModalOpen(false);
        setTicketInfo(null);
    };


    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Cargando...</div>;
    }
    
    const isRegisterFormValidForSubmit = raffleState?.name && raffleState?.phoneNumber && raffleState?.raffleNumber && !allAssignedNumbers.has(parseInt(raffleState.raffleNumber));

    const renderBoardContent = () => {
        if (!raffleState) return null;
        
        return (
            <>
                {isCurrentUserAdmin && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-center font-semibold">
                        Eres el administrador de este juego
                    </div>
                )}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-2/5 flex-shrink-0">
                        {raffleState.winner && (
                            <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                                {raffleState.winner.isHouse ? (
                                    <p className="font-bold text-lg flex items-center"><House className="mr-2"/>¡El premio queda en casa!</p>
                                ) : (
                                    <p className="font-bold text-lg flex items-center"><Award className="mr-2"/>¡Tenemos un ganador!</p>
                                )}
                                <p><strong>Número:</strong> {raffleState.winner.raffleNumber}</p>
                                {!raffleState.winner.isHouse && (
                                <>
                                    <p><strong>Nombre:</strong> {raffleState.winner.name}</p>
                                    <p><strong>Teléfono:</strong> {isCurrentUserAdmin ? 
                                        <a href={`https://wa.me/57${raffleState.winner.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{`+57 ${raffleState.winner.phoneNumber}`}</a>
                                        : <span>{`+57 ${raffleState.winner.phoneNumber}`}</span>
                                    }</p>
                                </>
                                )}
                            </div>
                        )}
                        
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración del Premio</h2>
                        {raffleState.raffleRef && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-500">Referencia del Juego</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-gray-800 tracking-wider">{raffleState.raffleRef}</p>
                                    <button onClick={handleTalkToAdmin} className="p-2 rounded-full hover:bg-gray-100">
                                        <WhatsappIcon />
                                    </button>
                                </div>
                            </div>
                        )}
                        {raffleState.prizeImageUrl && raffleState.prizeImageUrl.trim() !== '' ? (
                            <div className="mb-6 rounded-lg overflow-hidden relative aspect-video max-w-2xl mx-auto shadow-lg">
                                <Image src={raffleState.prizeImageUrl} alt="Premio de la rifa" width={600} height={400} style={{ objectFit: 'cover' }} unoptimized />
                            </div>
                        ) : (
                            <div className="mb-6 rounded-lg overflow-hidden relative aspect-video max-w-2xl mx-auto shadow-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Sin imagen de premio</span>
                            </div>
                        )}

                        <div className="space-y-4 mb-6">
                           <div>
                               <Label htmlFor="organizer-name-input">Quien Organiza:</Label>
                               <Input
                                   id="organizer-name-input"
                                   type="text"
                                   value={raffleState.organizerName}
                                   onChange={(e) => handleLocalFieldChange('organizerName', e.target.value)}
                                   onBlur={(e) => handleFieldChange('organizerName', e.target.value)}
                                   placeholder="Nombre del organizador"
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           <div>
                                <Label htmlFor="organizer-phone-input">Teléfono del Organizador:</Label>
                                <div className="relative mt-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">+57</span>
                                    </div>
                                    <Input
                                        id="organizer-phone-input"
                                        type="tel"
                                        value={raffleState.organizerPhoneNumber}
                                        onChange={(e) => handleLocalFieldChange('organizerPhoneNumber', e.target.value.replace(/\D/g, ''))}
                                        onBlur={(e) => handleFieldChange('organizerPhoneNumber', e.target.value.replace(/\D/g, ''))}
                                        placeholder="3001234567"
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full pl-12 mt-1"
                                    />
                                </div>
                            </div>
                           <div>
                               <Label htmlFor="prize-input">Premio:</Label>
                               <Input
                                   id="prize-input"
                                   type="text"
                                   value={raffleState.prize}
                                   onChange={(e) => handleLocalFieldChange('prize', e.target.value)}
                                   onBlur={(e) => handleFieldChange('prize', e.target.value)}
                                   placeholder="Ej: Carro o una bicicleta"
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           <div>
                               <Label htmlFor="value-input">Valor:</Label>
                               <Input
                                   id="value-input"
                                   type="text"
                                   value={formatValue(raffleState.value)}
                                   onChange={(e) => handleLocalFieldChange('value', e.target.value.replace(/[^\d]/g, ''))}
                                   onBlur={(e) => handleFieldChange('value', e.target.value.replace(/[^\d]/g, ''))}
                                   placeholder="Ej: 5000"
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           <div>
                               <Label htmlFor="game-date-input">Fecha de juego:</Label>
                               <Input
                                   id="game-date-input"
                                   type="date"
                                   min={new Date().toISOString().split('T')[0]}
                                   value={raffleState.gameDate}
                                   onChange={(e) => handleLocalFieldChange('gameDate', e.target.value)}
                                   onBlur={(e) => handleFieldChange('gameDate', e.target.value)}
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           <div>
                               <Label htmlFor="lottery-input">Lotería:</Label>
                               <select
                                   id="lottery-input"
                                   value={raffleState.lottery}
                                   onChange={(e) => {
                                       const value = e.target.value;
                                       handleFieldChange('lottery', value);
                                   }}
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1 px-3 py-2 text-base border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                           {raffleState.lottery === 'Otro' && (
                                <div>
                                    <Label htmlFor="custom-lottery-input">Especificar Lotería:</Label>
                                    <Input
                                        id="custom-lottery-input"
                                        type="text"
                                        value={raffleState.customLottery}
                                        onChange={(e) => handleLocalFieldChange('customLottery', e.target.value)}
                                        onBlur={(e) => handleFieldChange('customLottery', e.target.value)}
                                        placeholder="Nombre de la lotería"
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full mt-1"
                                    />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="nequi-account-input">Cuenta Nequi:</Label>
                                <div className="relative mt-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">+57</span>
                                    </div>
                                    <Input
                                        id="nequi-account-input"
                                        type="tel"
                                        value={raffleState.nequiAccountNumber}
                                        onChange={(e) => handleLocalFieldChange('nequiAccountNumber', e.target.value.replace(/\D/g, ''))}
                                        onBlur={(e) => handleFieldChange('nequiAccountNumber', e.target.value.replace(/\D/g, ''))}
                                        placeholder="3001234567"
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full pl-12 mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                               <Label htmlFor="payment-link-input">Link de Pagos:</Label>
                               <Input
                                   id="payment-link-input"
                                   type="text"
                                   value={raffleState.paymentLink}
                                   onChange={(e) => handleLocalFieldChange('paymentLink', e.target.value)}
                                   onBlur={(e) => handleFieldChange('paymentLink', e.target.value)}
                                   placeholder="https://checkout.wompi.co/..."
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                            </div>
                            <div>
                                <Label htmlFor="prize-image-url-input">Link de Imagen (Opcional):</Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="prize-image-url-input"
                                        type="text"
                                        value={raffleState.prizeImageUrl}
                                        onChange={(e) => handleLocalFieldChange('prizeImageUrl', e.target.value)}
                                        onBlur={(e) => handleFieldChange('prizeImageUrl', e.target.value)}
                                        placeholder="https://ejemplo.com/imagen.png"
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            {isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                                <div className="col-span-1 md:col-span-2">
                                    <Button
                                        onClick={handleConfirmDetails}
                                        className="w-full bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                    >
                                        Confirmar Detalles del Premio
                                    </Button>
                                </div>
                            )}
                        </div>
                   </div>

                   <div className="lg:w-3/5 flex-grow">
                       {isCurrentUserAdmin && (
                         <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">Sorteo</h2>
                             <div className="flex flex-wrap gap-3 items-center">
                                 {!raffleState.isWinnerConfirmed && (
                                     <>
                                         <div className="flex items-center gap-2">
                                             <Label htmlFor="manual-winner-input" className="sr-only">Número Ganador</Label>
                                             <Input
                                                 id="manual-winner-input"
                                                 type="text"
                                                 placeholder={`Número (${numberLength} cifras)`}
                                                 value={raffleState.manualWinnerNumber}
                                                 onChange={(e) => handleLocalFieldChange('manualWinnerNumber', e.target.value.replace(/\D/g, ''))}
                                                 maxLength={numberLength}
                                                 disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                 className="w-36"
                                             />
                                             <Button
                                                 onClick={handleDrawWinner}
                                                 disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                 className="bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                                             >
                                                 Buscar Ganador
                                             </Button>
                                         </div>
                                     </>
                                 )}
                                 {raffleState.winner && !raffleState.isWinnerConfirmed && (
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
                             {raffleState.isWinnerConfirmed && (
                                 <p className="mt-4 text-green-600 font-semibold">El resultado ha sido confirmado y el tablero está cerrado.</p>
                             )}
                         </div>
                       )}

                       <div>
                           <div className="flex justify-between items-center mb-4">
                               <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                   Tablero de Números
                               </h2>
                               {raffleState.raffleRef && (
                                    <div className="font-semibold text-gray-700">
                                        Modo: {raffleMode === 'two-digit' ? '2 Cifras' : '3 Cifras'}
                                    </div>
                               )}
                           </div>
                           <div className={`grid gap-2 ${raffleMode === 'two-digit' ? 'grid-cols-10' : 'grid-cols-10 md:grid-cols-20 lg:grid-cols-25'}`}>
                               {allNumbers.map((number) => {
                                   const formattedNumber = String(number).padStart(numberLength, '0');
                                   const participant = raffleState.participants.find((p: Participant) => p.raffleNumber === formattedNumber);
                                   const isConfirmed = participant && participant.paymentStatus === 'confirmed';
                                   const isPending = participant && participant.paymentStatus === 'pending';

                                   return (
                                       <div
                                           key={number}
                                           onClick={() => toggleNumber(number)}
                                           className={`
                                               number-cell text-center py-2 rounded-lg transition-all text-sm
                                               ${raffleState.isWinnerConfirmed || !raffleState.isDetailsConfirmed || !!raffleState.winner || isConfirmed || isPending ? 'cursor-not-allowed' : 'cursor-pointer'}
                                               ${isConfirmed
                                                   ? 'bg-red-600 text-white shadow-lg'
                                                   : isPending
                                                   ? 'bg-yellow-400 text-yellow-900 shadow-md'
                                                   : !raffleState.isDetailsConfirmed || !!raffleState.winner
                                                   ? 'bg-gray-200 text-gray-500'
                                                   : 'bg-green-200 text-green-800 hover:bg-green-300 hover:shadow-md'
                                               }
                                               ${raffleState.winner?.raffleNumber === formattedNumber ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                                           `}
                                       >
                                           {formattedNumber}
                                       </div>
                                   );
                               })}
                           </div>
                            <div className="flex flex-wrap gap-4 mt-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-200"></div>
                                    <span>Disponible</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                                    <span>Pendiente</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                                    <span>Vendido</span>
                                </div>
                            </div>
                           {!!raffleState.winner && !raffleState.isWinnerConfirmed && (
                                <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                                    <p className="font-bold">Tablero Bloqueado</p>
                                    <p>Se ha encontrado un ganador. Confirma el resultado o reinicia el tablero para continuar.</p>
                                </div>
                            )}
                           {!raffleState.isDetailsConfirmed && (
                                <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                                    <p className="font-bold">Tablero Bloqueado</p>
                                    <p>Debes completar y confirmar los detalles del premio para poder seleccionar números.</p>
                                </div>
                            )}
                       </div>
                   </div>
                </div>
            </>
        )
    }

    const WhatsappIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.894 11.892-1.99 0-3.902-.539-5.587-1.528L.057 24zM7.329 6.848c-.282-.475-.589-.481-.844-.488-.237-.008-.501-.008-.76-.008-.282 0-.742.113-1.124.528-.403.43-.997 1.01-1.229 2.111-.225 1.061-.202 2.545.183 3.899.418 1.458 1.439 3.012 3.23 4.803 2.068 2.01 4.032 3.109 6.275 3.935 2.455.897 4.542.822 5.922.481 1.539-.36 2.768-1.442 3.218-2.819.466-1.428.466-2.67.339-2.956-.129-.282-.466-.445-.997-.737s-3.109-1.54-3.595-1.725c-.486-.183-.844-.282-1.203.282-.359.565-1.369 1.725-1.687 2.083-.318.358-.636.403-.994.128-.359-.275-1.516-.55-2.887-1.771-1.048-.95-1.748-2.13-2.003-2.488-.255-.358-.016-.54.239-.779.237-.225. ৫০1-.589.756-.882.256-.282.338-.475.502-.812.164-.338.083-.618-.041-.856-.125-.238-.997-2.474-1.368-3.385z"/>
        </svg>
    );
    
    const FacebookIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.897v-2.89h2.54V9.526c0-2.509 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.89h-2.33V21.878C18.343 21.128 22 16.991 22 12z"/>
        </svg>
    );

    const TicketIcon = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 9a3 3 0 0 1 0 6v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a3 3 0 0 1 0-6V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/>
            <path d="M13 17v2"/>
            <path d="M13 11v2"/>
        </svg>
    );

    const NequiIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" >
            <path d="M19.14 4.86H4.86V19.14H19.14V4.86Z" fill="#14234B" />
            <path d="M13.2 7.02H10.8V16.98H13.2V7.02Z" fill="white" />
            <path d="M9.66 16.98V14.58H7.14V12.18H9.66V9.78H7.14V7.38H9.66V4.86H5.94V19.14H9.66V16.98Z" fill="#A454C4" />
            <path d="M14.34 16.98V14.58H16.86V12.18H14.34V9.78H16.86V7.38H14.34V4.86H18.06V19.14H14.34V16.98Z" fill="#A454C4" />
        </svg>
    );

    const InlineTicket = ({ ticketData }: { ticketData: any }) => {
        if (!ticketData) return null;
    
        const receiptDate = ticketData.timestamp?.toDate ? format(ticketData.timestamp.toDate(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale: es }) : format(new Date(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale: es });
        const gameDateFormatted = ticketData.gameDate ? format(new Date(ticketData.gameDate), "d 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
        return (
            <div className="mt-8 max-w-xs mx-auto">
                 <div
                    ref={ticketModalRef}
                    className="bg-white p-4 rounded-lg shadow-lg font-mono text-gray-800 text-[13px] relative overflow-hidden"
                >
                     <div className="absolute inset-0 flex items-center justify-center z-0">
                        <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none opacity-50">RIFA EXPRESS</p>
                    </div>
                     <div className="relative z-10">
                        <Button
                            onClick={() => setGeneratedTicketData(null)}
                            variant="ghost"
                            className="absolute -top-2 -right-2 z-20 h-8 w-8 p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold">RIFA EXPRESS</h3>
                            <p>Referencia: {ticketData.raffleRef}</p>
                            <p className="font-semibold">COMPROBANTE DE COMPRA</p>
                        </div>
                        <p className="text-center text-xs mb-4">{receiptDate}</p>
                        <div className="border-t border-dashed border-gray-400 my-4"></div>
                        <div className="space-y-1">
                            <div className="flex justify-between"><span>CLIENTE:</span><span className="font-semibold text-right">{ticketData.name}</span></div>
                            <div className="flex justify-between"><span>CELULAR:</span><span className="font-semibold">{ticketData.phoneNumber}</span></div>
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-4"></div>
                        <h4 className="font-bold text-center mb-2">DETALLES DE LA RIFA</h4>
                        <div className="space-y-1">
                            <div className="flex justify-between"><span>PREMIO:</span><span className="font-semibold text-right">{formatValue(ticketData.raffleName)}</span></div>
                            <div className="flex justify-between"><span>VALOR BOLETA:</span><span className="font-semibold text-right">{formatValue(ticketData.value)}</span></div>
                            <div className="flex justify-between"><span>FECHA SORTEO:</span><span className="font-semibold text-right">{gameDateFormatted}</span></div>
                            <div className="flex justify-between"><span>JUEGA CON:</span><span className="font-semibold text-right">{ticketData.lottery}</span></div>
                            <div className="flex justify-between"><span>QUIEN ORGANIZA:</span><span className="font-semibold text-right">{ticketData.organizerName}</span></div>
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-4"></div>
                        <div className="text-center my-4">
                            <p className="font-bold">NÚMERO ASIGNADO</p>
                            <p className="text-5xl font-bold text-violet-600 tracking-wider">{ticketData.raffleNumber}</p>
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-4"></div>
                        <p className="text-center font-semibold">¡Gracias por participar!</p>
                    </div>
                </div>
               <div className="p-4 bg-gray-50 rounded-b-lg flex flex-col items-center justify-center gap-2 mt-auto">
                   <Button
                       onClick={() => handleDownloadTicket()}
                       className="w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold shadow-md"
                   >
                       Descargar Tiquete
                   </Button>
                   <Button
                       onClick={handleShareTicket}
                       className="w-full bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md flex items-center gap-2"
                   >
                       <WhatsappIcon/>
                       Compartir
                   </Button>
               </div>
           </div>
        );
    };


    return (
        <div className="min-h-screen bg-background font-sans relative">
            {backgroundImage && backgroundImage.trim() !== '' && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <Image src={backgroundImage} alt="Fondo de la rifa" layout="fill" objectFit="cover" unoptimized />
                    <div className="absolute inset-0 bg-black/30" />
                </div>
            )}
            <div className="relative z-10 p-4">
                {showConfetti && <Confetti />}
                <div className="max-w-6xl mx-auto bg-card/90 rounded-2xl shadow-2xl overflow-hidden border">
                    <div className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white p-6 flex justify-between items-center">
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => setIsAdminLoginOpen(true)}>
                                        Buscar por Referencia
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)}>
                                        <Share2 className="mr-2 h-4 w-4" />
                                        <span>Compartir</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="text-center">
                            <h1 className="text-4xl font-bold">Tablero de Rifa</h1>
                        </div>
                        <div className="w-10">
                            {/* Placeholder for symmetry */}
                        </div>
                    </div>

                    {!raffleState ? (
                        <div className="p-8">
                            <div className="text-center">
                                <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Tablero Bloqueado</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    Busca una rifa por su referencia o crea una nueva para empezar.
                                </p>
                                <div className="flex flex-col justify-center items-center gap-8 mb-6">
                                    
                                    {/* Ticket for 2 digits */}
                                    <div className="bg-white rounded-2xl shadow-lg flex flex-col max-w-md w-full">
                                        <div className='flex'>
                                            <div className="bg-purple-100 p-4 flex flex-col items-center justify-center rounded-l-2xl border-r-2 border-dashed border-purple-300">
                                                <TicketIcon className="h-10 w-10 text-purple-600 mb-2" />
                                                <span className="text-purple-800 font-bold text-lg">2</span>
                                                <span className="text-purple-600 text-xs">CIFRAS</span>
                                            </div>
                                            <div className="p-6 flex-grow">
                                                <h5 className="mb-1 text-xl font-bold tracking-tight text-gray-900">Rifa de 2 Cifras</h5>
                                                <p className="font-normal text-gray-600 mb-4 text-sm">Para números del 00 al 99.</p>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 space-y-2">
                                            <Button onClick={() => handleActivateBoard('two-digit')} size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                                                Activar ($1.500 COP)
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Ticket for 3 digits */}
                                    <div className="bg-white rounded-2xl shadow-lg flex flex-col max-w-md w-full">
                                        <div className='flex'>
                                            <div className="bg-blue-100 p-4 flex flex-col items-center justify-center rounded-l-2xl border-r-2 border-dashed border-blue-300">
                                                <TicketIcon className="h-10 w-10 text-blue-600 mb-2" />
                                                <span className="text-blue-800 font-bold text-lg">3</span>
                                                <span className="text-blue-600 text-xs">CIFRAS</span>
                                            </div>
                                            <div className="p-6 flex-grow">
                                                <h5 className="mb-1 text-xl font-bold tracking-tight text-gray-900">Rifa de 3 Cifras</h5>
                                                <p className="font-normal text-gray-600 mb-4 text-sm">Para números del 000 al 999.</p>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 space-y-2">
                                            <Button onClick={() => handleActivateBoard('three-digit')} size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
                                                Activar ($15.000 COP)
                                            </Button>
                                        </div>
                                    </div>
                                    
                                </div>
                                <Button onClick={() => setIsAdminLoginOpen(true)} size="lg" variant="outline">
                                    o Buscar por Referencia
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-gray-200">
                                <div className="relative flex overflow-x-auto">
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'board' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('board')}
                                    >
                                        <TicketIcon className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">Tablero</span>
                                    </button>
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'register' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('register')}
                                        disabled={!raffleState}
                                    >
                                        <span className="md:hidden">✏️</span> <span className="hidden md:inline">Registrar</span>
                                    </button>
                                    {isCurrentUserAdmin && (
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'pending' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('pending')}
                                    >
                                        <Clock className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">Pendientes ({pendingParticipants.length})</span>
                                    </button>
                                    )}
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'participants' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('participants')}
                                        disabled={!raffleState}
                                    >
                                        <Users className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">Participantes</span>
                                    </button>
                                    {isCurrentUserAdmin && (
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'recaudado' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setIsSalesModalOpen(true)}
                                    >
                                        <DollarSign className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">Recaudado</span>
                                    </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className={activeTab === 'board' ? 'tab-content active' : 'tab-content'}>
                                    {renderBoardContent()}
                                </div>
                                <div className={activeTab === 'register' ? 'tab-content active' : 'tab-content'}>
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrar Número</h2>
                                        {isCurrentUserAdmin && (
                                            <div className="bg-gray-100 p-4 rounded-lg mb-6 space-y-4">
                                                <h3 className="font-semibold text-lg text-gray-800">Controles de Administrador</h3>
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="enable-nequi" className="flex flex-col space-y-1">
                                                        <span>Habilitar Pago con Nequi</span>
                                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                                            Permite a los usuarios pagar usando el botón de Nequi.
                                                        </span>
                                                    </Label>
                                                    <Switch
                                                        id="enable-nequi"
                                                        checked={raffleState?.isNequiEnabled ?? true}
                                                        onCheckedChange={(checked) => handlePaymentMethodToggle('isNequiEnabled', checked)}
                                                        disabled={!raffleState?.nequiAccountNumber}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="enable-payment-link" className="flex flex-col space-y-1">
                                                        <span>Habilitar Pago con Link</span>
                                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                                            Permite a los usuarios pagar usando el link de pagos.
                                                        </span>
                                                    </Label>
                                                    <Switch
                                                        id="enable-payment-link"
                                                        checked={raffleState?.isPaymentLinkEnabled ?? true}
                                                        onCheckedChange={(checked) => handlePaymentMethodToggle('isPaymentLinkEnabled', checked)}
                                                        disabled={!raffleState?.paymentLink}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <fieldset disabled={!raffleState || raffleState?.isWinnerConfirmed || !raffleState?.isDetailsConfirmed} className="disabled:opacity-50 space-y-4">
                                            <div className="flex flex-col gap-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="name-input">Nombre completo:</Label>
                                                        <Input
                                                            id="name-input"
                                                            type="text"
                                                            value={raffleState?.name || ''}
                                                            onChange={(e) => handleLocalFieldChange('name', e.target.value)}
                                                            placeholder="Ej: Juan Pérez"
                                                            className="w-full mt-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="phone-input">Celular:</Label>
                                                        <div className="relative mt-1">
                                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                                <span className="text-gray-500 sm:text-sm">+57</span>
                                                            </div>
                                                            <Input
                                                                id="phone-input"
                                                                type="tel"
                                                                value={raffleState?.phoneNumber || ''}
                                                                onChange={(e) => handleLocalFieldChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
                                                                placeholder="3001234567"
                                                                className="w-full pl-12"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor="raffle-number-input">Número de rifa ({raffleMode === 'two-digit' ? '00-99' : '000-999'}):</Label>
                                                    <Input
                                                        id="raffle-number-input"
                                                        type="text"
                                                        value={raffleState?.raffleNumber || ''}
                                                        onChange={handleRaffleNumberChange}
                                                        placeholder={`Ej: ${raffleMode === 'two-digit' ? '05' : '142'}`}
                                                        className="w-full mt-1"
                                                        maxLength={numberLength}
                                                    />
                                                    {raffleState?.raffleNumber && allAssignedNumbers.has(parseInt(raffleState.raffleNumber)) && (
                                                        <p className="text-red-500 text-sm mt-1">Este número ya está asignado.</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {raffleState?.isNequiEnabled && raffleState?.nequiAccountNumber && raffleState?.value && (
                                                        <a
                                                            href={`nequi://app/pay?phoneNumber=${raffleState.nequiAccountNumber}&value=${String(raffleState.value).replace(/\D/g, '')}&currency=COP&description=Pago Rifa`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1"
                                                            onClick={async (e) => {
                                                                if (!isRegisterFormValidForSubmit) {
                                                                    e.preventDefault();
                                                                    handleRegisterParticipant(); // Show validation errors
                                                                } else {
                                                                    const success = await handleRegisterParticipant(true);
                                                                    if (!success) e.preventDefault();
                                                                }
                                                            }}
                                                        >
                                                            <Button className="w-full bg-[#A454C4] hover:bg-[#8e49a8] text-white" disabled={!isRegisterFormValidForSubmit}>
                                                                <NequiIcon />
                                                                <span className="ml-2">Pagar con Nequi</span>
                                                            </Button>
                                                        </a>
                                                    )}
                                                    {raffleState?.isPaymentLinkEnabled && raffleState?.paymentLink && (
                                                        <a
                                                            href={`${raffleState.paymentLink}${raffleState.paymentLink.includes('?') ? '&' : '?'}pName=${encodeURIComponent(raffleState.name || '')}&pPhone=${encodeURIComponent(raffleState.phoneNumber || '')}&pNum=${encodeURIComponent(raffleState.raffleNumber || '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1"
                                                            onClick={(e) => {
                                                                if (!isRegisterFormValidForSubmit) {
                                                                    e.preventDefault();
                                                                    handleRegisterParticipant(); // show validation
                                                                }
                                                            }}
                                                        >
                                                            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!isRegisterFormValidForSubmit}>
                                                                <LinkIcon className="mr-2 h-4 w-4" />
                                                                <span>Pagar con Link</span>
                                                            </Button>
                                                        </a>
                                                    )}
                                                     {isCurrentUserAdmin && (
                                                        <Button 
                                                            className="w-full bg-green-600 hover:bg-green-700" 
                                                            onClick={() => handleRegisterParticipant(false, true)}
                                                            disabled={!isRegisterFormValidForSubmit}
                                                        >
                                                            Registrar y Confirmar Pago
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {generatedTicketData && (
                                        <InlineTicket ticketData={generatedTicketData} />
                                    )}

                                    {(!raffleState || !raffleState.isDetailsConfirmed) && (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">Aviso</p>
                                            <p>Debes activar o buscar una rifa y confirmar los detalles del premio en la pestaña "Tablero" para poder participar.</p>
                                        </div>
                                    )}
                                    {raffleState?.isWinnerConfirmed && (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">Juego terminado</p>
                                            <p>El registro de nuevos participantes está deshabilitado porque ya se ha confirmado un ganador. Reinicia el tablero para comenzar una nueva rifa.</p>
                                        </div>
                                    )}
                                </div>
                                {isCurrentUserAdmin && (
                                <div className={activeTab === 'pending' ? 'tab-content active' : 'tab-content'}>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Pagos Pendientes</h2>
                                    {pendingParticipants.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Celular</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {pendingParticipants.sort((a: Participant, b: Participant) => a.raffleNumber.localeCompare(b.raffleNumber)).map((p: Participant) => (
                                                        <tr key={p.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.phoneNumber}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {p.timestamp && p.timestamp.toDate ? format(p.timestamp.toDate(), 'PPpp', { locale: es }) : 'N/A'}
                                                                </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <Button onClick={() => handleConfirmPayment(p.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                                                    Confirmar Pago
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No hay pagos pendientes de confirmación.</p>
                                    )}
                                </div>
                                )}
                                <div className={activeTab === 'participants' ? 'tab-content active' : 'tab-content'}>
                                    <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Participantes Confirmados</h2>
                                            {isCurrentUserAdmin && confirmedParticipants.length > 0 && (
                                                <Button onClick={() => setIsCollectiveMessageDialogOpen(true)} size="sm">
                                                    <MessageCircle className="mr-2 h-4 w-4" />
                                                    Enviar Mensaje Colectivo
                                                </Button>
                                            )}
                                    </div>

                                    {!raffleState ? (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">Aviso</p>
                                            <p>Debes activar o buscar una rifa en la pestaña "Tablero" para poder ver los participantes.</p>
                                        </div>
                                    ) : confirmedParticipants.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Celular</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {confirmedParticipants
                                                        .sort((a: Participant, b: Participant) => a.raffleNumber.localeCompare(b.raffleNumber))
                                                        .map((p: any, index: number) => (
                                                        <tr key={p.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                <a
                                                                    href={`https://wa.me/57${p.phoneNumber}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                                                >
                                                                    <WhatsappIcon className="h-4 w-4 text-green-500" />
                                                                    {p.phoneNumber}
                                                                </a>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <Button onClick={() => handleGenerateTicket(p)} size="sm" variant="outline" disabled={!raffleState.prize}>
                                                                    Generar Tiquete
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No hay participantes con pago confirmado.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

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
            
            <Dialog open={isTicketModalOpen} onOpenChange={closeTicketModal}>
                <DialogContent className="w-[95vw] max-w-xs p-0 border-0 bg-transparent shadow-none font-sans">
                     {ticketInfo && (
                        <div>
                            <div
                                ref={ticketModalRef}
                                className="bg-white p-4 rounded-lg shadow-lg font-mono text-gray-800 text-[13px] relative overflow-hidden"
                            >
                                <div className="absolute inset-0 flex items-center justify-center z-0">
                                    <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none opacity-50">RIFA EXPRESS</p>
                                </div>
                                <div className="relative z-10">
                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold">RIFA EXPRESS</h3>
                                        <p>Referencia: {ticketInfo.raffleRef}</p>
                                        <p className="font-semibold">COMPROBANTE DE COMPRA</p>
                                    </div>
                                    <p className="text-center text-xs mb-4">{ticketInfo.timestamp?.toDate ? format(ticketInfo.timestamp.toDate(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale: es }) : 'Fecha no disponible'}</p>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span>CLIENTE:</span><span className="font-semibold text-right">{ticketInfo.name}</span></div>
                                        <div className="flex justify-between"><span>CELULAR:</span><span className="font-semibold">{ticketInfo.phoneNumber}</span></div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <h4 className="font-bold text-center mb-2">DETALLES DE LA RIFA</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span>PREMIO:</span><span className="font-semibold text-right">{formatValue(ticketInfo.raffleName)}</span></div>
                                        <div className="flex justify-between"><span>VALOR BOLETA:</span><span className="font-semibold text-right">{formatValue(ticketInfo.value)}</span></div>
                                        <div className="flex justify-between"><span>FECHA SORTEO:</span><span className="font-semibold text-right">{ticketInfo.gameDate ? format(new Date(ticketInfo.gameDate), "d 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A'}</span></div>
                                        <div className="flex justify-between"><span>JUEGA CON:</span><span className="font-semibold text-right">{ticketInfo.lottery}</span></div>
                                        <div className="flex justify-between"><span>QUIEN ORGANIZA:</span><span className="font-semibold text-right">{ticketInfo.organizerName}</span></div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <div className="text-center my-4">
                                        <p className="font-bold">NÚMERO ASIGNADO</p>
                                        <p className="text-5xl font-bold text-violet-600 tracking-wider">{ticketInfo.raffleNumber}</p>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <p className="text-center font-semibold">¡Gracias por participar!</p>
                                </div>
                            </div>
                            <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 w-full pt-4">
                                <Button
                                    onClick={handleDownloadTicket}
                                    className="w-full bg-purple-500 text-white"
                                >
                                    Descargar Tiquete
                                </Button>
                                <Button
                                    onClick={handleShareTicket}
                                    className="w-full bg-green-500 text-white flex items-center justify-center gap-2"
                                >
                                    <WhatsappIcon/>
                                    Compartir
                                </Button>
                                <Button
                                    onClick={closeTicketModal}
                                    variant="outline"
                                    className="w-full bg-white/80"
                                >
                                    Cerrar
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
                        <Button type="submit" onClick={() => handleAdminSearch()}>Buscar Juego</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isSalesModalOpen} onOpenChange={setIsSalesModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recaudo de Ventas</DialogTitle>
                        <DialogDescription>
                            Aquí puedes ver el total recaudado hasta ahora.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                            <p className="font-semibold text-gray-600">Boletas Vendidas:</p>
                            <p className="font-bold text-xl text-gray-800">{confirmedParticipants.length}</p>
                        </div>
                        <div className="flex justify-between items-center bg-green-100 p-4 rounded-lg mt-4">
                            <p className="font-semibold text-green-800">Total Recaudado:</p>
                            <p className="font-bold text-2xl text-green-800">{formatValue(totalCollected)}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSalesModalOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCollectiveMessageDialogOpen} onOpenChange={setIsCollectiveMessageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Mensaje Colectivo</DialogTitle>
                        <DialogDescription>
                            Escribe un mensaje para enviarlo a todos los participantes confirmados. Esto abrirá WhatsApp.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Textarea
                            placeholder="Tu mensaje aquí..."
                            value={collectiveMessage}
                            onChange={(e) => setCollectiveMessage(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCollectiveMessageDialogOpen(false)}>Cancelar</Button>
                        <Button type="button" onClick={handleSendCollectiveMessage} disabled={!collectiveMessage.trim()}>
                            <WhatsappIcon />
                            <span className="ml-2">Abrir WhatsApp con Mensaje</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Compartir Rifa</DialogTitle>
                        <DialogDescription>
                            Comparte esta aplicación de rifas con tus amigos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        <Button
                            onClick={() => handleShareToWhatsApp()}
                            className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                            <WhatsappIcon />
                            <span>Compartir en WhatsApp</span>
                        </Button>
                        <Button
                            onClick={() => handleShareToFacebook()}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <FacebookIcon />
                            <span>Compartir en Facebook</span>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default App;
