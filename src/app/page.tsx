'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import jsPDF from 'jspdf';
import { RaffleManager } from '@/lib/RaffleManager';
import { db, storage, persistenceEnabled } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc, Unsubscribe } from 'firebase/firestore';
import Image from 'next/image';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/hooks/use-language';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House, Clock, Users, MessageCircle, DollarSign, Share2, Link as LinkIcon, Loader2, QrCode, X, Upload, Wand2, Search, Download, Infinity as InfinityIcon, KeyRound, Languages, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';
import { Switch } from '@/components/ui/switch';
import type { Participant, Raffle } from '@/lib/types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CountrySelectionDialog, getCurrencySymbol } from '@/components/country-selection-dialog';
import { WhatsappIcon, FacebookIcon, TicketIcon, NequiIcon, InlineTicket } from '@/components/raffle-components';


type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';
type Tab = 'board' | 'register' | 'participants' | 'pending' | 'recaudado' | 'winners';

const initialRaffleData: Raffle = {
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
    password: '',
    participants: [] as Participant[],
    raffleRef: '',
    winner: null,
    manualWinnerNumber: '',
    manualWinnerNumber3: '',
    manualWinnerNumber2: '',
    isPaid: false,
    adminId: null,
    raffleMode: 'two-digit' as RaffleMode,
    prizeImageUrl: '',
    imageGenPrompt: '',
    currencySymbol: '$',
    infiniteModeDigits: 0,
    partialWinnerPercentage3: 0,
    partialWinnerPercentage2: 0,
    sharePrize: false,
    automaticDraw: false,
    allowPartialWinners: false,
};

interface PartialWinnerInfo {
    winners: Participant[];
    digits: number;
    prize: string;
}

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: 'qr' | 'gateway') => void;
  t: (key: string, params?: any) => string;
}

