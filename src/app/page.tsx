

'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import jsPDF from 'jspdf';
import { RaffleManager } from '@/lib/RaffleManager';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc, Unsubscribe, serverTimestamp, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import Image from 'next/image';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/hooks/use-language';
import { requestNotificationPermission } from '@/lib/notification';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House, Clock as ClockIcon, Users, MessageCircle, DollarSign, Share2, Link as LinkIcon, Loader2, QrCode, X, Upload, Wand2, Search, Download, Infinity as InfinityIcon, KeyRound, Languages, Trophy, Trash2, Copy, Shield, LogOut, Eye, EyeOff, Gamepad2, Phone, TrendingUp, Globe, Landmark } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';
import { Switch } from '@/components/ui/switch';
import type { Participant, Raffle, PendingActivation, AppSettings } from '@/lib/types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CountrySelectionDialog, getCurrencySymbol } from '@/components/country-selection-dialog';
import { WhatsappIcon, FacebookIcon, TicketIcon, NequiIcon, InlineTicket, BankIcon } from '@/components/raffle-components';


type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';
type Tab = 'board' | 'register' | 'participants' | 'pending' | 'recaudado' | 'winners' | 'activations' | 'games';

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
    notificationTokens: [],
};

interface PartialWinnerInfo {
    winners: Participant[];
    digits: number;
    prize: string;
}

interface NextRaffleInfo {
    refs: string[];
    count: number;
}

const DateTimeDisplay = ({ t }: { t: (key: string) => void }) => {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        // This effect runs only on the client
        setCurrentTime(new Date());

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-ES';

    return (
        <div className="text-center text-gray-500 mb-4">
            {currentTime ? (
                <>
                    <p className="font-semibold text-lg">{currentTime.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-3xl font-bold tracking-wider">{currentTime.toLocaleTimeString(locale)}</p>
                </>
            ) : (
                <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
                    <div className="h-9 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
                </div>
            )}
        </div>
    );
};

const raffleManager = new RaffleManager(db);

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
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    
    const [selectedRaffleMode, setSelectedRaffleMode] = useState<RaffleMode | null>(null);
    const [partialWinners, setPartialWinners] = useState<PartialWinnerInfo[]>([]);

    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

    const [activationRefs, setActivationRefs] = useState<{ [key in RaffleMode]?: string }>({});

    const [isSuperAdminLoginOpen, setIsSuperAdminLoginOpen] = useState(false);
    const [superAdminPassword, setSuperAdminPassword] = useState('');
    const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [pendingActivations, setPendingActivations] = useState<PendingActivation[]>([]);
    const [allRaffles, setAllRaffles] = useState<Raffle[]>([]);
    const [secondaryContacts, setSecondaryContacts] = useState<string[]>([]);
    const [newSecondaryContact, setNewSecondaryContact] = useState('');
    const [isSecondaryContactDialogOpen, setIsSecondaryContactDialogOpen] = useState(false);
    const [gameSearchQuery, setGameSearchQuery] = useState('');


    const [activationConfirmationOpen, setActivationConfirmationOpen] = useState(false);
    const [activationToConfirm, setActivationToConfirm] = useState<{ activation: PendingActivation; newRaffleRef: string; } | null>(null);

    const [nextRaffleRefs, setNextRaffleRefs] = useState<{ twoDigit: NextRaffleInfo, threeDigit: NextRaffleInfo, infinite: NextRaffleInfo }>({ twoDigit: { refs: [], count: 0 }, threeDigit: { refs: [], count: 0 }, infinite: { refs: [], count: 0 } });

    const [appSettings, setAppSettings] = useState<AppSettings>({});
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
    const [raffleToChangePassword, setRaffleToChangePassword] = useState<Raffle | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSuperAdminChangePasswordOpen, setIsSuperAdminChangePasswordOpen] = useState(false);
    const [isPaymentLinksDialogOpen, setIsPaymentLinksDialogOpen] = useState(false);
    const [paymentLinks, setPaymentLinks] = useState({
        twoDigit: '',
        threeDigit: '',
        infinite: '',
    });
    const [isCopyOptionsDialogOpen, setIsCopyOptionsDialogOpen] = useState(false);
    const [isActivationPricesDialogOpen, setIsActivationPricesDialogOpen] = useState(false);
    const [activationPrices, setActivationPrices] = useState({
        twoDigit: '',
        threeDigit: '',
        infinite: '',
    });
    const [isPaymentInfoDialogOpen, setIsPaymentInfoDialogOpen] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState({
        line1: '',
        line2: '',
    });

    
    const isCurrentUserAdmin = !!raffleState.adminId && !!currentAdminId && raffleState.adminId === currentAdminId;
    const raffleMode = raffleState.raffleMode;
    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;


     useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    }, [language]);


    useEffect(() => {
        if (isCurrentUserAdmin && raffleState.raffleRef) {
            requestNotificationPermission(raffleState.raffleRef);
        }
    }, [isCurrentUserAdmin, raffleState.raffleRef]);


    // Fetch global settings
    useEffect(() => {
        const settingsDocRef = doc(db, 'internal', 'settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data() as AppSettings;
                setAppSettings(settings);
                if (isSuperAdmin) {
                    setSecondaryContacts(Array.isArray(settings.secondaryContact) ? settings.secondaryContact : []);
                    setPaymentLinks({
                        twoDigit: settings.paymentLinkTwoDigit || '',
                        threeDigit: settings.paymentLinkThreeDigit || '',
                        infinite: settings.paymentLinkInfinite || '',
                    });
                    setActivationPrices({
                        twoDigit: settings.activationPriceTwoDigit || '',
                        threeDigit: settings.activationPriceThreeDigit || '',
                        infinite: settings.activationPriceInfinite || '',
                    });
                    setPaymentInfo({
                        line1: settings.bankInfoLine1 || 'Banco Caja Social: 24096711314',
                        line2: settings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054',
                    });
                }
            }
        });
        return () => unsubscribe();
    }, [isSuperAdmin]);


    useEffect(() => {
        if (isSuperAdmin && !raffleState.raffleRef) {
            const fetchNextRefs = async () => {
                const twoDigitInfo = await raffleManager.peekNextRaffleRef('two-digit', 5);
                const threeDigitInfo = await raffleManager.peekNextRaffleRef('three-digit', 5);
                const infiniteInfo = await raffleManager.peekNextRaffleRef('infinite', 5);
                setNextRaffleRefs({ twoDigit: twoDigitInfo, threeDigit: threeDigitInfo, infinite: infiniteInfo });
            };
            fetchNextRefs();
        } else {
            setNextRaffleRefs({ twoDigit: { refs: [], count: 0 }, threeDigit: { refs: [], count: 0 }, infinite: { refs: [], count: 0 } });
        }
    }, [isSuperAdmin, raffleState.raffleRef]);

    useEffect(() => {
        if (isSuperAdmin) {
            const q = query(collection(db, "pendingActivations"), where("status", "==", "pending"));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const activations: PendingActivation[] = [];
                querySnapshot.forEach((doc) => {
                    activations.push({ id: doc.id, ...doc.data() } as PendingActivation);
                });
                setPendingActivations(activations);
            });

            const allRafflesQuery = query(collection(db, "raffles"));
            const unsubscribeRaffles = onSnapshot(allRafflesQuery, (querySnapshot) => {
                const raffles: Raffle[] = [];
                querySnapshot.forEach((doc) => {
                    raffles.push({ ...doc.data() } as Raffle);
                });
                setAllRaffles(raffles);
            });


            return () => {
                unsubscribe();
                unsubscribeRaffles();
            }
        }
    }, [isSuperAdmin]);


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
            prize: raffleState.prize,
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
    
    const confirmParticipantPayment = async (raffleRef: string, participantData?: any): Promise<Participant | null> => {
        if (!raffleRef) return null;
        if (!participantData?.raffleNumber) return null;
    
        try {
            const raffleDocRef = doc(db, "raffles", raffleRef);
            const docSnap = await getDoc(raffleDocRef);
    
            if (docSnap.exists()) {
                const raffleData = docSnap.data();
                
                const existingParticipant = raffleData.participants.find((p: Participant) => p.raffleNumber === participantData.raffleNumber);
                if (existingParticipant && existingParticipant.paymentStatus === 'confirmed') {
                    return existingParticipant; // Already confirmed
                }

                const newParticipant: Participant = {
                    id: Date.now(),
                    name: participantData.name,
                    phoneNumber: participantData.phoneNumber,
                    raffleNumber: participantData.raffleNumber,
                    timestamp: new Date(),
                    paymentStatus: 'confirmed',
                };
                const updatedParticipants = [...raffleData.participants.filter((p: Participant) => p.raffleNumber !== newParticipant.raffleNumber), newParticipant];
                await setDoc(raffleDocRef, { participants: updatedParticipants }, { merge: true });
                
                showNotification(t('paymentConfirmedNotification', { name: newParticipant.name, number: newParticipant.raffleNumber }), 'success');
                return newParticipant;
            }
            return null;
        } catch (error) {
            console.error("Error confirming participant payment:", error);
            showNotification(t('paymentConfirmationError'), 'error');
            return null;
        }
    };
    
    const cleanupUrlParams = () => {
        const url = new URL(window.location.href);
        const paramsToClean = [
            'status', 'participantId', 'pName', 'pPhone', 'pNum', 'transactionState', 
            'ref_payco', 'signature', 'transactionId', 'amount', 'currency', 
            'id', 'reference', 'state', 'env', 'raffleMode', 'adminId' // Add adminId here
        ];
        
        let needsCleanup = false;
        paramsToClean.forEach(param => {
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                needsCleanup = true;
            }
        });
        
        const currentRef = raffleState.raffleRef || new URLSearchParams(window.location.search).get('ref');
        
        const finalParams = new URLSearchParams();
        if (currentRef) {
            finalParams.set('ref', currentRef);
        }

        const newPath = url.pathname + (finalParams.toString() ? `?${finalParams.toString()}` : '');

        if (window.location.pathname + window.location.search !== newPath) {
             window.history.replaceState({}, '', newPath);
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


    // Main initialization and URL handling effect
    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            setAppUrl(window.location.origin);
            
            const urlParams = new URLSearchParams(window.location.search);
            const adminIdFromUrl = urlParams.get('adminId');
            
            if (adminIdFromUrl) {
                localStorage.setItem('rifaAdminId', adminIdFromUrl);
                setCurrentAdminId(adminIdFromUrl);
            } else {
                const adminIdFromStorage = localStorage.getItem('rifaAdminId');
                if (adminIdFromStorage) setCurrentAdminId(adminIdFromStorage);
            }
            
            const superAdminSession = sessionStorage.getItem('isSuperAdmin');
            if (superAdminSession === 'true') {
                setIsSuperAdmin(true);
            }

            const status = urlParams.get('transactionState') || urlParams.get('state');
            const transactionId = urlParams.get('reference') || urlParams.get('ref_payco'); 
            const refFromUrl = urlParams.get('ref');
            const modeFromUrl = urlParams.get('raffleMode') as RaffleMode;

            // --- Payment Confirmation Logic ---
            if ((status?.toLowerCase() === 'approved' || status === '4' || status === '1') && transactionId && modeFromUrl) {
                const transactionDocRef = doc(db, 'usedTransactions', transactionId);
                const transactionDoc = await getDoc(transactionDocRef);

                if (transactionDoc.exists()) {
                    showNotification(t('transactionAlreadyUsed'), 'error');
                } else {
                    await addDoc(collection(db, "pendingActivations"), {
                        transactionId: transactionId,
                        raffleMode: modeFromUrl,
                        status: 'pending',
                        createdAt: serverTimestamp(),
                    });
                    await setDoc(transactionDocRef, { used: true, createdAt: serverTimestamp() });
                    showNotification(t('activationPendingAdmin'), 'success');
                }
                cleanupUrlParams();
                setLoading(false);
                return;
            }
            // --- Participant Payment Confirmation ---
            else if ((status?.toLowerCase() === 'approved' || status === '4' || status === '1') && transactionId && refFromUrl) {
                 const pName = urlParams.get('pName');
                 const pPhone = urlParams.get('pPhone');
                 const pNum = urlParams.get('pNum');

                 if (pName && pPhone && pNum) {
                     await confirmParticipantPayment(refFromUrl, { name: pName, phoneNumber: pPhone, raffleNumber: pNum });
                 }
            }
            
            // --- Raffle Loading Logic ---
            if (refFromUrl) {
                await handleAdminSearch({ refToSearch: refFromUrl, isInitialLoad: true });
            } else {
                setRaffleState(initialRaffleData);
                setLoading(false);
            }
            cleanupUrlParams(); 
        };

        initialize();

        const handlePopState = (event: PopStateEvent) => {
            const newUrlParams = new URLSearchParams(window.location.search);
            const newRefFromUrl = newUrlParams.get('ref');
            if (newRefFromUrl && newRefFromUrl !== raffleState.raffleRef) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const showNotification = (message: string, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
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

    const formatValue = (value: string | number) => {
        const currencySymbol = raffleState.currencySymbol || '$';
        if (!value) return `${currencySymbol} 0`;
        const numericValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
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

        if (isNequiPayment && !confirmPayment) {
            // First, optimistically update state but as 'pending'
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
            setRaffleState(s => ({ ...s, name: '', phoneNumber: '', raffleNumber: '' }));
            
            const nequiUrl = `nequi://payment?phoneNumber=${raffleState.nequiAccountNumber}&value=${raffleState.value}&message=${raffleState.raffleNumber}`;
            window.location.href = nequiUrl;
            showNotification(t('nequiPaymentPendingNotification', { number: formattedRaffleNumber, name: participantName }), 'success');
        } else {
             // For admin confirmation or other non-redirecting payments
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
            setRaffleState(s => ({ ...s, name: '', phoneNumber: '', raffleNumber: '' }));
            showNotification(t('participantRegisteredNotification', { name: participantName, number: formattedRaffleNumber }), 'success');
            
            if (confirmPayment && raffleState.prize) {
                const ticketData = {
                    ...newParticipant,
                    prize: raffleState.prize,
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

        if (!confirmPayment && !isNequiPayment) {
            handleTabClick('board');
        }

        return participantId;
    };

    const handleConfirmPayment = async (participantId: number) => {
        if (!raffleState.raffleRef || !isCurrentUserAdmin) return;
        
        const participantIndex = raffleState.participants.findIndex(p => p.id === participantId);
        if (participantIndex === -1 || raffleState.participants[participantIndex].paymentStatus !== 'pending') return;

        const updatedParticipants = [...raffleState.participants];
        const updatedParticipant = { ...updatedParticipants[participantIndex], paymentStatus: 'confirmed' as 'confirmed' };
        updatedParticipants[participantIndex] = updatedParticipant;

        await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
        showNotification(t('paymentConfirmedNotification', { name: updatedParticipant.name, number: updatedParticipant.raffleNumber }), 'success');
    };
    
    const handleDeletePending = async (participantId: number) => {
        if (!raffleState.raffleRef || !isCurrentUserAdmin) return;

        showConfirmationDialog(t('deletePendingConfirmation'), async () => {
            const updatedParticipants = raffleState.participants.filter(p => p.id !== participantId);
            try {
                await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
                showNotification(t('pendingDeletedSuccess'), 'success');
            } catch (error) {
                console.error("Error deleting pending participant:", error);
                showNotification(t('pendingDeletedError'), 'error');
            }
        });
    };

    const handleDeleteRaffle = async (raffleRef: string) => {
        showConfirmationDialog(t('deleteGameConfirmation'), async () => {
            try {
                await deleteDoc(doc(db, 'raffles', raffleRef));
                showNotification(t('gameDeletedSuccess'), 'success');
                // The onSnapshot listener for allRaffles will update the UI automatically.
            } catch (error) {
                console.error('Error deleting raffle:', error);
                showNotification(t('gameDeletedError'), 'error');
            }
        });
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

    const handleShare = () => {
        setIsShareDialogOpen(true);
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
                if (!isInitialLoad) setLoading(false);
                resolve();
                return;
            }
    
            // Admin Recovery Flow
            if (!isInitialLoad && !isPublicSearch) {
                 try {
                     const docSnap = await getDoc(doc(db, 'raffles', aRef));
                     if (docSnap.exists()) {
                         const data = docSnap.data() as Raffle;
                         if (isSuperAdmin || (data.organizerPhoneNumber === aPhone && data.password === aPassword)) {
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
    
            // General Subscription Logic (for all searches)
            raffleSubscription.current?.();
            const raffleDocRef = doc(db, 'raffles', aRef);

            raffleSubscription.current = onSnapshot(raffleDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data() as Raffle;
    
                    if (isSuperAdmin) {
                        setCurrentAdminId(data.adminId);
                    } else if (!isPublicSearch) { // Only set admin from storage if not a public search
                        const adminIdFromStorage = localStorage.getItem('rifaAdminId');
                        if (adminIdFromStorage && data.adminId === adminIdFromStorage) {
                            setCurrentAdminId(adminIdFromStorage);
                        } else {
                            setCurrentAdminId(null);
                        }
                    } else {
                        setCurrentAdminId(null); // Ensure no admin access on public search
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
    
                    const currentUrl = new URL(window.location.href);
                    const newUrl = new URL(window.location.origin);
                    newUrl.searchParams.set('ref', aRef);
                    if (data.adminId && data.adminId === localStorage.getItem('rifaAdminId') && !isPublicSearch) {
                        newUrl.searchParams.set('adminId', data.adminId);
                    }
                    if (currentUrl.href !== newUrl.href) {
                        window.history.pushState({}, '', newUrl.href);
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

    const handlePriceButtonClick = (mode: RaffleMode) => {
        const link =
          mode === 'two-digit'
            ? appSettings.paymentLinkTwoDigit
            : mode === 'three-digit'
            ? appSettings.paymentLinkThreeDigit
            : appSettings.paymentLinkInfinite;
    
        if (link) {
          const url = new URL(link);
          url.searchParams.set('raffleMode', mode);
          window.location.href = url.toString();
        } else {
          setIsCopyOptionsDialogOpen(true);
        }
    };

    const handleActivationClick = () => {
        setIsCopyOptionsDialogOpen(true);
    };
    
    const handleManualActivation = async (mode: RaffleMode) => {
        const raffleRefToSearch = (activationRefs[mode] || '').trim().toUpperCase();
        if (!raffleRefToSearch) {
            showNotification(t('enterReferenceWarning'), 'warning');
            return;
        }

        // Always do a public search. If it exists, it loads. If not, it shows not found.
        // Activation of *new* boards should only happen via payment or Super Admin click.
        await handleAdminSearch({ refToSearch: raffleRefToSearch, isPublicSearch: true });
    
        setActivationRefs(prev => ({...prev, [mode]: ''}));
    };

    const handleRefClick = async (ref: string, mode: RaffleMode) => {
        if (!isSuperAdmin) {
            return;
        }
    
        const { adminId, finalRaffleRef } = await handleActivateBoard(mode, 'CO', undefined, ref, false);
    
        if (adminId && finalRaffleRef) {
            const adminUrl = `${window.location.origin}?ref=${finalRaffleRef}&adminId=${adminId}`;
            try {
                await navigator.clipboard.writeText(adminUrl);
                showNotification(t('boardActivatedAndCopied', { ref: finalRaffleRef }), 'success');
            } catch (err) {
                console.error('Failed to copy admin URL:', err);
                showNotification(t('boardActivatedSuccessfullyWithRef', { ref: finalRaffleRef }), 'success');
            }
    
            setNextRaffleRefs(prev => {
                const newRefsState = { ...prev };
                const modeKey = mode as keyof typeof newRefsState;
                if (newRefsState[modeKey]) {
                    newRefsState[modeKey].refs = newRefsState[modeKey].refs.filter(r => r !== ref);
                }
                return newRefsState;
            });
    
             const { refs: [newRef] } = await raffleManager.peekNextRaffleRef(mode, 1);
             if (newRef) {
                  setNextRaffleRefs(prev => {
                     const newRefsState = { ...prev };
                     const modeKey = mode as keyof typeof newRefsState;
                     if (!newRefsState[modeKey]) {
                         newRefsState[modeKey] = { refs: [], count: 0 };
                     }
                     if (newRefsState[modeKey] && newRefsState[modeKey].refs) {
                        newRefsState[modeKey].refs.push(newRef);
                     } else if (newRefsState[modeKey]) {
                        newRefsState[modeKey].refs = [newRef];
                     }
                     return newRefsState;
                 });
             }
        }
    };


    const handleApproveActivation = async (activation: PendingActivation) => {
        const { refs: [newRaffleRef] } = await raffleManager.peekNextRaffleRef(activation.raffleMode, 1);
        setActivationToConfirm({ activation, newRaffleRef });
        setActivationConfirmationOpen(true);
    };

    const confirmAndActivateBoard = async () => {
        if (!activationToConfirm) return;
    
        const { activation, newRaffleRef } = activationToConfirm;
        setLoading(true);
    
        try {
            const {adminId, finalRaffleRef} = await handleActivateBoard(activation.raffleMode, 'CO', activation.transactionId, newRaffleRef, false);
            
            const activationDocRef = doc(db, 'pendingActivations', activation.id);
            await setDoc(activationDocRef, { status: 'completed' }, { merge: true });
            
            showNotification(t('boardActivatedSuccessfullyWithRef', { ref: finalRaffleRef }), 'success');

        } catch (error) {
            console.error("Error approving activation:", error);
            showNotification(t('errorActivatingBoard'), "error");
        } finally {
            setActivationConfirmationOpen(false);
            setActivationToConfirm(null);
            setLoading(false);
        }
    };

    const handleActivateBoard = async (mode: RaffleMode, countryCode: string = 'CO', transactionId?: string, newRef?: string, loadBoard = true): Promise<{ adminId: string | null, finalRaffleRef: string | null }> => {
        if (loadBoard) setLoading(true);

        const finalTransactionId = transactionId || `SUPERADMIN_${Date.now()}`;

        try {
            const transactionDocRef = doc(db, 'usedTransactions', finalTransactionId);
            const transactionDoc = await getDoc(transactionDocRef);

            if (transactionDoc.exists() && !finalTransactionId.startsWith('SUPERADMIN') && !finalTransactionId.startsWith('MANUAL_')) {
                showNotification(t('transactionAlreadyUsed'), 'error');
                if (loadBoard) setLoading(false);
                return { adminId: null, finalRaffleRef: null };
            }
            
            const finalRaffleRef = newRef || await raffleManager.createNewRaffleRef(mode, false, finalTransactionId.startsWith('MANUAL_'));

            const existingRaffleDoc = await getDoc(doc(db, "raffles", finalRaffleRef));
            if (existingRaffleDoc.exists()) {
                showNotification(t('raffleNotFound'), 'error'); // A bit of a misnomer, but it implies the ref is taken.
                if (loadBoard) setLoading(false);
                return { adminId: null, finalRaffleRef: null };
            }

            const adminId = `admin_${Date.now()}_${Math.random()}`;
            
            if (loadBoard) {
                localStorage.setItem('rifaAdminId', adminId);
                setCurrentAdminId(adminId);
            }
    
            const newRaffleData: Raffle = {
                ...initialRaffleData,
                raffleMode: mode,
                raffleRef: finalRaffleRef,
                adminId: adminId,
                isPaid: true,
                prizeImageUrl: '',
                value: '0', 
                currencySymbol: getCurrencySymbol(countryCode),
                infiniteModeDigits: 4,
            };
            
            await setDoc(doc(db, "raffles", finalRaffleRef), newRaffleData);
            
            if (!finalTransactionId.startsWith('SUPERADMIN')) {
                 await setDoc(transactionDocRef, {
                     raffleRef: finalRaffleRef,
                     activatedAt: serverTimestamp(),
                 }, { merge: true });
            }
    
            if (loadBoard) {
                const newUrl = new URL(window.location.origin);
                newUrl.searchParams.set('ref', finalRaffleRef);
                window.history.pushState({}, '', newUrl.href);
                await handleAdminSearch({refToSearch: finalRaffleRef, isInitialLoad: true});
            }
            return { adminId, finalRaffleRef };

        } catch (error) {
            console.error("Error activating board:", error);
            showNotification(t('errorActivatingBoard'), "error");
             return { adminId: null, finalRaffleRef: null };
        } finally {
            if (loadBoard) setLoading(false);
        }
    };

    const handleContactSupport = () => {
        if (appSettings.secondaryContact && appSettings.secondaryContact.length > 0 && !raffleState.raffleRef) {
            setIsContactDialogOpen(true);
        } else {
            const whatsappUrl = `https://wa.me/3145696687`;
            window.open(whatsappUrl, '_blank');
        }
    };
    
    const handleShareToWhatsApp = () => {
        const urlToShare = window.location.origin;
        const message = encodeURIComponent(t('shareRaffleAppDescription'));
        const whatsappUrl = `https://wa.me/?text=${message} ${encodeURIComponent(urlToShare)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleShareRefToWhatsapp = (ref: string) => {
        const message = encodeURIComponent(`Hola, te envío la referencia de tu nueva rifa: *${ref}*`);
        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, '_blank');
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

    const handleSuperAdminLogin = () => {
        // This is a simple, insecure client-side check.
        // In a real application, this should be a proper authentication flow.
        const executivePassword = appSettings.superAdminPassword || '32184257361045715054';

        if (superAdminPassword === executivePassword) {
            setIsSuperAdmin(true);
            sessionStorage.setItem('isSuperAdmin', 'true');
            setIsSuperAdminLoginOpen(false);
            setSuperAdminPassword('');
            showNotification('Acceso de Director Ejecutivo concedido.', 'success');
        } else {
            showNotification('Contraseña incorrecta.', 'error');
        }
    };
    
    const handleSuperAdminLogout = () => {
        setIsSuperAdmin(false);
        sessionStorage.removeItem('isSuperAdmin');
        handleGoToHome();
        showNotification(t('logoutSuccess'), 'info');
    };

    const handleSaveSecondaryContacts = async () => {
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, { secondaryContact: secondaryContacts }, { merge: true });
            showNotification(t('secondaryContactSaved'), 'success');
        } catch (error) {
            console.error("Error saving secondary contact:", error);
            showNotification(t('errorSavingSecondaryContact'), 'error');
        }
    };

    const handleAddSecondaryContact = async () => {
        if (newSecondaryContact && !secondaryContacts.includes(newSecondaryContact)) {
            const updatedContacts = [...secondaryContacts, newSecondaryContact.replace(/\D/g, '')];
            setSecondaryContacts(updatedContacts);
            setNewSecondaryContact('');

            try {
                const settingsDocRef = doc(db, 'internal', 'settings');
                await setDoc(settingsDocRef, { secondaryContact: updatedContacts }, { merge: true });
                showNotification(t('secondaryContactSaved'), 'success');
            } catch (error) {
                console.error("Error saving secondary contact:", error);
                showNotification(t('errorSavingSecondaryContact'), 'error');
                // Revert state if save fails
                setSecondaryContacts(secondaryContacts);
            }
        }
    };

    const handleRemoveSecondaryContact = (contactToRemove: string) => {
        setSecondaryContacts(secondaryContacts.filter(contact => contact !== contactToRemove));
    };

    const handleSavePaymentLinks = async () => {
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, { 
                paymentLinkTwoDigit: paymentLinks.twoDigit,
                paymentLinkThreeDigit: paymentLinks.threeDigit,
                paymentLinkInfinite: paymentLinks.infinite,
             }, { merge: true });
            showNotification(t('paymentLinksSaved'), 'success');
            setIsPaymentLinksDialogOpen(false);
        } catch (error) {
            console.error("Error saving payment links:", error);
            showNotification(t('errorSavingPaymentLinks'), 'error');
        }
    };

    const handleSaveActivationPrices = async () => {
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, {
                activationPriceTwoDigit: activationPrices.twoDigit,
                activationPriceThreeDigit: activationPrices.threeDigit,
                activationPriceInfinite: activationPrices.infinite,
            }, { merge: true });
            showNotification(t('activationPricesSaved'), 'success');
            setIsActivationPricesDialogOpen(false);
        } catch (error) {
            console.error("Error saving activation prices:", error);
            showNotification(t('errorSavingActivationPrices'), 'error');
        }
    };

    const handleChangePassword = async () => {
        if (!raffleToChangePassword || !raffleToChangePassword.raffleRef) return;
    
        if (!newPassword || newPassword !== confirmNewPassword) {
            showNotification(t('passwordsDoNotMatch'), 'error');
            return;
        }
    
        try {
            const raffleDocRef = doc(db, 'raffles', raffleToChangePassword.raffleRef);
            await setDoc(raffleDocRef, { password: newPassword }, { merge: true });
            showNotification(t('passwordChangedSuccess'), 'success');
            setIsChangePasswordDialogOpen(false);
            setNewPassword('');
            setConfirmNewPassword('');
            setRaffleToChangePassword(null);
            setShowNewPassword(false);
        } catch (error) {
            console.error("Error changing password:", error);
            showNotification(t('passwordChangeError'), 'error');
        }
    };
    
    const handleChangeSuperAdminPassword = async () => {
        if (!newPassword || newPassword !== confirmNewPassword) {
            showNotification(t('passwordsDoNotMatch'), 'error');
            return;
        }

        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, { superAdminPassword: newPassword }, { merge: true });
            showNotification(t('passwordChangedSuccess'), 'success');
            setIsSuperAdminChangePasswordOpen(false);
            setNewPassword('');
            setConfirmNewPassword('');
            setShowNewPassword(false);
        } catch (error) {
            console.error("Error changing super admin password:", error);
            showNotification(t('passwordChangeError'), 'error');
        }
    };

    const handleSavePaymentInfo = async () => {
        if (!isSuperAdmin) return;
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, {
                bankInfoLine1: paymentInfo.line1,
                bankInfoLine2: paymentInfo.line2,
            }, { merge: true });
            showNotification(t('paymentInfoSaved'), 'success');
            setIsPaymentInfoDialogOpen(false);
        } catch (error) {
            console.error("Error saving payment info:", error);
            showNotification(t('errorSavingPaymentInfo'), 'error');
        }
    };


    const allNumbers = Array.from({ length: totalNumbers }, (_, i) => i);
    
    const backgroundImage = raffleState.prizeImageUrl;

    const closeTicketModal = () => {
        setIsTicketModalOpen(false);
        setTicketInfo(null);
    };

    const filteredGames = allRaffles.filter(raffle => 
        raffle.raffleRef?.toLowerCase().includes(gameSearchQuery.toLowerCase())
    );


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
                                    <button onClick={() => window.open(`https://wa.me/57${raffleState.organizerPhoneNumber}`, '_blank')} className="p-2 rounded-full hover:bg-gray-100">
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
                                    <div className="relative">
                                        <Input
                                            id="password-input"
                                            type={showAdminPassword ? 'text' : 'password'}
                                            value={raffleState.password || ''}
                                            onChange={(e) => handleLocalFieldChange('password', e.target.value)}
                                            onBlur={(e) => handleFieldChange('password', e.target.value)}
                                            placeholder={t('adminPasswordPlaceholder')}
                                            disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                            className="w-full mt-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute inset-y-0 right-0 h-full px-3"
                                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        >
                                            {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            <span className="sr-only">{showAdminPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                                        </Button>
                                    </div>
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
        );
    };

    
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
                                    <DropdownMenuItem onSelect={handleContactSupport} className="bg-green-500 text-white focus:bg-green-600 focus:text-white">
                                        <WhatsappIcon className="mr-2 h-4 w-4" />
                                        <span>{t('contact')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setIsSuperAdminLoginOpen(true)}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>{t('superAdminLogin')}</span>
                                    </DropdownMenuItem>
                                     {isSuperAdmin && (
                                        <>
                                            <DropdownMenuItem onSelect={() => setIsSecondaryContactDialogOpen(true)}>
                                                <Phone className="mr-2 h-4 w-4" />
                                                <span>{t('secondaryContact')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsPaymentLinksDialogOpen(true)}>
                                                <LinkIcon className="mr-2 h-4 w-4" />
                                                <span>{t('paymentLinks')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsActivationPricesDialogOpen(true)}>
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                <span>{t('activationPrices')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsPaymentInfoDialogOpen(true)}>
                                                <Landmark className="mr-2 h-4 w-4" />
                                                <span>{t('paymentInfo')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsSuperAdminChangePasswordOpen(true)}>
                                                <KeyRound className="mr-2 h-4 w-4" />
                                                <span>{t('changePasswordTitle')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={handleSuperAdminLogout}>
                                                <LogOut className="mr-2 h-4 w-4" />
                                                <span>{t('logout')}</span>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={handleShare}>
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
                            <h1 className="text-4xl font-bold">RIFA⚡EXPRESS</h1>
                        </div>
                        <div className="w-10">
                            {/* Placeholder for symmetry */}
                        </div>
                    </div>

                    {!raffleState.raffleRef ? (
                        <div className="p-8">
                            <div className="text-center">
                                <DateTimeDisplay t={t} />
                                <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('boardLocked')}</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    
                                </p>

                                <div className="max-w-2xl mx-auto bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mb-8">
                                    <h3 className="font-bold">{t('activationInstructionTitle')}</h3>
                                    <p className="text-sm">{t('activationInstructionBody')}</p>
                                </div>
                                
                                <div className="grid md:grid-cols-1 gap-8 items-start max-w-md mx-auto">
                                    <div className="flex flex-col justify-center items-center gap-8">
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
                                            <div className="p-6 pt-0 space-y-4">
                                                <Button onClick={() => handlePriceButtonClick('two-digit')} size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                                                    {t('price')} {appSettings.activationPriceTwoDigit ? `(${appSettings.activationPriceTwoDigit})` : ''}
                                                </Button>
                                                <div className="text-center">
                                                    <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2">
                                                        <BankIcon />
                                                        {t('activate')}
                                                    </Button>
                                                    <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                </div>
                                                {isSuperAdmin && nextRaffleRefs.twoDigit.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefs2Digit')}{' '}
                                                        {nextRaffleRefs.twoDigit.refs.map((ref, index) => (
                                                            <span key={`ref-2-digit-${index}`}>
                                                                <button
                                                                    className="cursor-pointer hover:underline"
                                                                    onClick={() => handleRefClick(ref, 'two-digit')}
                                                                >
                                                                    {ref}
                                                                </button>
                                                                {index < nextRaffleRefs.twoDigit.refs.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
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
                                            <div className="p-6 pt-0 space-y-4">
                                                <Button onClick={() => handlePriceButtonClick('three-digit')} size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
                                                    {t('price')} {appSettings.activationPriceThreeDigit ? `(${appSettings.activationPriceThreeDigit})` : ''}
                                                </Button>
                                                 <div className="text-center">
                                                    <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2">
                                                        <BankIcon />
                                                        {t('activate')}
                                                    </Button>
                                                     <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                </div>
                                                {isSuperAdmin && nextRaffleRefs.threeDigit.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefs3Digit')}{' '}
                                                        {nextRaffleRefs.threeDigit.refs.map((ref, index) => (
                                                             <span key={`ref-3-digit-${index}`}>
                                                                <button
                                                                    className="cursor-pointer hover:underline"
                                                                    onClick={() => handleRefClick(ref, 'three-digit')}
                                                                >
                                                                    {ref}
                                                                </button>
                                                                {index < nextRaffleRefs.threeDigit.refs.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
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
                                            <div className="p-6 pt-0 space-y-4">
                                                <Button onClick={() => handlePriceButtonClick('infinite')} size="lg" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold">
                                                    {t('price')} {appSettings.activationPriceInfinite ? `(${appSettings.activationPriceInfinite})` : ''}
                                                </Button>
                                                 <div className="text-center">
                                                    <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2">
                                                       <BankIcon />
                                                       {t('activate')}
                                                    </Button>
                                                     <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                </div>
                                                {isSuperAdmin && nextRaffleRefs.infinite.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefsInfinite')}{' '}
                                                        {nextRaffleRefs.infinite.refs.map((ref, index) => (
                                                            <span key={`ref-infinite-${index}`}>
                                                                <button
                                                                    className="cursor-pointer hover:underline"
                                                                    onClick={() => handleRefClick(ref, 'infinite')}
                                                                >
                                                                    {ref}
                                                                </button>
                                                                {index < nextRaffleRefs.infinite.refs.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <div className="flex justify-center items-center gap-2">
                                        <Input
                                            id="public-ref-search-home"
                                            value={publicRefSearch}
                                            onChange={(e) => setPublicRefSearch(e.target.value)}
                                            className="max-w-xs"
                                            placeholder={t('searchRaffleByRefDescription')}
                                        />
                                        <Button onClick={() => handleAdminSearch({ refToSearch: publicRefSearch, isPublicSearch: true })}>
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
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
                                    {isSuperAdmin && (
                                    <>
                                        <button 
                                            className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'activations' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => handleTabClick('activations')}
                                        >
                                           <KeyRound className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('activationsTab', { count: pendingActivations.length })}</span>
                                        </button>
                                        <button 
                                            className={`flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap ${activeTab === 'games' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => handleTabClick('games')}
                                        >
                                           <Gamepad2 className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('gamesTab')}</span>
                                        </button>
                                    </>
                                    )}
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
                                        <ClockIcon className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('pendingTab', { count: pendingParticipants.length })}</span>
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
                                                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                                                    {raffleState.isPaymentLinkEnabled && raffleState.paymentLink && (
                                                        <Button
                                                            className="flex-1 w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
                                                            disabled={!isRegisterFormValidForSubmit}
                                                            onClick={() => {
                                                                if (!isRegisterFormValidForSubmit) {
                                                                    showNotification(t('completeAllFieldsWarning'), 'warning');
                                                                    return;
                                                                }
                                                                const url = new URL(raffleState.paymentLink!);
                                                                const redirectUrlWithParams = new URL(window.location.href);
                                                                // Start with a clean URL (origin + pathname)
                                                                const cleanRedirectUrl = new URL(redirectUrlWithParams.origin + redirectUrlWithParams.pathname);
                                                                
                                                                // Add participant data as query parameters to the clean URL
                                                                cleanRedirectUrl.searchParams.set('ref', raffleState.raffleRef);
                                                                cleanRedirectUrl.searchParams.set('pName', raffleState.name || '');
                                                                cleanRedirectUrl.searchParams.set('pPhone', raffleState.phoneNumber || '');
                                                                cleanRedirectUrl.searchParams.set('pNum', raffleState.raffleNumber || '');
                                                                
                                                                // Set the fully-formed URL as the redirect-url for the payment gateway
                                                                url.searchParams.set('redirect-url', cleanRedirectUrl.href);
                                                                
                                                                window.location.href = url.toString();
                                                            }}
                                                        >
                                                            <LinkIcon className="mr-2 h-4 w-4" />
                                                            <span>{t('payWithLink')}</span>
                                                        </Button>
                                                    )}
                                                    {raffleState.isNequiEnabled && raffleState.nequiAccountNumber && (
                                                        <Button
                                                            className="flex-1 w-full sm:w-auto bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center gap-2"
                                                            disabled={!isRegisterFormValidForSubmit}
                                                            onClick={() => handleRegisterParticipant(true, false)}
                                                        >
                                                            <NequiIcon />
                                                            <span>{t('payWithNequi')}</span>
                                                        </Button>
                                                    )}
                                                     {isCurrentUserAdmin && (
                                                        <Button 
                                                            className="w-full sm:flex-1 bg-green-600 hover:bg-green-700" 
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
                                <div className={activeTab === 'activations' ? 'tab-content active' : 'tab-content'}>
                                    {isSuperAdmin && (
                                        <>
                                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('pendingActivations')}</h2>
                                            {pendingActivations.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactionId')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('raffleType')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('action')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {pendingActivations.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).map((p) => (
                                                                <tr key={p.id}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.transactionId}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.raffleMode}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                        {p.createdAt && p.createdAt.toDate ? format(p.createdAt.toDate(), 'PPpp', { locale: language === 'es' ? es : enUS }) : 'N/A'}
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                        <Button onClick={() => handleApproveActivation(p)} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                                                            {t('activateBoard')}
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">{t('noPendingActivations')}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className={activeTab === 'games' ? 'tab-content active' : 'tab-content'}>
                                    {isSuperAdmin && (
                                         <>
                                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('assignedGames')}</h2>
                                            <div className="mb-4">
                                                <Input
                                                    type="text"
                                                    placeholder={t('searchGamePlaceholder')}
                                                    value={gameSearchQuery}
                                                    onChange={(e) => setGameSearchQuery(e.target.value)}
                                                    className="max-w-sm"
                                                />
                                            </div>
                                            
                                            {filteredGames.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reference')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('prize')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('whoOrganizes')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('gameDate')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('password')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('collected')}</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('action')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {filteredGames
                                                                .sort((a, b) => (b.raffleRef || '').localeCompare(a.raffleRef || ''))
                                                                .map((raffle) => {
                                                                const collected = ((raffle.participants || []).filter(p => p.paymentStatus === 'confirmed').length * parseFloat(String(raffle.value).replace(/\D/g, ''))) || 0;
                                                                const canDelete = (raffle.participants || []).length === 0;
                                                                return (
                                                                    <tr key={`${raffle.raffleRef}-${raffle.adminId}`}>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{raffle.raffleRef}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{raffle.raffleMode === 'infinite' ? formatValue(raffle.prize) : raffle.prize}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{raffle.organizerName}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{raffle.gameDate}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRaffleToChangePassword(raffle); setIsChangePasswordDialogOpen(true); }}>
                                                                                <KeyRound className="h-4 w-4 text-gray-500" />
                                                                            </Button>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatValue(collected)}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                                            <Button onClick={() => handleAdminSearch({ refToSearch: raffle.raffleRef, isPublicSearch: true })} size="sm" variant="outline">
                                                                                {t('manage')}
                                                                            </Button>
                                                                            {canDelete && (
                                                                                <Button onClick={() => handleDeleteRaffle(raffle.raffleRef)} size="sm" variant="destructive">
                                                                                    <Trash2 className="h-4 w-4"/>
                                                                                </Button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">{t('noGamesAssigned')}</p>
                                            )}
                                         </>
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                                <Button onClick={() => handleConfirmPayment(p.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                                                    {t('confirmPayment')}
                                                                </Button>
                                                                <Button onClick={() => handleDeletePending(p.id)} size="sm" variant="destructive">
                                                                    <Trash2 className="h-4 w-4"/>
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
                                                        {isCurrentUserAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>}
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
                                                            {isCurrentUserAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>}
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
                                <div className="absolute inset-0 flex items-center justify-center z-0 opacity-50">
                                    <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none flex items-center gap-1">
                                        <span>RIFA⚡EXPRESS</span>
                                    </p>
                                </div>
                                <div className="relative z-10">
                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold">RIFA⚡EXPRESS</h3>
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
                                        <div className="flex justify-between"><span>{t('prize_caps')}:</span><span className="font-semibold text-right">{isNaN(Number(ticketInfo.prize)) ? ticketInfo.prize : formatValue(ticketInfo.prize)}</span></div>
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

            <Dialog open={isSuperAdminLoginOpen} onOpenChange={setIsSuperAdminLoginOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('superAdminLogin')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="super-admin-password">{t('password')}</Label>
                        <div className="relative">
                            <Input
                                id="super-admin-password"
                                type={showSuperAdminPassword ? 'text' : 'password'}
                                value={superAdminPassword}
                                onChange={(e) => setSuperAdminPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSuperAdminLogin()}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute inset-y-0 right-0 h-full px-3"
                                onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                            >
                                {showSuperAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showSuperAdminPassword ? 'Hide password' : 'Show password'}</span>
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handleSuperAdminLogin}>{t('login')}</Button>
                    </DialogFooter>
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
                        {!isSuperAdmin && (
                            <>
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
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAdminLoginOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" onClick={() => handleAdminSearch({ refToSearch: adminRefSearch, isPublicSearch: isSuperAdmin })}>{t('recover')}</Button>
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
                        <Button type="button" variant="outline" onClick={() => setIsSalesModalOpen(false)}>{t('close')}</Button>                    </DialogFooter>
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
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}&qzone=1&ecc=H`}
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
            
            <Dialog open={activationConfirmationOpen} onOpenChange={setActivationConfirmationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('confirmActivationTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('confirmActivationDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <p>{t('transactionId')}: <span className="font-mono bg-gray-100 p-1 rounded">{activationToConfirm?.activation.transactionId}</span></p>
                        <p>{t('newRaffleRef')}: <span className="font-mono bg-gray-100 p-1 rounded font-bold">{activationToConfirm?.newRaffleRef}</span></p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivationConfirmationOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={confirmAndActivateBoard}>{t('confirmAndActivate')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSecondaryContactDialogOpen} onOpenChange={setIsSecondaryContactDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('secondaryContact')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="new-secondary-contact-input">{t('addNewContact')}</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">+57</span>
                                </div>
                                <Input
                                    id="new-secondary-contact-input"
                                    type="tel"
                                    value={newSecondaryContact}
                                    onChange={(e) => setNewSecondaryContact(e.target.value.replace(/\D/g, ''))}
                                    placeholder="3001234567"
                                    className="pl-12"
                                />
                            </div>
                            <Button onClick={handleAddSecondaryContact} disabled={!newSecondaryContact}>{t('add')}</Button>
                        </div>
                        <div className="space-y-2 mt-4">
                             <Label>{t('savedContacts')}</Label>
                             {Array.isArray(secondaryContacts) && secondaryContacts.length > 0 ? (
                                secondaryContacts.map((contact, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                                        <span>{contact}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSecondaryContact(contact)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))
                             ) : (
                                <p className="text-sm text-gray-500">{t('noSavedContacts')}</p>
                             )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSecondaryContactDialogOpen(false)}>{t('cancel')}</Button>
                        <Button type="button" onClick={handleSaveSecondaryContacts}>{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('contact')}</DialogTitle>
                        <DialogDescription>
                            {t('contactDialogDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        <Button
                            onClick={() => {
                                window.open(`https://wa.me/3145696687`, '_blank');
                                setIsContactDialogOpen(false);
                            }}
                            className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                            <WhatsappIcon />
                            <span>{t('assignReference')}</span>
                        </Button>
                        {Array.isArray(appSettings.secondaryContact) && appSettings.secondaryContact?.map((contact, index) => (
                            <Button
                                key={index}
                                onClick={() => {
                                    window.open(`https://wa.me/${contact}`, '_blank');
                                    setIsContactDialogOpen(false);
                                }}
                                className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                            >
                                <WhatsappIcon />
                                <span>{t('assignReference')} {index + 2}</span>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isChangePasswordDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setShowNewPassword(false);
                }
                setIsChangePasswordDialogOpen(isOpen);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changePasswordTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('changePasswordDescription', { ref: raffleToChangePassword?.raffleRef })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="grid gap-2">
                             <Label htmlFor="current-password">{t('currentPassword')}</Label>
                             <div className="relative">
                                 <Input id="current-password" type="text" readOnly value={raffleToChangePassword?.password || ''} />
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                                     onClick={() => navigator.clipboard.writeText(raffleToChangePassword?.password || '')}
                                 >
                                     <Copy className="h-4 w-4" />
                                 </Button>
                             </div>
                         </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">{t('newPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-new-password">{t('confirmNewPassword')}</Label>
                             <div className="relative">
                                <Input
                                    id="confirm-new-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleChangePassword}>{t('changePasswordButton')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuperAdminChangePasswordOpen} onOpenChange={(isOpen) => {
                 if (!isOpen) {
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setShowNewPassword(false);
                }
                setIsSuperAdminChangePasswordOpen(isOpen);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changeExecutivePasswordTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('changeExecutivePasswordDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-super-admin-password">{t('newPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="new-super-admin-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-new-super-admin-password">{t('confirmNewPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="confirm-new-super-admin-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSuperAdminChangePasswordOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleChangeSuperAdminPassword}>{t('changePasswordButton')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentLinksDialogOpen} onOpenChange={setIsPaymentLinksDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('managePaymentLinks')}</DialogTitle>
                        <DialogDescription>{t('managePaymentLinksDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="payment-link-two-digit">{t('paymentLinkTwoDigit')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="payment-link-two-digit"
                                    value={paymentLinks.twoDigit}
                                    onChange={(e) => setPaymentLinks(p => ({ ...p, twoDigit: e.target.value }))}
                                />
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, twoDigit: '' }))}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-link-three-digit">{t('paymentLinkThreeDigit')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="payment-link-three-digit"
                                    value={paymentLinks.threeDigit}
                                    onChange={(e) => setPaymentLinks(p => ({ ...p, threeDigit: e.target.value }))}
                                />
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, threeDigit: '' }))}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-link-infinite">{t('paymentLinkInfinite')}</Label>
                             <div className="flex gap-2">
                                <Input
                                    id="payment-link-infinite"
                                    value={paymentLinks.infinite}
                                    onChange={(e) => setPaymentLinks(p => ({ ...p, infinite: e.target.value }))}
                                />
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, infinite: '' }))}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentLinksDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleSavePaymentLinks}>{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyOptionsDialogOpen} onOpenChange={setIsCopyOptionsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('copyPaymentTitle')}</DialogTitle>
                        <DialogDescription>{t('copyPaymentDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-3 py-4">
                        <Button
                            onClick={() => {
                                const line1 = (appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314').split(':').pop()?.trim() || '';
                                navigator.clipboard.writeText(line1);
                                showNotification(t('accountNumberCopied'), 'success');
                                setIsCopyOptionsDialogOpen(false);
                            }}
                        >
                            {t('copyAccountNumber')}
                        </Button>
                        <Button
                             onClick={() => {
                                const line2 = (appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054');
                                const match = line2.match(/(@\S+)/);
                                const keyToCopy = match ? match[0] : line2;
                                if (keyToCopy) {
                                  navigator.clipboard.writeText(keyToCopy);
                                  showNotification(t('brebKeyCopied'), 'success');
                                }
                                setIsCopyOptionsDialogOpen(false);
                            }}
                        >
                            {t('copyBrebKey')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isActivationPricesDialogOpen} onOpenChange={setIsActivationPricesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('manageActivationPrices')}</DialogTitle>
                        <DialogDescription>{t('manageActivationPricesDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price-two-digit">{t('activationPriceTwoDigit')}</Label>
                            <Input
                                id="price-two-digit"
                                value={activationPrices.twoDigit}
                                onChange={(e) => setActivationPrices(p => ({ ...p, twoDigit: e.target.value }))}
                                placeholder="Ej: 12.000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price-three-digit">{t('activationPriceThreeDigit')}</Label>
                            <Input
                                id="price-three-digit"
                                value={activationPrices.threeDigit}
                                onChange={(e) => setActivationPrices(p => ({ ...p, threeDigit: e.target.value }))}
                                placeholder="Ej: 15.000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price-infinite">{t('activationPriceInfinite')}</Label>
                            <Input
                                id="price-infinite"
                                value={activationPrices.infinite}
                                onChange={(e) => setActivationPrices(p => ({ ...p, infinite: e.target.value }))}
                                placeholder="Ej: 30.000"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsActivationPricesDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleSaveActivationPrices}>{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentInfoDialogOpen} onOpenChange={setIsPaymentInfoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('managePaymentInfo')}</DialogTitle>
                        <DialogDescription>{t('managePaymentInfoDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="payment-info-line1">{t('bankInfoLine1Label')}</Label>
                            <Input
                                id="payment-info-line1"
                                value={paymentInfo.line1}
                                onChange={(e) => setPaymentInfo(p => ({ ...p, line1: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-info-line2">{t('bankInfoLine2Label')}</Label>
                            <Input
                                id="payment-info-line2"
                                value={paymentInfo.line2}
                                onChange={(e) => setPaymentInfo(p => ({ ...p, line2: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentInfoDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleSavePaymentInfo}>{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default App;