const PaymentMethodDialog = ({ isOpen, onClose, onSelect, t }: PaymentMethodDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('selectPaymentMethod')}</DialogTitle>
          <DialogDescription>{t('selectPaymentMethodDescription')}</DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-4">
          <Button onClick={() => onSelect('qr')} variant="outline" className="h-auto py-4">
             <div className="flex items-center gap-4">
                <QrCode className="h-8 w-8" />
                <div className="text-left">
                    <p className="font-semibold">{t('payWithQR')}</p>
                    <p className="text-xs text-muted-foreground">{t('payWithQRDescription')}</p>
                </div>
            </div>
          </Button>
           <Button onClick={() => onSelect('gateway')} variant="outline" className="h-auto py-4">
             <div className="flex items-center gap-4">
                 <NequiIcon />
                <div className="text-left">
                    <p className="font-semibold">{t('payWithGateway')}</p>
                    <p className="text-xs text-muted-foreground">{t('payWithGatewayDescription')}</p>
                </div>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const QrPaymentDialog = ({ isOpen, onClose, t }: {isOpen: boolean, onClose: () => void, t: (key: string) => string}) => {
    
    const handleOpenNequi = () => {
        window.open('nequi://', '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>{t('qrPaymentTitle')}</DialogTitle>
                    <DialogDescription>{t('qrPaymentDescription')}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center p-4">
                    <Image src="/qr-nequi.jpg" alt="QR Nequi" width={250} height={400} className="rounded-lg"/>
                </div>
                <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 w-full pt-2">
                    <a href="/qr-nequi.jpg" download="qr-pago-rifaexpress.jpg" className="w-full">
                       <Button className="w-full">
                           <Download className="mr-2 h-4 w-4" />
                           {t('downloadQr')}
                       </Button>
                    </a>
                    <Button onClick={handleOpenNequi} className="w-full bg-[#A454C4] hover:bg-[#8e49a8] text-white">
                        <NequiIcon />
                        <span className="ml-2">{t('openNequi')}</span>
                    </Button>
                    <Button variant="outline" onClick={onClose} className="w-full">{t('close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const App = () => {
    const { t, toggleLanguage, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('board');
    const [appUrl, setAppUrl] = useState('');

    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketInfo, setTicketInfo] = useState<any>(null);
    const [generatedTicketData, setGeneratedTicketData] = useState<any>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    
    const ticketModalRef = useRef<HTMLDivElement>(null);
    const raffleSubscription = useRef<Unsubscribe | null>(null);
    
    const [raffleState, setRaffleState] = useState<Raffle>(initialRaffleData);
    
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
    const [isPublicSearchOpen, setIsPublicSearchOpen] = useState(false);
    const [publicRefSearch, setPublicRefSearch] = useState('');
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [adminRefSearch, setAdminRefSearch] = useState('');
    const [adminPhoneSearch, setAdminPhoneSearch] = useState('');
    const [adminPasswordSearch, setAdminPasswordSearch] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    
    const [isCountrySelectionOpen, setIsCountrySelectionOpen] = useState(false);
    const [selectedRaffleMode, setSelectedRaffleMode] = useState<RaffleMode | null>(null);
    const [partialWinners, setPartialWinners] = useState<PartialWinnerInfo[]>([]);

    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

    const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
    const [isQrPaymentDialogOpen, setIsQrPaymentDialogOpen] = useState(false);


    const raffleManager = new RaffleManager(db);
    
    const raffleMode = raffleState.raffleMode;
    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;

     useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    }, [language]);

    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
        if (tab !== 'register') {
            setGeneratedTicketData(null);
        }
    };

    const handleGenerateTicket = async (participant: Participant) => {
        if (!raffleState.prize) {
            showNotification(t('generateTicketPrizeWarning'), 'warning');
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
            currencySymbol: raffleState.currencySymbol,
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
                     showNotification(t('paymentConfirmedNotification', { name: participantToReturn.name, number: participantToReturn.raffleNumber }), 'success');
                }
                 return participantToReturn;
            }
            return null;
        } catch (error) {
            console.error("Error confirming participant payment:", error);
            showNotification(t('paymentConfirmationError'), 'error');
            return null;
        } finally {
            if (window.location.search.includes('status=APPROVED') || window.location.search.includes('transactionState=APPROVED')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('status');
                url.searchParams.delete('participantId');
                url.searchParams.delete('pName');
                url.searchParams.delete('pPhone');
                url.searchParams.delete('pNum');
                url.searchParams.delete('transactionState');
                url.searchParams.delete('ref_payco');
                url.searchParams.delete('signature');
                url.searchParams.delete('transactionId');
                url.searchParams.delete('amount');
                url.searchParams.delete('currency');
                // wompi params
                url.searchParams.delete('id')
                url.searchParams.delete('reference')
                url.searchParams.delete('state')
                url.searchParams.delete('env')
                
                window.history.replaceState({}, '', url.toString());
    
                if (raffleRef) {
                    await handleAdminSearch({ refToSearch: raffleRef, isInitialLoad: true });
                }
            }
            if (activeTab !== 'pending') {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker
              .register('/sw.js')
              .then(registration => {
                console.log('Service Worker registered successfully:', registration);
              })
              .catch(error => {
                console.log('Error registering Service Worker:', error);
              });
          });
        }
        
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }, []);

    const handleInstallClick = () => {
        if (installPromptEvent) {
            installPromptEvent.prompt();
            installPromptEvent.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                setInstallPromptEvent(null);
            });
        } else {
            showNotification(t('installAppInfo'), 'info');
        }
    };


    useEffect(() => {
        const initialize = async () => {
          setLoading(true);
          if (persistenceEnabled) {
            await persistenceEnabled;
          }
    
          if (typeof window !== 'undefined') {
            setAppUrl(window.location.origin);
          }
    
          const adminIdFromStorage = localStorage.getItem('rifaAdminId');
          if (adminIdFromStorage) {
            setCurrentAdminId(adminIdFromStorage);
          }
    
          const urlParams = new URLSearchParams(window.location.search);
          const refFromUrl = urlParams.get('ref');
          const statusFromUrl = urlParams.get('status') || urlParams.get('transactionState');

          // Wompi params
          const wompiState = urlParams.get('state');
          const wompiReference = urlParams.get('reference');

          // Board activation
          if (wompiState === 'APPROVED' && wompiReference && wompiReference.startsWith('ACTIVATE_')) {
              const parts = wompiReference.split('_');
              const mode = parts[1] as RaffleMode;
              const country = parts[2];
              await handleActivateBoard(mode, country);
              return;
          }
    
          const pName = urlParams.get('pName');
          const pPhone = urlParams.get('pPhone');
          const pNum = urlParams.get('pNum');
          const participantId = urlParams.get('participantId');
    
          if (refFromUrl) {
            if (statusFromUrl === 'APPROVED') {
              if (participantId) {
                 await confirmParticipantPayment(refFromUrl, participantId);
              } else if (pName && pPhone && pNum) {
                await confirmParticipantPayment(refFromUrl, '', {
                  name: pName,
                  phoneNumber: pPhone,
                  raffleNumber: pNum,
                });
              }
              showNotification(t('successfulPaymentNotification'), 'success');
            }
            await handleAdminSearch({ refToSearch: refFromUrl, isInitialLoad: true });
          } else {
            setRaffleState(initialRaffleData);
            setLoading(false);
          }
    
          const handlePopState = (event: PopStateEvent) => {
            const newUrlParams = new URLSearchParams(window.location.search);
            const newRefFromUrl = newUrlParams.get('ref');
            if (newRefFromUrl && newUrlParams.get('ref') !== (raffleState.raffleRef)) {
              handleAdminSearch({ refToSearch: newRefFromUrl, isInitialLoad: true });
            } else if (!newRefFromUrl) {
              raffleSubscription.current?.();
              setRaffleState(initialRaffleData);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    const formatValueForDisplay = (value: string | number) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/\D/g, '');
        if (stringValue === '') return '';
        const locale = language === 'es' ? 'es-CO' : 'en-US';
        return new Intl.NumberFormat(locale).format(parseInt(stringValue, 10));
    };

    const formatValue = (rawValue: string | number) => {
        const currencySymbol = raffleState.currencySymbol || '$';
        if (!rawValue) return `${currencySymbol} 0`;
        const numericValue = String(rawValue).replace(/\D/g, '');
        if (numericValue === '') return `${currencySymbol} 0`;
        
        const number = parseFloat(numericValue);
        if (isNaN(number)) return `${currencySymbol} 0`;
        
        const locale = language === 'es' ? 'es-CO' : 'en-US';
        return `${currencySymbol} ${number.toLocaleString(locale)}`;
    };

    const handleRaffleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.replace(/\D/g, '');
        handleLocalFieldChange('raffleNumber', inputValue);

        if (raffleMode !== 'infinite' && inputValue.length === numberLength && allAssignedNumbers.has(parseInt(inputValue))) {
             showNotification(t('numberAlreadyAssignedWarning'), 'warning');
        }
    };
    
    const handleLocalFieldChange = (field: string, value: any) => {
        const newState: Partial<Raffle> = {};
    
        if (field === 'value') {
            const numericValue = String(value).replace(/\D/g, '');
            newState[field] = numericValue;
        } else if (field === 'partialWinnerPercentage3' || field === 'partialWinnerPercentage2') {
            let numericValue = parseInt(String(value).replace(/\D/g, ''), 10);
            if (isNaN(numericValue) || value === '') {
                numericValue = 0;
            }
            if (numericValue < 0) numericValue = 0;
            if (numericValue > 100) numericValue = 100;
            newState[field as keyof Raffle] = numericValue;
        } else if (field === 'infiniteModeDigits') {
            const numericValue = parseInt(String(value).replace(/\D/g, ''), 10);
            newState[field as keyof Raffle] = isNaN(numericValue) ? '' : numericValue;
        } else if (field === 'manualWinnerNumber' || field === 'manualWinnerNumber2' || field === 'manualWinnerNumber3') {
             newState[field as keyof Raffle] = value.replace(/\D/g, '');
        } else {
            newState[field as keyof Raffle] = value;
        }
    
        setRaffleState(prevState => ({ ...prevState, ...newState }));
    };

    const handleFieldChange = async (field: string, value: any) => {
        if (!raffleState.raffleRef || !isCurrentUserAdmin) return;
        
        let valueToSave = value;
        if (field === 'value' || field === 'partialWinnerPercentage3' || field === 'partialWinnerPercentage2') {
            valueToSave = String(value).replace(/\D/g, '');
            if (valueToSave === '') valueToSave = 0;
        } else if (field === 'infiniteModeDigits') {
            valueToSave = parseInt(String(value).replace(/\D/g, ''), 10) || 0;
             if (valueToSave !== 0 && valueToSave < 4) {
                showNotification(t('min4Digits'), 'warning');
                return;
            }
        }

        try {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { [field]: valueToSave }, { merge: true });
        } catch (error) {
            console.error(`Error updating field ${field}:`, error);
            showNotification(t('fieldUpdateError', { field }), 'error');
        }
    };
    
    const isCurrentUserAdmin = !!raffleState.adminId && !!currentAdminId && raffleState.adminId === currentAdminId;
    
    const allAssignedNumbers = new Set(raffleState.participants.map((p: Participant) => parseInt(p.raffleNumber, 10)) || []);
    const pendingParticipants = raffleState.participants.filter((p: Participant) => p.paymentStatus === 'pending') || [];
    const confirmedParticipants = raffleState.participants.filter((p: Participant) => p.paymentStatus === 'confirmed') || [];

    const totalCollected = confirmedParticipants.length * (raffleState.value ? parseFloat(String(raffleState.value).replace(/[^\d.,]/g, '').replace(',', '.')) : 0);

    const toggleNumber = (number: number) => {
        if (!raffleState) return;
        if (!raffleState.isDetailsConfirmed) {
            showNotification(t('confirmDetailsFirstWarning'), 'info');
            return;
        }
        if (raffleState.isWinnerConfirmed || !!raffleState.winner) {
            showNotification(t('gameFinishedWarning'), 'info');
            return;
        }
        if (allAssignedNumbers.has(number)) {
            showNotification(t('numberAlreadyAssignedWarning'), 'warning');
            return;
        }
        setRaffleState((s:any) => ({ ...s, raffleNumber: String(number).padStart(numberLength, '0')}));
        handleTabClick('register');
    };

    const handleConfirmWinner = async () => {
        if (!raffleState.raffleRef) return;
        if (!raffleState.winner) {
            showNotification(t('drawWinnerFirstWarning'), 'warning');
            return;
        }
    
        // Automatically find partial winners if not already found
        if (raffleMode === 'infinite' && raffleState.allowPartialWinners) {
            if (raffleState.manualWinnerNumber3 && !partialWinners.some(p => p.digits === 3)) {
                handleFindPartialWinners(3, raffleState.partialWinnerPercentage3 || 0);
            }
            if (raffleState.manualWinnerNumber2 && !partialWinners.some(p => p.digits === 2)) {
                handleFindPartialWinners(2, raffleState.partialWinnerPercentage2 || 0);
            }
        }
    
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { isWinnerConfirmed: true }, { merge: true });
        showNotification(t('resultConfirmedNotification'), 'success');
    };

    const handleConfirmDetails = async () => {
        if (!raffleState.raffleRef) return;
        if (!raffleState.organizerName.trim() || !raffleState.prize.trim() || !raffleState.value.trim() || !raffleState.gameDate || (!raffleState.automaticDraw && (!raffleState.lottery || (raffleState.lottery === 'Otro' && !raffleState.customLottery.trim()))) || !raffleState.password?.trim()) {
            showNotification(t('completeAllFieldsWarning'), 'warning');
            return;
        }
        
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { isDetailsConfirmed: true }, { merge: true });
        showNotification(t('prizeDetailsConfirmed'), 'success');
    };

    const resetBoard = () => {
        if (!raffleState.raffleRef) return;
        showConfirmationDialog(
            t('resetBoardConfirmation'),
            async () => {
                const oldRaffleRef = raffleState.raffleRef;
                await deleteDoc(doc(db, "raffles", oldRaffleRef));

                setRaffleState(initialRaffleData);
                setCurrentAdminId(null);
                setPartialWinners([]);
                localStorage.removeItem('rifaAdminId');
                window.history.pushState({}, '', window.location.pathname);
                showNotification(t('boardResetSuccess'), 'success');
                setShowConfetti(false);
            }
        );
    };

    const handleRegisterParticipant = async (isNequiPayment = false, confirmPayment = false): Promise<number | null> => {
        if (!raffleState.raffleRef) return null;
    
        const name = raffleState.name?.trim();
        const phoneNumber = raffleState.phoneNumber?.trim();
        const raffleNumber = raffleState.raffleNumber?.trim();
        const infiniteDigits = raffleState.infiniteModeDigits || 4;
    
        if (!name) {
            showNotification(t('enterNameWarning'), 'warning');
            return null;
        }
        if (!phoneNumber) {
            showNotification(t('enterPhoneWarning'), 'warning');
            return null;
        }
        if (!raffleNumber) {
            showNotification(t('enterRaffleNumberWarning'), 'warning');
            return null;
        }
    
        const num = parseInt(raffleNumber, 10);
    
        if (raffleMode === 'infinite') {
            if (infiniteDigits < 4) {
                 showNotification(t('min4Digits'), 'warning');
                 return null;
            }
            if (raffleNumber.length !== infiniteDigits) {
                showNotification(t('infiniteModeDigitsWarning', { count: infiniteDigits }), 'warning');
                return null;
            }
        } else if (raffleNumber.length !== numberLength) {
             showNotification(t('numberLengthWarning', { count: numberLength }), 'warning');
             return null;
        }
    
        if (allAssignedNumbers.has(num)) {
            showNotification(t('numberAlreadyAssignedWarning'), 'warning');
            return null;
        }
    
        const participantName = name;
        const formattedRaffleNumber = raffleMode === 'infinite' ? raffleNumber : String(num).padStart(numberLength, '0');
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
            showNotification(t('nequiPaymentPendingNotification', { number: formattedRaffleNumber, name: participantName }), 'success');
        } else if (confirmPayment) {
            showNotification(t('participantRegisteredNotification', { name: participantName, number: formattedRaffleNumber }), 'success');
             if (raffleState.prize) {
                const ticketData = {
                    ...newParticipant,
                    raffleName: raffleState.prize,
                    organizerName: raffleState.organizerName,
                    gameDate: raffleState.gameDate,
                    lottery: raffleState.lottery === 'Otro' ? raffleState.customLottery : raffleState.lottery,
                    raffleRef: raffleState.raffleRef,
                    value: raffleState.value,
                    currencySymbol: raffleState.currencySymbol,
                };
                setGeneratedTicketData(ticketData);
             }
        }

        if (!confirmPayment) {
            handleTabClick('board');
        }

        return participantId;
    };

    const handleConfirmPayment = async (participantId: number) => {
        if (!raffleState.raffleRef || !isCurrentUserAdmin) return;
        await confirmParticipantPayment(raffleState.raffleRef, String(participantId));
    };
    
    const handleDownloadTicket = () => {
        const ticketElement = ticketModalRef.current;
        if (!ticketElement) return;
    
        const targetInfo = generatedTicketData || ticketInfo;
        if (!targetInfo) return;
        
        // Temporarily set a fixed size for canvas rendering if needed
        const originalWidth = ticketElement.style.width;
        ticketElement.style.width = '320px';

        import('html2canvas').then(html2canvas => {
            html2canvas(ticketElement, { 
                useCORS: true, 
                backgroundColor: null,
                scale: 3, // Increase scale for better quality
            }).then(canvas => {
                // Restore original style
                ticketElement.style.width = originalWidth;

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`tiquete_${targetInfo.raffleNumber}.pdf`);
                showNotification(t('ticketDownloaded'), 'success');
            });
        });
    };

    const handleShareTicket = () => {
        const targetInfo = generatedTicketData || ticketInfo;
        if (!targetInfo || !targetInfo.phoneNumber) return;

        const message = encodeURIComponent(t('shareTicketMessage', { prize: raffleState.prize || '' }));
        const whatsappUrl = `https://wa.me/57${targetInfo.phoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        
        if (isTicketModalOpen) {
            closeTicketModal();
        }
        if (generatedTicketData) {
            setGeneratedTicketData(null);
        }
    };
    
    const handleAdminSearch = ({ refToSearch, isInitialLoad = false, phoneToSearch, passwordToSearch, isPublicSearch = false }: { refToSearch?: string, isInitialLoad?: boolean, phoneToSearch?: string, passwordToSearch?: string, isPublicSearch?: boolean }) => {
        return new Promise<void>(async (resolve) => {
            if (!isInitialLoad) setLoading(true);
            
            const aRef = (refToSearch || (isPublicSearch ? publicRefSearch : adminRefSearch)).trim().toUpperCase();
            const aPhone = (phoneToSearch || adminPhoneSearch).trim();
            const aPassword = (passwordToSearch || adminPasswordSearch).trim();

            if (!aRef) {
                showNotification(t('enterReferenceWarning'), 'warning');
                if(!isInitialLoad) setLoading(false);
                resolve();
                return;
            }
            if (!isInitialLoad && !isPublicSearch && !aPhone ) {
                 showNotification(t('enterOrganizerPhoneWarning'), 'warning');
                 setLoading(false);
                 resolve();
                 return;
            }
             if (!isInitialLoad && !isPublicSearch && !aPassword ) {
                 showNotification(t('enterPasswordWarning'), 'warning');
                 setLoading(false);
                 resolve();
                 return;
            }


            raffleSubscription.current?.();
            
            const raffleDocRef = doc(db, 'raffles', aRef);

            if (persistenceEnabled) {
                await persistenceEnabled;
            }

            // For recovery, we need to get the doc once first.
            if (!isInitialLoad && !isPublicSearch) {
                try {
                    const docSnap = await getDoc(raffleDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data() as Raffle;
                        if (data.organizerPhoneNumber === aPhone && data.password === aPassword) {
                            localStorage.setItem('rifaAdminId', data.adminId!);
                            setCurrentAdminId(data.adminId);
                            showNotification(t('adminAccessRestored'), 'success');
                        } else {
                            showNotification(t('phoneOrPasswordMismatch'), 'error');
                            setLoading(false);
                            resolve();
                            return;
                        }
                    } else {
                         showNotification(t('raffleNotFound'), 'error');
                         setLoading(false);
                         resolve();
                         return;
                    }
                } catch (error) {
                    console.error("Error fetching raffle for recovery:", error);
                    showNotification(t('raffleVerificationError'), 'error');
                    setLoading(false);
                    resolve();
                    return;
                }
            }


            raffleSubscription.current = onSnapshot(raffleDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data() as Raffle;
                    
                    const adminIdFromStorage = localStorage.getItem('rifaAdminId');
                    if (adminIdFromStorage && data.adminId === adminIdFromStorage) {
                        setCurrentAdminId(adminIdFromStorage);
                    }

                    setRaffleState(data);
                    if (!isInitialLoad) { 
                        showNotification(t('loadingRaffle', { ref: aRef }), 'info');
                    }
                    setIsAdminLoginOpen(false);
                    setIsPublicSearchOpen(false);
                    setAdminRefSearch('');
                    setAdminPhoneSearch('');
                    setAdminPasswordSearch('');
                    setPublicRefSearch('');
                    setPartialWinners([]);
                    handleTabClick('board');
                    if (window.location.search !== `?ref=${aRef}`) {
                        window.history.pushState({}, '', `?ref=${aRef}`);
                    }
                } else if (!isInitialLoad) {
                    showNotification(t('raffleNotFound'), 'error');
                    setRaffleState(initialRaffleData);
                    setCurrentAdminId(null);
                    window.history.pushState({}, '', window.location.pathname);
                }
                setLoading(false);
                resolve();
            }, (error) => {
                console.error("Error subscribing to raffle:", error);
                showNotification(t('raffleLoadError'), 'error');
                setLoading(false);
                resolve();
            });
        });
    };
    
    const handleDrawWinner = async () => {
        if (!raffleState.raffleRef) return;
        
        const infiniteDigits = raffleState.infiniteModeDigits || 4;
        const winningNumberLength = raffleMode === 'infinite' ? infiniteDigits : numberLength;

        let winningNumberStr = raffleState.manualWinnerNumber;

        // Automatic draw logic
        if (raffleMode === 'infinite' && raffleState.automaticDraw && !winningNumberStr) {
            const max = Math.pow(10, winningNumberLength);
            const randomNumber = Math.floor(Math.random() * max);
            winningNumberStr = String(randomNumber).padStart(winningNumberLength, '0');
            // Update state to show the automatically drawn number
            handleLocalFieldChange('manualWinnerNumber', winningNumberStr);
        }
        
        if (!winningNumberStr || winningNumberStr.length < winningNumberLength) {
            showNotification(t('enterValidWinningNumber', { count: winningNumberLength }), 'warning');
            return;
        }

        const winner = confirmedParticipants.find((p: Participant) => p.raffleNumber === winningNumberStr);

        if (winner) {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { winner }, { merge: true });
            setShowConfetti(true);
            showNotification(t('winnerNotification', { name: winner.name, number: winner.raffleNumber }), 'success');
            setTimeout(() => setShowConfetti(false), 8000);
        } else {
             const houseWinner = {
                name: t('housePrize'),
                raffleNumber: winningNumberStr,
                isHouse: true,
            };
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { winner: houseWinner }, { merge: true });
            showNotification(t('housePrizeNotification', { number: winningNumberStr }), 'info');
        }
        handleTabClick('winners');
    };

    const handleFindPartialWinners = (numLastDigits: number, prizePercentage: number) => {
        if (!raffleState.prize) {
            showNotification(t('enterWinningNumberAndPrizeWarning'), 'warning');
            return;
        }
    
        const winningNumberStr = numLastDigits === 3 ? raffleState.manualWinnerNumber3 : raffleState.manualWinnerNumber2;
    
        if (!winningNumberStr || winningNumberStr.length !== numLastDigits) {
            showNotification(t('enterValidWinningNumber', { count: numLastDigits }), 'warning');
            return;
        }
    
        const prizeValue = parseFloat(String(raffleState.prize).replace(/\D/g, ''));
    
        if (isNaN(prizeValue) || prizeValue <= 0) {
            showNotification(t('noPrizeValueWarning'), 'warning');
            return;
        }
    
        const lastDigits = winningNumberStr;
        
        let searchableParticipants = confirmedParticipants;
        // Exclude the main winner
        if (raffleState.winner && !raffleState.winner.isHouse) {
            searchableParticipants = searchableParticipants.filter(p => p.raffleNumber !== raffleState.winner?.raffleNumber);
        }

        // If searching for 2-digit winners, exclude 3-digit winners
        if (numLastDigits === 2) {
            const threeDigitWinnerGroup = partialWinners.find(group => group.digits === 3);
            if (threeDigitWinnerGroup) {
                const threeDigitWinnerIds = new Set(threeDigitWinnerGroup.winners.map(w => w.id));
                searchableParticipants = searchableParticipants.filter(p => !threeDigitWinnerIds.has(p.id));
            }
        }
    
        const winners = searchableParticipants.filter(p => p.raffleNumber.endsWith(lastDigits));
        const prizeAmount = prizeValue * (prizePercentage / 100);
        const formattedPrize = `${raffleState.currencySymbol || '$'} ${prizeAmount.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    
        if (winners.length > 0) {
            const winnerMessage = winners.map(w => `${w.name} (${w.raffleNumber})`).join(', ');
            showNotification(t('partialWinnersNotification', { count: numLastDigits, digits: lastDigits, winners: winnerMessage, prize: formattedPrize }), 'success');
            
            setPartialWinners(prev => {
                const otherWinners = prev.filter(w => w.digits !== numLastDigits);
                return [...otherWinners, { winners, digits: numLastDigits, prize: formattedPrize }];
            });
        } else {
            showNotification(t('noPartialWinnersNotification', { count: numLastDigits, digits: lastDigits }), 'info');
            setPartialWinners(prev => prev.filter(w => w.digits !== numLastDigits));
        }
        handleTabClick('winners');
    };


    const handlePaymentMethodToggle = async (field: string, value: boolean) => {
        if (!raffleState.raffleRef || !isCurrentUserAdmin) return;
        handleLocalFieldChange(field, value);
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { [field]: value }, { merge: true });
    };

    const handlePriceButtonClick = async (mode: RaffleMode) => {
        setSelectedRaffleMode(mode);
        setIsPaymentMethodDialogOpen(true);
    };

    const handlePaymentMethodSelection = (method: 'qr' | 'gateway') => {
        setIsPaymentMethodDialogOpen(false);
        const mode = selectedRaffleMode;
        if (!mode) return;

        if (method === 'qr') {
            setIsQrPaymentDialogOpen(true);
        } else { // gateway
            let paymentLink = '';
            const redirectUrl = window.location.origin;
            const activationRef = `ACTIVATE_${mode}_CO_${Date.now()}`;

            if (mode === 'two-digit') {
                paymentLink = 'https://checkout.nequi.wompi.co/l/GWZUpk';
            } else if (mode === 'three-digit') {
                 paymentLink = 'https://checkout.nequi.wompi.co/l/9wH9fR';
            } else if (mode === 'infinite') {
                paymentLink = 'https://checkout.nequi.wompi.co/l/lwSfQT';
            }

            if (paymentLink) {
                const finalUrl = `${paymentLink}?redirect-url=${encodeURIComponent(redirectUrl)}&reference=${activationRef}`;
                window.location.href = finalUrl;
            } else {
                setIsCountrySelectionOpen(true);
            }
        }
    }


    const handleActivateBoard = async (mode: RaffleMode, countryCode: string) => {
        setIsCountrySelectionOpen(false);
        setLoading(true);
    
        let price = '0';
        const currencySymbol = getCurrencySymbol(countryCode);
        
        const isUSDCountry = [].includes(countryCode);

        if (countryCode === 'CO') {
            if (mode === 'two-digit') price = '12000';
            else if (mode === 'three-digit') price = '15000';
            else if (mode === 'infinite') price = '30000';
        } else if (isUSDCountry) {
            if (mode === 'two-digit') price = '10';
            else if (mode === 'three-digit') price = '15';
            else if (mode === 'infinite') price = '30';
        }
    
        try {
            const adminId = `admin_${Date.now()}_${Math.random()}`;
            localStorage.setItem('rifaAdminId', adminId);
            setCurrentAdminId(adminId);
    
            const newRef = await raffleManager.createNewRaffleRef();
            const newRaffleData: Raffle = {
                ...initialRaffleData,
                raffleMode: mode,
                raffleRef: newRef,
                adminId: adminId,
                isPaid: true,
                prizeImageUrl: '',
                value: price,
                currencySymbol: currencySymbol,
                infiniteModeDigits: 0,
            };
            
            await setDoc(doc(db, "raffles", newRef), newRaffleData);
    
            await handleAdminSearch({ refToSearch: newRef, isInitialLoad: true });
        } catch (error) {
            console.error("Error activating board:", error);
            showNotification(t('errorActivatingBoard'), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleTalkToAdmin = () => {
        if (!raffleState.organizerPhoneNumber) {
            showNotification(t('adminNumberNotSet'), 'warning');
            return;
        }
        const message = encodeURIComponent(t('contactAdminMessage'));
        const whatsappUrl = `https://wa.me/57${raffleState.organizerPhoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const handleShareToWhatsApp = () => {
        const urlToShare = window.location.origin;
        const message = encodeURIComponent(t('shareRaffleMessage'));
        const whatsappUrl = `https://wa.me/?text=${message}${encodeURIComponent(urlToShare)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleShareToFacebook = () => {
        const urlToShare = window.location.origin;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;
        window.open(facebookUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleGoToHome = () => {
        raffleSubscription.current?.();
        setRaffleState(initialRaffleData);
        setCurrentAdminId(null);
        setPartialWinners([]);
        localStorage.removeItem('rifaAdminId');
        if (window.location.search) {
            window.history.pushState({}, '', window.location.pathname);
        }
        showNotification(t('backToHome'), 'info');
    };
    
    const allNumbers = Array.from({ length: totalNumbers }, (_, i) => i);
    
    const backgroundImage = raffleState.prizeImageUrl;

    const closeTicketModal = () => {
        setIsTicketModalOpen(false);
        setTicketInfo(null);
    };


    if (loading && !raffleState.raffleRef) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">{t('loading')}...</div>;
    }
    
    const isRegisterFormValidForSubmit = raffleState.name && raffleState.phoneNumber && raffleState.raffleNumber && !allAssignedNumbers.has(parseInt(raffleState.raffleNumber || '0'));

    const renderBoardContent = () => {
        if (!raffleState.raffleRef) return null;
        
        return (
            <>
                {isCurrentUserAdmin && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-center font-semibold">
                        {t('adminMessage')}
                    </div>
                )}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-2/5 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('prizeSettings')}</h2>
                        {raffleState.raffleRef && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-500">{t('gameReference')}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-gray-800 tracking-wider">{raffleState.raffleRef}</p>
                                    <button onClick={handleTalkToAdmin} className="p-2 rounded-full hover:bg-gray-100">
                                        <WhatsappIcon />
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <div className="mb-6 rounded-lg overflow-hidden relative aspect-video max-w-2xl mx-auto shadow-lg bg-gray-200 flex items-center justify-center">
                             {raffleState.prizeImageUrl ? (
                                <Image src={raffleState.prizeImageUrl} alt={t('rafflePrizeAlt')} layout="fill" objectFit="cover" unoptimized key={raffleState.prizeImageUrl}/>
                            ) : (
                                <span className="text-gray-500">{t('noPrizeImage')}</span>
                            )}
                        </div>

                        <div className="space-y-4 mb-6">
                           <div>
                               <Label htmlFor="organizer-name-input">{t('whoOrganizes')}:</Label>
                               <Input
                                   id="organizer-name-input"
                                   type="text"
                                   value={raffleState.organizerName}
                                   onChange={(e) => handleLocalFieldChange('organizerName', e.target.value)}
                                   onBlur={(e) => handleFieldChange('organizerName', e.target.value)}
                                   placeholder={t('organizerNamePlaceholder')}
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           <div>
                                <Label htmlFor="organizer-phone-input">{t('organizerPhone')}:</Label>
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
                            {isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                                <div>
                                    <Label htmlFor="password-input">{t('adminPassword')}:</Label>
                                    <Input
                                        id="password-input"
                                        type="password"
                                        value={raffleState.password || ''}
                                        onChange={(e) => handleLocalFieldChange('password', e.target.value)}
                                        onBlur={(e) => handleFieldChange('password', e.target.value)}
                                        placeholder={t('adminPasswordPlaceholder')}
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full mt-1"
                                    />
                               </div>
                            )}
                           <div>
                               <Label htmlFor="prize-input">{t('prize')}:</Label>
                               <Input
                                   id="prize-input"
                                   type="text"
                                   value={raffleState.prize}
                                   onChange={(e) => handleLocalFieldChange('prize', e.target.value)}
                                   onBlur={(e) => handleFieldChange('prize', e.target.value)}
                                   placeholder={raffleMode === 'infinite' ? t('prizePlaceholderInfinite') : t('prizePlaceholderFinite')}
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                   className="w-full mt-1"
                               />
                           </div>
                           {isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                                <div>
                                    <Label htmlFor="prize-image-url-input">{t('prizeImage')}</Label>
                                    <div className="flex gap-2 mt-1">
                                        <a href="https://www.google.com/imghp" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                            <Button type="button" variant="outline">
                                                <Search className="h-4 w-4 mr-2" />
                                                {t('searchOnGoogle')}
                                            </Button>
                                        </a>
                                        <Input
                                            id="prize-image-url-input"
                                            type="text"
                                            value={raffleState.prizeImageUrl}
                                            onChange={(e) => handleLocalFieldChange('prizeImageUrl', e.target.value)}
                                            onBlur={(e) => handleFieldChange('prizeImageUrl', e.target.value)}
                                            placeholder={t('pasteImageLinkPlaceholder')}
                                            disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                           )}
                           <div>
                                <Label htmlFor="value-input">{t('ticketValue')}:</Label>
                                <Input
                                    id="value-input"
                                    type="text"
                                    value={formatValueForDisplay(raffleState.value)}
                                    onChange={(e) => handleLocalFieldChange('value', e.target.value)}
                                    onBlur={(e) => handleFieldChange('value', raffleState.value)}
                                    placeholder="Ej: 5000"
                                    disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                    className="w-full mt-1"
                                />
                            </div>
                           {raffleState.raffleMode === 'infinite' && (
                                <div>
                                    <Label htmlFor="infinite-digits-input">{t('infiniteRaffleDigits')}:</Label>
                                    <Input
                                        id="infinite-digits-input"
                                        type="number"
                                        min="4"
                                        value={raffleState.infiniteModeDigits || ''}
                                        onChange={(e) => handleLocalFieldChange('infiniteModeDigits', e.target.value)}
                                        onBlur={(e) => handleFieldChange('infiniteModeDigits', raffleState.infiniteModeDigits)}
                                        placeholder={t('min4Digits')}
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full mt-1"
                                    />
                                </div>
                            )}
                            {raffleState.raffleMode === 'infinite' && isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                               <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 rounded-lg">
                                    <Label htmlFor="allow-partial-winners" className="flex flex-col space-y-1">
                                        <span>{t('allowPartialWinners')}</span>
                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                            {t('allowPartialWinnersDescription')}
                                        </span>
                                    </Label>
                                    <Switch
                                        id="allow-partial-winners"
                                        checked={raffleState.allowPartialWinners}
                                        onCheckedChange={(checked) => {
                                            handleLocalFieldChange('allowPartialWinners', checked);
                                            handleFieldChange('allowPartialWinners', checked);
                                        }}
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                    />
                                </div>
                            )}
                           <div>
                               <Label htmlFor="game-date-input">{t('gameDate')}:</Label>
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
                           {raffleMode === 'infinite' && isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                               <div className="flex items-center space-x-2">
                                   <Switch
                                       id="automatic-draw"
                                       checked={raffleState.automaticDraw}
                                       onCheckedChange={(checked) => {
                                          handleLocalFieldChange('automaticDraw', checked)
                                          handleFieldChange('automaticDraw', checked)
                                       }}
                                   />
                                   <Label htmlFor="automatic-draw">{t('automaticDraw')}</Label>
                               </div>
                            )}
                           <div>
                               <Label htmlFor="lottery-input">{t('lottery')}:</Label>
                               <select
                                   id="lottery-input"
                                   value={raffleState.lottery}
                                   onChange={(e) => {
                                       const value = e.target.value;
                                       handleFieldChange('lottery', value);
                                   }}
                                   disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed || (raffleMode === 'infinite' && raffleState.automaticDraw)}
                                   className="w-full mt-1 px-3 py-2 text-base border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                               >
                                   <option value="">{t('selectLottery')}</option>
                                   <option value="Lotería de Bogotá">{t('lotteryBogota')}</option>
                                   <option value="Lotería de Medellín">{t('lotteryMedellin')}</option>
                                   <option value="Lotería de Cundinamarca">{t('lotteryCundinamarca')}</option>
                                   <option value="Lotería del Valle">{t('lotteryValle')}</option>
                                   <option value="Lotería del Tolima">{t('lotteryTolima')}</option>
                                   <option value="Lotería de la Cruz Roja">{t('lotteryRedCross')}</option>
                                   <option value="Otro">{t('other')}</option>
                               </select>
                           </div>
                           {raffleState.lottery === 'Otro' && (
                                <div>
                                    <Label htmlFor="custom-lottery-input">{t('specifyLottery')}:</Label>
                                    <Input
                                        id="custom-lottery-input"
                                        type="text"
                                        value={raffleState.customLottery}
                                        onChange={(e) => handleLocalFieldChange('customLottery', e.target.value)}
                                        onBlur={(e) => handleFieldChange('customLottery', e.target.value)}
                                        placeholder={t('lotteryNamePlaceholder')}
                                        disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                        className="w-full mt-1"
                                    />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="nequi-account-input">{t('nequiAccount')}:</Label>
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
                               <Label htmlFor="payment-link-input">{t('paymentLink')}:</Label>
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
                            {isCurrentUserAdmin && !raffleState.isDetailsConfirmed && (
                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <Button
                                        onClick={handleConfirmDetails}
                                        className="w-full bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                    >
                                        {t('confirmPrizeDetails')}
                                    </Button>
                                </div>
                            )}
                        </div>
                   </div>

                   <div className="lg:w-3/5 flex-grow">
                       {isCurrentUserAdmin && (
                         <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('draw')}</h2>
                             <div className="space-y-4">
                                 <div className="flex flex-wrap gap-3 items-end">
                                     <div className="flex-grow">
                                        <Label htmlFor="manual-winner-input">{raffleState.automaticDraw ? t('winningNumber') + ' (auto)' : t('winningNumber')}</Label>
                                        <Input
                                            id="manual-winner-input"
                                            type="text"
                                            placeholder={t('winningNumberPlaceholder', { count: raffleState.raffleMode === 'infinite' ? (raffleState.infiniteModeDigits || 4) : numberLength })}
                                            value={raffleState.manualWinnerNumber}
                                            onChange={(e) => handleLocalFieldChange('manualWinnerNumber', e.target.value)}
                                            maxLength={raffleState.raffleMode === 'infinite' ? raffleState.infiniteModeDigits : numberLength}
                                            disabled={raffleState.isWinnerConfirmed || raffleState.automaticDraw}
                                            className="w-full"
                                        />
                                     </div>
                                     <div className="flex flex-col items-end">
                                        {raffleState.raffleMode === 'infinite' && (
                                            <div className="text-center mb-1">
                                                <span className="text-sm font-bold text-green-600">{formatValue(raffleState.prize)}</span>
                                                <p className="text-xs text-gray-500">{t('singleWinner')}</p>
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleDrawWinner}
                                            disabled={raffleState.isWinnerConfirmed}
                                            className="bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                                        >
                                            {raffleState.automaticDraw ? t('automaticDraw') : t('findWinner')}
                                        </Button>
                                     </div>
                                 </div>

                                {raffleMode === 'infinite' && raffleState.allowPartialWinners && (
                                    <>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-grow">
                                                <Label htmlFor="manual-winner-3-input">{t('last3DigitsNumber')}</Label>
                                                <Input
                                                    id="manual-winner-3-input"
                                                    type="text"
                                                    placeholder={t('last3Digits')}
                                                    value={raffleState.manualWinnerNumber3}
                                                    onChange={(e) => handleLocalFieldChange('manualWinnerNumber3', e.target.value)}
                                                    maxLength={3}
                                                    disabled={raffleState.isWinnerConfirmed}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Label>{t('percentage')}</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={raffleState.partialWinnerPercentage3 || ''}
                                                    onChange={(e) => handleLocalFieldChange('partialWinnerPercentage3', e.target.value)}
                                                    onBlur={(e) => handleFieldChange('partialWinnerPercentage3', raffleState.partialWinnerPercentage3)}
                                                    className="w-full"
                                                    placeholder="%"
                                                    disabled={raffleState.isWinnerConfirmed}
                                                />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-center mb-1">
                                                    <span className="text-sm font-bold text-green-600">{formatValue(parseFloat(String(raffleState.prize).replace(/\D/g, '') || '0') * (raffleState.partialWinnerPercentage3 || 0) / 100)}</span>
                                                    <p className="text-xs text-gray-500">{t('otherWinners')}</p>
                                                 </div>
                                                <Button
                                                    onClick={() => handleFindPartialWinners(3, raffleState.partialWinnerPercentage3 || 0)}
                                                    disabled={raffleState.isWinnerConfirmed}
                                                    className="bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                                                >
                                                    {t('findWinner')}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-grow">
                                                <Label htmlFor="manual-winner-2-input">{t('last2DigitsNumber')}</Label>
                                                <Input
                                                    id="manual-winner-2-input"
                                                    type="text"
                                                    placeholder={t('last2Digits')}
                                                    value={raffleState.manualWinnerNumber2}
                                                    onChange={(e) => handleLocalFieldChange('manualWinnerNumber2', e.target.value)}
                                                    maxLength={2}
                                                    disabled={raffleState.isWinnerConfirmed}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="w-24">
                                                 <Label>{t('percentage')}</Label>
                                                 <Input
                                                     type="number"
                                                     min="0"
                                                     max="100"
                                                     value={raffleState.partialWinnerPercentage2 || ''}
                                                     onChange={(e) => handleLocalFieldChange('partialWinnerPercentage2', e.target.value)}
                                                     onBlur={(e) => handleFieldChange('partialWinnerPercentage2', raffleState.partialWinnerPercentage2)}
                                                     className="w-full"
                                                     placeholder="%"
                                                     disabled={raffleState.isWinnerConfirmed}
                                                 />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                 <div className="text-center mb-1">
                                                    <span className="text-sm font-bold text-green-600">{formatValue(parseFloat(String(raffleState.prize).replace(/\D/g, '') || '0') * (raffleState.partialWinnerPercentage2 || 0) / 100)}</span>
                                                    <p className="text-xs text-gray-500">{t('otherWinners')}</p>
                                                 </div>
                                                <Button
                                                    onClick={() => handleFindPartialWinners(2, raffleState.partialWinnerPercentage2 || 0)}
                                                    disabled={raffleState.isWinnerConfirmed}
                                                    className="bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                                                >
                                                    {t('findWinner')}
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                 <div className="flex flex-wrap gap-3 items-center">
                                     {raffleState.winner && !raffleState.isWinnerConfirmed && (
                                         <Button
                                             onClick={handleConfirmWinner}
                                             className="bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                                         >
                                             {t('confirmResult')}
                                         </Button>
                                     )}
                                     <Button
                                         onClick={resetBoard}
                                         className="bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                                     >
                                         {t('resetBoard')}
                                     </Button>
                                 </div>
                             </div>
                             {raffleState.isWinnerConfirmed && (
                                 <p className="mt-4 text-green-600 font-semibold">{t('resultConfirmedAndBoardClosed')}</p>
                             )}
                         </div>
                       )}

                        {raffleMode !== 'infinite' ? (
                           <div>
                               <div className="flex justify-between items-center mb-4">
                                   <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                       {t('numberBoard')}
                                   </h2>
                                   {raffleState.raffleRef && (
                                        <div className="font-semibold text-gray-700">
                                            {t('mode')}: {raffleMode === 'two-digit' ? t('2digitMode') : t('3digitMode')}
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
                                        <span>{t('available')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                                        <span>{t('pending')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-red-600"></div>
                                        <span>{t('sold')}</span>
                                    </div>
                                </div>
                               {!!raffleState.winner && !raffleState.isWinnerConfirmed && (
                                    <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                                        <p className="font-bold">{t('boardLocked')}</p>
                                        <p>{t('boardLockedWinnerFound')}</p>
                                    </div>
                                )}
                               {!raffleState.isDetailsConfirmed && (
                                    <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                                        <p className="font-bold">{t('boardLocked')}</p>
                                        <p>{t('boardLockedConfirmDetails')}</p>
                                    </div>
                                )}
                           </div>
                        ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-lg">
                                 <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                                    <InfinityIcon className="h-6 w-6"/>
                                    {t('infiniteRaffle')}
                                </h2>
                                <p className="text-gray-600 mt-2">
                                    {t('infiniteRaffleDescription')}
                                </p>
                            </div>
                        )}
                   </div>
                </div>
            </>
        )
    }

    
    return (
        <div className="min-h-screen bg-background font-sans relative">
            {backgroundImage && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <Image src={backgroundImage} alt={t('raffleBackgroundAlt')} layout="fill" objectFit="cover" unoptimized />
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
                                     <DropdownMenuItem onSelect={() => handleGoToHome()}>
                                        <House className="mr-2 h-4 w-4" />
                                        <span>{t('goToHome')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setIsPublicSearchOpen(true)}>
                                        <Search className="mr-2 h-4 w-4" />
                                        <span>{t('searchRaffleByRef')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setIsAdminLoginOpen(true)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>{t('recoverAdminAccess')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)}>
                                        <Share2 className="mr-2 h-4 w-4" />
                                        <span>{t('share')}</span>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => setIsQrDialogOpen(true)}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        <span>{t('showQR')}</span>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={handleInstallClick}>
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>{t('installApp')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={toggleLanguage}>
                                        <Languages className="mr-2 h-4 w-4" />
                                        <span>{t('languages')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="text-center">
                            <h1 className="text-4xl font-bold">REFA⚡ EXPRESS</h1>
                        </div>
                        <div className="w-10">
                            {/* Placeholder for symmetry */}
                        </div>
                    </div>

                    {!raffleState.raffleRef ? (
                        <div className="p-8">
                            <div className="text-center">
                                <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('boardLocked')}</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    {t('boardLockedDescription')}
                                </p>
                                
                                <div className="flex flex-col justify-center items-center gap-8 my-8">
                                    
                                    {/* Ticket for 2 digits */}
                                    <div className="bg-white rounded-2xl shadow-lg flex flex-col max-w-md w-full">
                                        <div className='flex'>
                                            <div className="bg-purple-100 p-4 flex flex-col items-center justify-center rounded-l-2xl border-r-2 border-dashed border-purple-300">
                                                <TicketIcon className="h-10 w-10 text-purple-600 mb-2" />
                                                <span className="text-purple-800 font-bold text-lg">2</span>
                                                <span className="text-purple-600 text-xs">{t('digits')}</span>
                                            </div>
                                            <div className="p-6 flex-grow">
                                                <h5 className="mb-1 text-xl font-bold tracking-tight text-gray-900">{t('2digitRaffle')}</h5>
                                                <p className="font-normal text-gray-600 mb-4 text-sm">{t('2digitRaffleDescription')}</p>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 space-y-2">
                                            <Button onClick={() => handlePriceButtonClick('two-digit')} size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                                                {t('price')}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Ticket for 3 digits */}
                                    <div className="bg-white rounded-2xl shadow-lg flex flex-col max-w-md w-full">
                                        <div className='flex'>
                                            <div className="bg-blue-100 p-4 flex flex-col items-center justify-center rounded-l-2xl border-r-2 border-dashed border-blue-300">
                                                <TicketIcon className="h-10 w-10 text-blue-600 mb-2" />
                                                <span className="text-blue-800 font-bold text-lg">3</span>
                                                <span className="text-blue-600 text-xs">{t('digits')}</span>
                                            </div>
                                            <div className="p-6 flex-grow">
                                                <h5 className="mb-1 text-xl font-bold tracking-tight text-gray-900">{t('3digitRaffle')}</h5>
                                                <p className="font-normal text-gray-600 mb-4 text-sm">{t('3digitRaffleDescription')}</p>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 space-y-2">
                                            <Button onClick={() => handlePriceButtonClick('three-digit')} size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
                                                {t('price')}
                                            </Button>
                                        </div>
                                    </div>

                                     {/* Ticket for infinite numbers */}
                                     <div className="bg-white rounded-2xl shadow-lg flex flex-col max-w-md w-full">
                                        <div className='flex'>
                                            <div className="bg-red-100 p-4 flex flex-col items-center justify-center rounded-l-2xl border-r-2 border-dashed border-red-300">
                                                <InfinityIcon className="h-10 w-10 text-red-600 mb-2" />
                                                <span className="text-red-800 font-bold text-lg">∞</span>
                                                <span className="text-red-600 text-xs">{t('infinite_caps')}</span>
                                            </div>
                                            <div className="p-6 flex-grow">
                                                <h5 className="mb-1 text-xl font-bold tracking-tight text-gray-900">{t('infiniteRaffle')}</h5>
                                                <p className="font-normal text-gray-600 mb-4 text-sm">{t('infiniteRaffleHomeDescription')}</p>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 space-y-2">
                                            <Button onClick={() => handlePriceButtonClick('infinite')} size="lg" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold">
                                                {t('price')}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                </div>
                                <Button onClick={() => setIsPublicSearchOpen(true)} size="lg" className="w-full max-w-md bg-purple-600 hover:bg-purple-700 text-white font-bold">
                                    {t('orSearchByReference')}
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
                                        <TicketIcon className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('board')}</span>
                                    </button>
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'register' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('register')}
                                        disabled={!raffleState.raffleRef}
                                    >
                                        <span className="md:hidden">✏️</span> <span className="hidden md:inline">{t('register')}</span>
                                    </button>
                                    {isCurrentUserAdmin && (
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'pending' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('pending')}
                                    >
                                        <Clock className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('pendingTab', { count: pendingParticipants.length })}</span>
                                    </button>
                                    )}
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'participants' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('participants')}
                                        disabled={!raffleState.raffleRef}
                                    >
                                        <Users className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('participants')}</span>
                                    </button>
                                    {(raffleState.winner || partialWinners.length > 0) && (
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'winners' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => handleTabClick('winners')}
                                    >
                                        <Trophy className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('winnersTab')}</span>
                                    </button>
                                    )}
                                    {isCurrentUserAdmin && (
                                    <button 
                                        className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'recaudado' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setIsSalesModalOpen(true)}
                                    >
                                        <DollarSign className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('collected')}</span>
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
                                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('registerNumber')}</h2>
                                        {isCurrentUserAdmin && (
                                            <div className="bg-gray-100 p-4 rounded-lg mb-6 space-y-4">
                                                <h3 className="font-semibold text-lg text-gray-800">{t('adminControls')}</h3>
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="enable-nequi" className="flex flex-col space-y-1">
                                                        <span>{t('enableNequiPayment')}</span>
                                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                                            {t('enableNequiPaymentDescription')}
                                                        </span>
                                                    </Label>
                                                    <Switch
                                                        id="enable-nequi"
                                                        checked={raffleState.isNequiEnabled}
                                                        onCheckedChange={(checked) => handlePaymentMethodToggle('isNequiEnabled', checked)}
                                                        disabled={!raffleState.nequiAccountNumber}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="enable-payment-link" className="flex flex-col space-y-1">
                                                        <span>{t('enablePaymentLink')}</span>
                                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                                            {t('enablePaymentLinkDescription')}
                                                        </span>
                                                    </Label>
                                                    <Switch
                                                        id="enable-payment-link"
                                                        checked={raffleState.isPaymentLinkEnabled}
                                                        onCheckedChange={(checked) => handlePaymentMethodToggle('isPaymentLinkEnabled', checked)}
                                                        disabled={!raffleState.paymentLink}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <fieldset disabled={!raffleState.raffleRef || raffleState.isWinnerConfirmed || !raffleState.isDetailsConfirmed || !!raffleState.winner} className="disabled:opacity-50 space-y-4">
                                            <div className="flex flex-col gap-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="name-input">{t('fullName')}:</Label>
                                                        <Input
                                                            id="name-input"
                                                            type="text"
                                                            value={raffleState.name}
                                                            onChange={(e) => handleLocalFieldChange('name', e.target.value)}
                                                            placeholder={t('namePlaceholder')}
                                                            className="w-full mt-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="phone-input">{t('phone')}:</Label>
                                                        <div className="relative mt-1">
                                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                                <span className="text-gray-500 sm:text-sm">+57</span>
                                                            </div>
                                                            <Input
                                                                id="phone-input"
                                                                type="tel"
                                                                value={raffleState.phoneNumber}
                                                                onChange={(e) => handleLocalFieldChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
                                                                placeholder="3001234567"
                                                                className="w-full pl-12"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor="raffle-number-input">{t('raffleNumberLabel', { range: raffleState.raffleMode === 'two-digit' ? '00-99' : raffleState.raffleMode === 'three-digit' ? '000-999' : t('infiniteDigits', { count: raffleState.infiniteModeDigits || 4 }) })}:</Label>
                                                    <Input
                                                        id="raffle-number-input"
                                                        type="text"
                                                        value={raffleState.raffleNumber}
                                                        onChange={handleRaffleNumberChange}
                                                        placeholder={t('raffleNumberPlaceholder', { example: raffleState.raffleMode === 'two-digit' ? '05' : raffleState.raffleMode === 'three-digit' ? '142' : '2025' })}
                                                        className="w-full mt-1"
                                                        maxLength={raffleState.raffleMode === 'infinite' ? (raffleState.infiniteModeDigits || 4) : numberLength}
                                                    />
                                                    {raffleState.raffleNumber && allAssignedNumbers.has(parseInt(raffleState.raffleNumber)) && (
                                                        <p className="text-red-500 text-sm mt-1">{t('numberAlreadyAssignedWarning')}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {raffleState.isNequiEnabled && raffleState.nequiAccountNumber && raffleState.value && (
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
                                                                <span className="ml-2">{t('payWithNequi')}</span>
                                                            </Button>
                                                        </a>
                                                    )}
                                                    {raffleState.isPaymentLinkEnabled && raffleState.paymentLink && (
                                                        <a
                                                            href={raffleState.paymentLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1"
                                                            onClick={async (e) => {
                                                                if (!isRegisterFormValidForSubmit) {
                                                                    e.preventDefault();
                                                                    handleRegisterParticipant(); // show validation to fill form
                                                                    return;
                                                                }
                                                                
                                                                e.preventDefault(); // Prevent immediate navigation
                                                                
                                                                const url = new URL(raffleState.paymentLink);
                                                                // Pass info for confirmation after payment
                                                                url.searchParams.set('pName', raffleState.name || '');
                                                                url.searchParams.set('pPhone', raffleState.phoneNumber || '');
                                                                url.searchParams.set('pNum', raffleState.raffleNumber || '');
                                                                window.open(url.toString(), '_blank');
                                                                
                                                                // Clear form after opening link
                                                                setRaffleState(prevState => ({
                                                                    ...prevState,
                                                                    name: '',
                                                                    phoneNumber: '',
                                                                    raffleNumber: '',
                                                                }));
                                                                handleTabClick('board');
                                                            }}
                                                        >
                                                            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!isRegisterFormValidForSubmit}>
                                                                <LinkIcon className="mr-2 h-4 w-4" />
                                                                <span>{t('payWithLink')}</span>
                                                            </Button>
                                                        </a>
                                                    )}
                                                     {isCurrentUserAdmin && (
                                                        <Button 
                                                            className="w-full bg-green-600 hover:bg-green-700" 
                                                            onClick={() => handleRegisterParticipant(false, true)}
                                                            disabled={!isRegisterFormValidForSubmit}
                                                        >
                                                            {t('registerAndConfirmPayment')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {generatedTicketData && (
                                        <InlineTicket ticketModalRef={ticketModalRef} ticketData={generatedTicketData} setGeneratedTicketData={setGeneratedTicketData} handleDownloadTicket={handleDownloadTicket} handleShareTicket={handleShareTicket} formatValue={formatValue} t={t} language={language}/>
                                    )}

                                    {(!raffleState.raffleRef || !raffleState.isDetailsConfirmed) && (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">{t('notice')}</p>
                                            <p>{t('activateRaffleWarning')}</p>
                                        </div>
                                    )}
                                    {(raffleState.isWinnerConfirmed || !!raffleState.winner) && (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">{t('gameFinished')}</p>
                                            <p>{t('gameFinishedRegistrationDisabled')}</p>
                                        </div>
                                    )}
                                </div>
                                {isCurrentUserAdmin && (
                                <div className={activeTab === 'pending' ? 'tab-content active' : 'tab-content'}>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('pendingPayments')}</h2>
                                    {pendingParticipants.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('number')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phone')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registrationDate')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('action')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {pendingParticipants.sort((a: Participant, b: Participant) => a.raffleNumber.localeCompare(b.raffleNumber)).map((p: Participant) => (
                                                        <tr key={p.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {p.timestamp && p.timestamp.toDate ? format(p.timestamp.toDate(), 'PPpp', { locale: language === 'es' ? es : enUS }) : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <Button onClick={() => handleConfirmPayment(p.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                                                    {t('confirmPayment')}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">{t('noPendingPayments')}</p>
                                    )}
                                </div>
                                )}
                                <div className={activeTab === 'participants' ? 'tab-content active' : 'tab-content'}>
                                    <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">{t('confirmedParticipants')}</h2>
                                            
                                    </div>

                                    {!raffleState.raffleRef ? (
                                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-6" role="alert">
                                            <p className="font-bold">{t('notice')}</p>
                                            <p>{t('activateRaffleToSeeParticipants')}</p>
                                        </div>
                                    ) : confirmedParticipants.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('phone')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('number')}</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('action')}</th>
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
                                                                {isCurrentUserAdmin ? (
                                                                    <a
                                                                        href={`https://wa.me/57${p.phoneNumber}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 text-blue-600 hover:underline"
                                                                    >
                                                                        <WhatsappIcon className="h-4 w-4 text-green-500" />
                                                                        {p.phoneNumber}
                                                                    </a>
                                                                ) : (
                                                                    <span>******</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <Button onClick={() => handleGenerateTicket(p)} size="sm" variant="outline" disabled={!raffleState.prize}>
                                                                    {t('generateTicket')}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">{t('noConfirmedParticipants')}</p>
                                    )}
                                </div>
                                <div className={activeTab === 'winners' ? 'tab-content active' : 'tab-content'}>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('winnersTab')}</h2>
                                    {raffleState.winner && (
                                        <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                                            {raffleState.winner.isHouse ? (
                                                <p className="font-bold text-lg flex items-center"><House className="mr-2"/>{t('housePrizeTitle')}</p>
                                            ) : (
                                                <p className="font-bold text-lg flex items-center"><Award className="mr-2"/>{t('winnerFoundTitle')}</p>
                                            )}
                                            <p><strong>{t('number')}:</strong> {raffleState.winner.raffleNumber}</p>
                                            {!raffleState.winner.isHouse && (
                                            <>
                                                <p><strong>{t('name')}:</strong> {raffleState.winner.name}</p>
                                                <p><strong>{t('phone')}:</strong> {isCurrentUserAdmin ? 
                                                    <a href={`https://wa.me/57${raffleState.winner.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{`+57 ${raffleState.winner.phoneNumber}`}</a>
                                                    : <span>******</span>
                                                }</p>
                                            </>
                                            )}
                                        </div>
                                    )}

                                    {partialWinners.length > 0 && (
                                        <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-lg space-y-4">
                                            <h3 className="font-bold text-lg">{t('partialWinnersTitle')}</h3>
                                            {partialWinners.map((group, index) => (
                                                <div key={index}>
                                                    <p className="font-semibold">{t('partialWinnersSubtitle', { count: group.digits, prize: group.prize })}</p>
                                                    <ul className="list-disc list-inside text-sm">
                                                        {group.winners.map(winner => (
                                                            <li key={winner.id}>
                                                                {winner.name} ({winner.raffleNumber})
                                                                {isCurrentUserAdmin && (
                                                                     <a href={`https://wa.me/57${winner.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">{`+57 ${winner.phoneNumber}`}</a>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!raffleState.winner && partialWinners.length === 0 && (
                                        <p className="text-gray-500">{t('noWinnersYet')}</p>
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
                        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('confirmAction')}</h3>
                        <p className="text-gray-500 mb-6">{confirmationMessage}</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    if(confirmationAction) confirmationAction();
                                    setShowConfirmation(false);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <Dialog open={isTicketModalOpen} onOpenChange={closeTicketModal}>
                <DialogContent className="w-auto max-w-xs p-0 border-0 bg-transparent shadow-none font-sans">
                     <DialogHeader>
                        <DialogTitle className="sr-only">{t('raffleTicket')}</DialogTitle>
                     </DialogHeader>
                     {ticketInfo && (
                        <div>
                            <div
                                ref={ticketModalRef}
                                className="bg-white p-2 rounded-lg shadow-lg font-mono text-gray-800 text-[11px] relative overflow-hidden"
                                style={{width: '280px'}}
                            >
                                <div className="absolute inset-0 flex items-center justify-center z-0">
                                    <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none opacity-50">RIFA EXPRESS</p>
                                </div>
                                <div className="relative z-10">
                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold">REFA⚡ EXPRESS</h3>
                                        <p>{t('reference')}: {ticketInfo.raffleRef}</p>
                                        <p className="font-semibold">{t('purchaseReceipt')}</p>
                                    </div>
                                    <p className="text-center text-xs mb-4">{ticketInfo.timestamp?.toDate ? format(ticketInfo.timestamp.toDate(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale: language === 'es' ? es : enUS }) : t('dateNotAvailable')}</p>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span>{t('client')}:</span><span className="font-semibold text-right">{ticketInfo.name}</span></div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <h4 className="font-bold text-center mb-2">{t('raffleDetails')}</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span>{t('prize_caps')}:</span><span className="font-semibold text-right">{formatValue(ticketInfo.raffleName)}</span></div>
                                        <div className="flex justify-between"><span>{t('ticketValue_caps')}:</span><span className="font-semibold text-right">{formatValue(ticketInfo.value)}</span></div>
                                        <div className="flex justify-between"><span>{t('drawDate_caps')}:</span><span className="font-semibold text-right">{ticketInfo.gameDate ? format(new Date(ticketInfo.gameDate + 'T00:00:00'), "d 'de' MMMM 'de' yyyy", { locale: language === 'es' ? es : enUS }) : 'N/A'}</span></div>
                                        <div className="flex justify-between"><span>{t('playedWith_caps')}:</span><span className="font-semibold text-right">{ticketInfo.lottery}</span></div>
                                        <div className="flex justify-between"><span>{t('organizedBy_caps')}:</span><span className="font-semibold text-right">{ticketInfo.organizerName}</span></div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <div className="text-center my-4">
                                        <p className="font-bold">{t('assignedNumber_caps')}</p>
                                        <p className="text-5xl font-bold text-violet-600 tracking-wider">{ticketInfo.raffleNumber}</p>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <p className="text-center font-semibold">{t('thanksForParticipating')}</p>
                                </div>
                            </div>
                            <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 w-full pt-4">
                                <Button
                                    onClick={handleDownloadTicket}
                                    className="w-full bg-purple-500 text-white"
                                >
                                    {t('downloadTicket')}
                                </Button>
                                <Button
                                    onClick={handleShareTicket}
                                    className="w-full bg-green-500 text-white flex items-center justify-center gap-2"
                                >
                                    <WhatsappIcon/>
                                    {t('share')}
                                </Button>
                                <Button
                                    onClick={closeTicketModal}
                                    variant="outline"
                                    className="w-full bg-white/80"
                                >
                                    {t('close')}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('recoverAdminAccess')}</DialogTitle>
                        <DialogDescription>
                            {t('recoverAdminAccessDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="admin-ref-search" className="text-right">
                                {t('reference')}
                            </Label>
                            <Input
                                id="admin-ref-search"
                                value={adminRefSearch}
                                onChange={(e) => setAdminRefSearch(e.target.value)}
                                className="col-span-3"
                                placeholder="Ej: JM1"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="admin-phone-search" className="text-right">
                                {t('phone')}
                            </Label>
                             <div className="relative col-span-3">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">+57</span>
                                </div>
                                <Input
                                    id="admin-phone-search"
                                    type="tel"
                                    value={adminPhoneSearch}
                                    onChange={(e) => setAdminPhoneSearch(e.target.value.replace(/\D/g, ''))}
                                    className="pl-12"
                                    placeholder="3001234567"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="admin-password-search" className="text-right">
                                {t('password')}
                            </Label>
                            <Input
                                id="admin-password-search"
                                type="password"
                                value={adminPasswordSearch}
                                onChange={(e) => setAdminPasswordSearch(e.target.value)}
                                className="col-span-3"
                                placeholder={t('yourPassword')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAdminLoginOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" onClick={() => handleAdminSearch({ phoneToSearch: adminPhoneSearch, passwordToSearch: adminPasswordSearch })}>{t('recover')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPublicSearchOpen} onOpenChange={setIsPublicSearchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('searchRaffleByRef')}</DialogTitle>
                        <DialogDescription>
                            {t('searchRaffleByRefDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="public-ref-search" className="text-right">
                                {t('reference')}
                            </Label>
                            <Input
                                id="public-ref-search"
                                value={publicRefSearch}
                                onChange={(e) => setPublicRefSearch(e.target.value)}
                                className="col-span-3"
                                placeholder="Ej: JM1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPublicSearchOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" onClick={() => handleAdminSearch({ isPublicSearch: true })}>{t('search')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isSalesModalOpen} onOpenChange={setIsSalesModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('salesCollection')}</DialogTitle>
                        <DialogDescription>
                            {t('salesCollectionDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                            <p className="font-semibold text-gray-600">{t('ticketsSold')}:</p>
                            <p className="font-bold text-xl text-gray-800">{confirmedParticipants.length}</p>
                        </div>
                        <div className="flex justify-between items-center bg-green-100 p-4 rounded-lg mt-4">
                            <p className="font-semibold text-green-800">{t('totalCollected')}:</p>
                            <p className="font-bold text-2xl text-green-800">{formatValue(totalCollected)}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSalesModalOpen(false)}>{t('close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('shareRaffle')}</DialogTitle>
                        <DialogDescription>
                            {t('shareRaffleAppDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        <Button
                            onClick={() => handleShareToWhatsApp()}
                            className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                            <WhatsappIcon />
                            <span>{t('shareOnWhatsApp')}</span>
                        </Button>
                        <Button
                            onClick={() => handleShareToFacebook()}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <FacebookIcon />
                            <span>{t('shareOnFacebook')}</span>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>{t('close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center">{t('shareWithQR')}</DialogTitle>
                        <DialogDescription className="text-center">
                            {t('shareWithQRDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    {appUrl && (
                        <div className="flex justify-center items-center p-4">
                            <div className="relative inline-block p-4 bg-white rounded-lg shadow-md">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&qzone=1&ecc=H`}
                                    alt={t('appQRCodeAlt')}
                                    width={200}
                                    height={200}
                                />
                                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                     <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm">
                                        <span className="font-bold text-5xl text-yellow-500">⚡</span>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            
            <CountrySelectionDialog
              isOpen={isCountrySelectionOpen}
              onClose={() => setIsCountrySelectionOpen(false)}
              onSelectCountry={(countryCode) => {
                if (selectedRaffleMode) {
                  handleActivateBoard(selectedRaffleMode, countryCode);
                }
              }}
              raffleMode={selectedRaffleMode}
              t={t}
            />

            <PaymentMethodDialog 
                isOpen={isPaymentMethodDialogOpen}
                onClose={() => setIsPaymentMethodDialogOpen(false)}
                onSelect={handlePaymentMethodSelection}
                t={t}
            />

            <QrPaymentDialog
                isOpen={isQrPaymentDialogOpen}
                onClose={() => setIsQrPaymentDialogOpen(false)}
                t={t}
            />

        </div>
    );
};

export default App;
