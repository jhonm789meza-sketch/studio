
'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RaffleManager } from '@/lib/RaffleManager';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteDoc, Unsubscribe, serverTimestamp, collection, query, where, getDocs, updateDoc, addDoc, orderBy, writeBatch } from 'firebase/firestore';
import Image from 'next/image';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/hooks/use-language';
import { requestNotificationPermission } from '@/lib/notification';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Award, Lock, House, Clock as ClockIcon, Users, MessageCircle, DollarSign, Share2, Link as LinkIcon, Loader2, QrCode, X, Wand2, Search, Download, Infinity as InfinityIcon, KeyRound, Languages, Trophy, Trash2, Copy, Shield, LogOut, Eye, EyeOff, Gamepad2, Phone, TrendingUp, Globe, Landmark, RefreshCcw, LockKeyhole, Package, Camera, Check, Upload, FlipHorizontal, MousePointer2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confetti } from '@/components/confetti';
import { Switch } from '@/components/ui/switch';
import type { Participant, Raffle, PendingActivation, AppSettings, PartialWinnerInfo } from '@/lib/types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CountrySelectionDialog, getCurrencySymbol } from '@/components/country-selection-dialog';
import { WhatsappIcon, FacebookIcon, TicketIcon, NequiIcon, InlineTicket, BankIcon } from '@/components/raffle-components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


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
    isSeparateNumberEnabled: true,
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
    currencySymbol: '$',
    infiniteModeDigits: 0,
    partialWinnerPercentage3: 0,
    partialWinnerPercentage2: 0,
    sharePrize: false,
    automaticDraw: false,
    allowPartialWinners: false,
    notificationTokens: [],
    partialWinners: [],
};

interface NextRaffleInfo {
    refs: string[];
    count: number;
}

const DateTimeDisplay = ({ t }: { t: (key: string) => void }) => {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
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
    const [confirmationAction, setConfirmationAction] = useState<(() => void | Promise<void>) | null>(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    
    const ticketModalRef = useRef<HTMLDivElement>(null);
    const raffleSubscription = useRef<Unsubscribe | null>(null);
    const loadedRaffleIdRef = useRef<string | null>(null);
    
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
    const [supportContacts, setSupportContacts] = useState<string[]>([]);
    const [newSupportContact, setNewSupportContact] = useState('');
    const [isSupportContactDialogOpen, setIsSupportContactDialogOpen] = useState(false);
    const [gameSearchQuery, setGameSearchQuery] = useState('');
    const [pendingSearchQuery, setPendingSearchQuery] = useState('');
    const [gamesFilter, setGamesFilter] = useState<'all' | 'winners' | 'past_date'>('all');


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
    const [isAssignPackageDialogOpen, setIsAssignPackageDialogOpen] = useState(false);
    const [packageRaffleMode, setPackageRaffleMode] = useState<RaffleMode>('two-digit');
    const [packageQuantity, setPackageQuantity] = useState<number>(10);
    const [generatedPackage, setGeneratedPackage] = useState<{ ref: string; url: string; }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedRafflesForDeletion, setSelectedRafflesForDeletion] = useState<string[]>([]);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isPaymentQrDialogOpen, setIsPaymentQrDialogOpen] = useState(false);
    const [isPaymentQrImageDialogOpen, setIsPaymentQrImageDialogOpen] = useState(false);
    const [paymentQrImageUrl, setPaymentQrImageUrl] = useState('');
    const [isPrizeImageModalOpen, setIsPrizeImageModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isFreeGamesDialogOpen, setIsFreeGamesDialogOpen] = useState(false);
    const [freeGamesConfig, setFreeGamesConfig] = useState({
        twoDigit: false,
        threeDigit: false,
        infinite: false,
    });
    
    // Photo sharing functionality
    const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null);
    const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const prizeTextareaRef = useRef<HTMLTextAreaElement>(null);
    const isCurrentUserAdmin = !!raffleState.adminId && !!currentAdminId && raffleState.adminId === currentAdminId;
    const raffleMode = raffleState.raffleMode;
    const totalNumbers = raffleMode === 'two-digit' ? 100 : 1000;
    const numberLength = raffleMode === 'two-digit' ? 2 : 3;

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
    }, [language]);

    // Redirección interna tras 3 segundos de ver la foto del premio
    useEffect(() => {
        if (isPrizeImageModalOpen && !isCurrentUserAdmin) {
            const timer = setTimeout(() => {
                setIsPrizeImageModalOpen(false);
                handleTabClick('register');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isPrizeImageModalOpen, isCurrentUserAdmin]);

    useEffect(() => {
        if (prizeTextareaRef.current) {
            prizeTextareaRef.current.style.height = 'auto';
            prizeTextareaRef.current.style.height = `${prizeTextareaRef.current.scrollHeight}px`;
        }
    }, [raffleState.prize]);


    useEffect(() => {
        if (isCurrentUserAdmin && raffleState.raffleRef) {
            requestNotificationPermission(raffleState.raffleRef);
        }
    }, [isCurrentUserAdmin, raffleState.raffleRef]);


    useEffect(() => {
        const settingsDocRef = doc(db, 'internal', 'settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data() as AppSettings;
                setAppSettings(settings);
                setFreeGamesConfig({
                    twoDigit: !!settings.isFreeTwoDigit,
                    threeDigit: !!settings.isFreeThreeDigit,
                    infinite: !!settings.isFreeInfinite,
                });
                if (isSuperAdmin) {
                    setSupportContacts(Array.isArray(settings.supportContacts) ? settings.supportContacts : []);
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
                    setPaymentQrImageUrl(settings.paymentQrImageUrl || '');
                }
            }
        });
        return () => unsubscribe();
    }, [isSuperAdmin]);


    const fetchNextRefs = async () => {
        const twoDigitInfo = await raffleManager.peekNextRaffleRef('two-digit', 5);
        const threeDigitInfo = await raffleManager.peekNextRaffleRef('three-digit', 5);
        const infiniteInfo = await raffleManager.peekNextRaffleRef('infinite', 5);
        setNextRaffleRefs({ twoDigit: twoDigitInfo, threeDigit: threeDigitInfo, infinite: infiniteInfo });
    };

    useEffect(() => {
        if (isSuperAdmin && !raffleState.raffleRef) {
            fetchNextRefs();
        } else {
            setNextRaffleRefs({ twoDigit: { refs: [], count: 0 }, threeDigit: { refs: [], count: 0 }, infinite: { refs: [], count: 0 } });
        }
    }, [isSuperAdmin, raffleState.raffleRef]);

    useEffect(() => {
        if (isSuperAdmin) {
            const q = query(collection(db, "pendingActivations"), where("status", "==", "pending"));
            const unsubscribeActivations = onSnapshot(q, (querySnapshot) => {
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
                    raffles.push({ ...doc.data(), raffleRef: doc.id } as Raffle);
                });
                setAllRaffles(raffles);
            });
    
            return () => {
                unsubscribeActivations();
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
                    return existingParticipant;
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
            'id', 'reference', 'state', 'env', 'raffleMode'
        ];
        
        let needsCleanup = false;
        paramsToClean.forEach(param => {
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                needsCleanup = true;
            }
        });
        
        const currentRef = raffleState.raffleRef || new URLSearchParams(window.location.search).get('ref');
        const currentAdminId = url.searchParams.get('adminId');

        const finalParams = new URLSearchParams();
        if (currentRef) {
            finalParams.set('ref', currentRef);
        }
        if (currentAdminId) {
             finalParams.set('adminId', currentAdminId);
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

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            setAppUrl(window.location.origin);
            
            const urlParams = new URLSearchParams(window.location.search);
            const adminIdFromUrl = urlParams.get('adminId');
            
            const adminIdFromStorage = localStorage.getItem('rifaAdminId');
            const superAdminSession = sessionStorage.getItem('isSuperAdmin');
            const isSuper = superAdminSession === 'true';
            setIsSuperAdmin(isSuper);

            let currentAdmin = null;
            if (adminIdFromUrl) {
                localStorage.setItem('rifaAdminId', adminIdFromUrl);
                currentAdmin = adminIdFromUrl;
            } else if (adminIdFromStorage) {
                currentAdmin = adminIdFromStorage;
            }
            setCurrentAdminId(currentAdmin);

            const status = urlParams.get('transactionState') || urlParams.get('state');
            const transactionId = urlParams.get('reference') || urlParams.get('ref_payco'); 
            const refFromUrl = urlParams.get('ref');
            const modeFromUrl = urlParams.get('raffleMode') as RaffleMode;

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
            else if ((status?.toLowerCase() === 'approved' || status === '4' || status === '1') && transactionId && refFromUrl) {
                 const pName = urlParams.get('pName');
                 const pPhone = urlParams.get('pPhone');
                 const pNum = urlParams.get('pNum');

                 if (pName && pPhone && pNum) {
                     await confirmParticipantPayment(refFromUrl, { name: pName, phoneNumber: pPhone, raffleNumber: pNum });
                 }
            }
            
            if (refFromUrl) {
                await handleAdminSearch({ refToSearch: refFromUrl, isInitialLoad: true });
            } else {
                setRaffleState(initialRaffleData);
                setLoading(false);
            }
             const finalUrl = new URL(window.location.origin);
             if (refFromUrl) finalUrl.searchParams.set('ref', refFromUrl);
             if (adminIdFromUrl) finalUrl.searchParams.set('adminId', adminIdFromUrl);
             
             if (window.location.href !== finalUrl.href) {
                window.history.replaceState({}, '', finalUrl.href);
             }
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
    }, []);
    
    const uploadImage = async (image: File, context: string): Promise<string> => {
        setIsUploading(true);
        try {
            const path = `${context}/${Date.now()}_${image.name}`;
            const storageReference = storageRef(storage, path);
            
            const uploadResult = await uploadBytes(storageReference, image);
            const downloadUrl = await getDownloadURL(uploadResult.ref);
            
            if (context === 'prize-images') {
                handleLocalFieldChange('prizeImageUrl', downloadUrl);
            } else if (context === 'payment-qr') {
                setPaymentQrImageUrl(downloadUrl);
            }
            
            showNotification(t('imageUploadedSuccess'), 'success');
            return downloadUrl;
        } catch (error) {
            console.error(`Error uploading image to ${context}:`, error);
            showNotification(t('errorUploadingImage'), 'error');
            throw error;
        } finally {
            setIsUploading(false);
        }
    };


    const showNotification = (message: string, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
    };

    const showConfirmationDialog = (message: string, action: () => void | Promise<void>) => {
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
        return `${currencySymbol} ${number.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
             const cleanValue = value.replace(/\D/g, '');
             newState[field as keyof Raffle] = cleanValue;
 
             if (field === 'manualWinnerNumber' && raffleState.raffleMode === 'infinite') {
                 if (cleanValue.length >= 3) {
                     newState['manualWinnerNumber3'] = cleanValue.slice(-3);
                 } else {
                     newState['manualWinnerNumber3'] = '';
                 }
                 if (cleanValue.length >= 2) {
                     newState['manualWinnerNumber2'] = cleanValue.slice(-2);
                 } else {
                     newState['manualWinnerNumber2'] = '';
                 }
             }
        } else {
            newState[field as keyof Raffle] = value;
        }
    
        setRaffleState(prevState => ({ ...prevState, ...newState }));
    };

    const handleFieldChange = (field: string, value: any, isUploadingField = false) => {
        return new Promise<void>(async (resolve, reject) => {
            if (!raffleState.raffleRef || !isCurrentUserAdmin) {
                handleLocalFieldChange(field, value);
                resolve();
                return;
            }
            
            if (!isUploadingField) setIsUploading(true);

            try {
                let valueToSave = value;
                if (field === 'value' || field === 'partialWinnerPercentage3' || field === 'partialWinnerPercentage2') {
                    valueToSave = String(value).replace(/\D/g, '');
                    if (valueToSave === '') valueToSave = 0;
                } else if (field === 'infiniteModeDigits') {
                    valueToSave = parseInt(String(value).replace(/\D/g, ''), 10) || 0;
                    if (valueToSave !== 0 && valueToSave < 4) {
                        showNotification(t('min4Digits'), 'warning');
                        if (!isUploadingField) setIsUploading(false);
                        reject(new Error(t('min4Digits')));
                        return;
                    }
                }
                
                await updateDoc(doc(db, "raffles", raffleState.raffleRef), { [field]: valueToSave });
                resolve();
            } catch (error) {
                console.error(`Error updating field ${field}:`, error);
                showNotification(t('fieldUpdateError', { field }), 'error');
                reject(error);
            }
            finally {
                if (!isUploadingField) setIsUploading(false);
            }
        });
    };
    
    
    const allAssignedNumbers = new Set(raffleState.participants.map((p: Participant) => parseInt(p.raffleNumber, 10)) || []);
    const pendingParticipants = raffleState.participants.filter((p: Participant) => p.paymentStatus === 'pending') || [];
    const confirmedParticipants = raffleState.participants.filter((p: Participant) => p.paymentStatus === 'confirmed') || [];

    const filteredPendingParticipants = pendingParticipants.filter(p =>
        p.raffleNumber.toLowerCase().includes(pendingSearchQuery.toLowerCase()) ||
        p.phoneNumber.toLowerCase().includes(pendingSearchQuery.toLowerCase())
    );

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
    
        let foundPartialWinners: PartialWinnerInfo[] = [];

        if (raffleMode === 'infinite' && raffleState.allowPartialWinners && raffleState.winner.raffleNumber) {
            const winningNumberStr = raffleState.winner.raffleNumber;
            const mainWinner = !raffleState.winner.isHouse ? raffleState.winner : null;

            const excludedIds = new Set<number>();
            if (mainWinner) {
                excludedIds.add(mainWinner.id);
            }

            const prizeValue = parseFloat(String(raffleState.prize).replace(/\D/g, ''));

            if (!isNaN(prizeValue) && prizeValue > 0) {
                const winningNumber3 = winningNumberStr.slice(-3);
                if (winningNumber3.length === 3) {
                    const prizePercentage3 = raffleState.partialWinnerPercentage3 || 0;
                    if (prizePercentage3 > 0) {
                        const prizeAmount3 = prizeValue * (prizePercentage3 / 100);
                        const formattedPrize3 = `${raffleState.currencySymbol || '$'} ${prizeAmount3.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                        const winners3 = confirmedParticipants.filter(p => !excludedIds.has(p.id) && p.raffleNumber.endsWith(winningNumber3));
                        if (winners3.length > 0) {
                            winners3.forEach(w => excludedIds.add(w.id));
                            foundPartialWinners.push({ winners: winners3, digits: 3, prize: formattedPrize3 });
                        }
                    }
                }

                const winningNumber2 = winningNumberStr.slice(-2);
                if (winningNumber2.length === 2) {
                     const prizePercentage2 = raffleState.partialWinnerPercentage2 || 0;
                     if (prizePercentage2 > 0) {
                        const prizeAmount2 = prizeValue * (prizePercentage2 / 100);
                        const formattedPrize2 = `${raffleState.currencySymbol || '$'} ${prizeAmount2.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                        const winners2 = confirmedParticipants.filter(p => !excludedIds.has(p.id) && p.raffleNumber.endsWith(winningNumber2));
                        if (winners2.length > 0) {
                            foundPartialWinners.push({ winners: winners2, digits: 2, prize: formattedPrize2 });
                        }
                     }
                }
            }
        }
        
        setPartialWinners(foundPartialWinners);
    
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { 
            isWinnerConfirmed: true,
            partialWinners: foundPartialWinners 
        }, { merge: true });
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

    const handleRegisterParticipant = async (isNequiPayment = false, confirmPayment: boolean | 'separated' = false): Promise<number | null> => {
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
        const participantPhone = phoneNumber;
        const formattedRaffleNumber = raffleMode === 'infinite' ? raffleNumber : String(num).padStart(numberLength, '0');
        const participantId = Date.now();

        const newParticipant: Participant = {
            id: participantId,
            name: participantName,
            phoneNumber: participantPhone,
            raffleNumber: formattedRaffleNumber,
            timestamp: new Date(),
            paymentStatus: confirmPayment === true ? 'confirmed' : 'pending',
            raffleRef: raffleState.raffleRef,
        };
        
        const updatedParticipants = [...raffleState.participants, newParticipant];

        if (isNequiPayment && confirmPayment === false) {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
            setRaffleState(s => ({ ...s, name: '', phoneNumber: '', raffleNumber: '' }));
            
            const nequiUrl = `nequi://payment?phoneNumber=${raffleState.nequiAccountNumber}&value=${raffleState.value}&message=${raffleState.raffleNumber}`;
            window.location.href = nequiUrl;
            showNotification(t('nequiPaymentPendingNotification', { number: formattedRaffleNumber, name: participantName }), 'success');
        } else {
            await setDoc(doc(db, "raffles", raffleState.raffleRef), { participants: updatedParticipants }, { merge: true });
            setRaffleState(s => ({ ...s, name: '', phoneNumber: '', raffleNumber: '' }));
            
            if (confirmPayment === 'separated') {
                showNotification(t('numberSeparatedSuccess', { number: formattedRaffleNumber }), 'success');
            } else {
                showNotification(t('participantRegisteredNotification', { name: participantName, number: formattedRaffleNumber }), 'success');
            }
            
            if (confirmPayment === true && raffleState.prize) {
                const ticketData = {
                    ...newParticipant,
                    prize: raffleState.prize,
                    organizerName: raffleState.organizerName,
                    gameDate: raffleState.gameDate,
                    lottery: raffleState.lottery === 'Otro' ? raffleState.customLottery : raffleState.lottery,
                    prizeImageUrl: raffleState.prizeImageUrl,
                    raffleRef: raffleState.raffleRef,
                    value: raffleState.value,
                    currencySymbol: raffleState.currencySymbol,
                };
                setGeneratedTicketData(ticketData);
            }
        }

        if (confirmPayment === false || confirmPayment === 'separated') {
            handleTabClick('board');
        }

        return participantId;
    };

    const handleGenerateRandomNumber = () => {
        if (raffleMode !== 'infinite' || !raffleState.infiniteModeDigits || raffleState.infiniteModeDigits < 4) {
            showNotification(t('configureInfiniteDigitsWarning'), 'warning');
            return;
        }
    
        const digits = raffleState.infiniteModeDigits;
        const max = Math.pow(10, digits);
        const totalNumbers = max;
        const soldNumbers = allAssignedNumbers.size;
    
        if (soldNumbers >= totalNumbers) {
            showNotification(t('allNumbersSoldWarning'), 'warning');
            return;
        }
    
        let randomNumber: number;
        let attempts = 0;
        const maxAttempts = totalNumbers * 2;
    
        do {
            randomNumber = Math.floor(Math.random() * max);
            attempts++;
            if(attempts > maxAttempts) {
                 showNotification(t('couldNotFindRandomNumber'), 'warning');
                 return;
            }
        } while (allAssignedNumbers.has(randomNumber));
    
        const randomNumberStr = String(randomNumber).padStart(digits, '0');
        handleLocalFieldChange('raffleNumber', randomNumberStr);
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
        showConfirmationDialog(t('deleteSingleGameConfirmation', { ref: raffleRef }), async () => {
            try {
                await deleteDoc(doc(db, 'raffles', raffleRef));
                showNotification(t('gameDeletedSuccess'), 'success');
                setSelectedRafflesForDeletion(prev => prev.filter(ref => ref !== raffleRef));
            } catch (error) {
                console.error('Error deleting raffle:', error);
                showNotification(t('gameDeletedError'), 'error');
            }
        });
    };

    const handleDeleteSelectedRaffles = () => {
        showConfirmationDialog(
            t('deleteSelectedRafflesConfirmation', { count: selectedRafflesForDeletion.length }),
            async () => {
                const batch = writeBatch(db);
                selectedRafflesForDeletion.forEach(raffleRef => {
                    batch.delete(doc(db, 'raffles', raffleRef));
                });
                try {
                    await batch.commit();
                    showNotification(t('selectedRafflesDeletedSuccess', { count: selectedRafflesForDeletion.length }), 'success');
                    setSelectedRafflesForDeletion([]);
                } catch (error) {
                    console.error('Error deleting selected raffles:', error);
                    showNotification(t('selectedRafflesDeletedError'), 'error');
                }
            }
        );
    };

    const gamesWithWinner = allRaffles.filter(raffle => !!raffle.winner);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDateRaffles = allRaffles.filter(raffle => {
        if (!raffle.gameDate) return false;
        const gameDateObj = new Date(raffle.gameDate + 'T00:00:00');
        return gameDateObj < today && !raffle.winner;
    });

    const handleDeleteAllWinnerRaffles = () => {
        showConfirmationDialog(
            t('deleteAllWinnerGamesConfirmation', { count: gamesWithWinner.length }),
            async () => {
                const batch = writeBatch(db);
                gamesWithWinner.forEach(raffle => {
                    batch.delete(doc(db, 'raffles', raffle.raffleRef));
                });
                try {
                    await batch.commit();
                    showNotification(t('selectedRafflesDeletedSuccess', { count: gamesWithWinner.length }), 'success');
                } catch (error) {
                    console.error('Error deleting all winner raffles:', error);
                    showNotification(t('selectedRafflesDeletedError'), 'error');
                }
            }
        );
    };

    const handleDeleteAllPastDueRaffles = () => {
        showConfirmationDialog(
            t('deleteAllPastDueGamesConfirmation', { count: pastDateRaffles.length }),
            async () => {
                const batch = writeBatch(db);
                pastDateRaffles.forEach(raffle => {
                    batch.delete(doc(db, 'raffles', raffle.raffleRef));
                });
                try {
                    await batch.commit();
                    showNotification(t('selectedRafflesDeletedSuccess', { count: pastDateRaffles.length }), 'success');
                } catch (error) {
                    console.error('Error deleting all past due raffles:', error);
                    showNotification(t('selectedRafflesDeletedError'), 'error');
                }
            }
        );
    };


    const handleDownloadTicket = async () => {
        const ticketElement = ticketModalRef.current;
        if (!ticketElement) {
            console.error("Ticket element not found for download.");
            return;
        }

        const targetInfo = generatedTicketData || ticketInfo;
        if (!targetInfo) {
            console.error("Ticket info not found for download.");
            return;
        }
        
        try {
            const canvas = await html2canvas(ticketElement, { 
                useCORS: true, 
                backgroundColor: null,
                scale: 3,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            
            pdf.save(`tiquete_${targetInfo.raffleNumber}.pdf`);
            
            showNotification(t('ticketDownloaded'), 'success');

        } catch (err) {
            console.error("Error generating ticket image for download:", err);
            showNotification(t('errorGeneratingTicketImage'), 'error');
        }
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
    
            raffleSubscription.current?.();
            const raffleDocRef = doc(db, 'raffles', aRef);

            raffleSubscription.current = onSnapshot(raffleDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data() as Raffle;
    
                    setRaffleState(prevState => {
                        if (loadedRaffleIdRef.current !== aRef) {
                            return data; 
                        }
                    
                        const isUploadingImage = isUploading && !prevState.prizeImageUrl && !!data.prizeImageUrl;
                        
                        const newState = { ...prevState, ...data };
                    
                        if (isUploadingImage) {
                            setIsUploading(false);
                        }
                        
                        newState.name = prevState.name;
                        newState.phoneNumber = prevState.phoneNumber;
                        newState.raffleNumber = prevState.raffleNumber;
                        newState.manualWinnerNumber = prevState.manualWinnerNumber;
                        newState.manualWinnerNumber2 = prevState.manualWinnerNumber2;
                        newState.manualWinnerNumber3 = prevState.manualWinnerNumber3;
                    
                        return newState;
                    });
                    
                    loadedRaffleIdRef.current = aRef;

                    if (isSuperAdmin) {
                        setCurrentAdminId(data.adminId);
                    } else if (!isPublicSearch) {
                        const adminIdFromStorage = localStorage.getItem('rifaAdminId');
                        if (adminIdFromStorage && data.adminId === adminIdFromStorage) {
                            setCurrentAdminId(adminIdFromStorage);
                        } else {
                            setCurrentAdminId(null);
                        }
                    } else {
                        setCurrentAdminId(null);
                    }
    
                    if (isInitialLoad) {
                        showNotification(t('loadingRaffle', { ref: aRef }), 'info');
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
                        
                        const adminIdForUrl = localStorage.getItem('rifaAdminId');
                        if (data.adminId && data.adminId === adminIdForUrl && !isPublicSearch) {
                            newUrl.searchParams.set('adminId', data.adminId);
                        } else {
                            newUrl.searchParams.delete('adminId');
                        }

                        if (currentUrl.href !== newUrl.href) {
                            window.history.replaceState({}, '', newUrl.href);
                        }
                    }
                } else if (!isInitialLoad) {
                    showNotification(t('raffleNotFound'), 'error');
                    setRaffleState(initialRaffleData);
                    loadedRaffleIdRef.current = null;
                    setCurrentAdminId(null);
                    window.history.pushState({}, '', window.location.pathname);
                }
                setLoading(false);
                resolve();
            }, (error) => {
                console.error("Error subscribing to raffle:", error);
                showNotification(t('raffleLoadError'), 'error');
                setLoading(false);
                setIsUploading(false);
                resolve();
            });
        });
    };
    
    const handleDrawWinner = async () => {
        if (!raffleState.raffleRef) return;
    
        const winningNumberLength = raffleMode === 'infinite' ? (raffleState.infiniteModeDigits || 4) : numberLength;
    
        let winningNumberStr = raffleState.manualWinnerNumber;
    
        if (raffleMode === 'infinite' && raffleState.automaticDraw) {
            const max = Math.pow(10, winningNumberLength);
            const randomNumber = Math.floor(Math.random() * max);
            winningNumberStr = String(randomNumber).padStart(winningNumberLength, '0');
            handleLocalFieldChange('manualWinnerNumber', winningNumberStr);
        }
    
        if (!winningNumberStr || winningNumberStr.length < winningNumberLength) {
            showNotification(t('enterValidWinningNumber', { count: winningNumberLength }), 'warning');
            return;
        }
    
        const mainWinner = confirmedParticipants.find((p: Participant) => p.raffleNumber === winningNumberStr);
        const winnerToSet = mainWinner || { name: t('housePrize'), raffleNumber: winningNumberStr, isHouse: true };
    
        await setDoc(doc(db, "raffles", raffleState.raffleRef), { winner: winnerToSet }, { merge: true });
    
        if (mainWinner) {
            setShowConfetti(true);
            showNotification(t('winnerNotification', { name: mainWinner.name, number: mainWinner.raffleNumber }), 'success');
            setTimeout(() => setShowConfetti(false), 8000);
        } else {
            showNotification(t('housePrizeNotification', { number: winningNumberStr }), 'info');
        }
    
        if (raffleMode === 'infinite' && raffleState.allowPartialWinners) {
            const allFoundPartialWinners: { winners: Participant[]; digits: number; prize: string; }[] = [];
            const excludedIds = new Set<number>();
    
            if (mainWinner) {
                excludedIds.add(mainWinner.id);
            }
    
            const prizeValue = parseFloat(String(raffleState.prize).replace(/\D/g, ''));
    
            if (!isNaN(prizeValue) && prizeValue > 0) {
                const winningNumber3 = winningNumberStr.slice(-3);
                if (winningNumber3.length === 3) {
                    const prizePercentage3 = raffleState.partialWinnerPercentage3 || 0;
                    if (prizePercentage3 > 0) {
                        const prizeAmount3 = prizeValue * (prizePercentage3 / 100);
                        const formattedPrize3 = `${raffleState.currencySymbol || '$'} ${prizeAmount3.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                        
                        const winners3 = confirmedParticipants.filter(p => !excludedIds.has(p.id) && p.raffleNumber.endsWith(winningNumber3));
                        
                        if (winners3.length > 0) {
                            winners3.forEach(w => excludedIds.add(w.id));
                            allFoundPartialWinners.push({ winners: winners3, digits: 3, prize: formattedPrize3 });
                            const winnerMessage = winners3.map(w => `${w.name} (${w.raffleNumber})`).join(', ');
                            showNotification(t('partialWinnersNotification', { count: 3, digits: winningNumber3, winners: winnerMessage, prize: formattedPrize3 }), 'success');
                        } else {
                            showNotification(t('noPartialWinnersNotification', { count: 3, digits: winningNumber3 }), 'info');
                        }
                    }
                }
    
                const winningNumber2 = winningNumberStr.slice(-2);
                if (winningNumber2.length === 2) {
                     const prizePercentage2 = raffleState.partialWinnerPercentage2 || 0;
                     if (prizePercentage2 > 0) {
                        const prizeAmount2 = prizeValue * (prizePercentage2 / 100);
                        const formattedPrize2 = `${raffleState.currencySymbol || '$'} ${prizeAmount2.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                        
                        const winners2 = confirmedParticipants.filter(p => !excludedIds.has(p.id) && p.raffleNumber.endsWith(winningNumber2));
    
                        if (winners2.length > 0) {
                            allFoundPartialWinners.push({ winners: winners2, digits: 2, prize: formattedPrize2 });
                            const winnerMessage = winners2.map(w => `${w.name} (${w.raffleNumber})`).join(', ');
                            showNotification(t('partialWinnersNotification', { count: 2, digits: winningNumber2, winners: winnerMessage, prize: formattedPrize2 }), 'success');
                        } else {
                            showNotification(t('noPartialWinnersNotification', { count: 2, digits: winningNumber2 }), 'info');
                        }
                     }
                }
            } else if (raffleState.allowPartialWinners) {
                showNotification(t('noPrizeValueWarning'), 'warning');
            }
            
            if (allFoundPartialWinners.length > 0) {
                setPartialWinners(allFoundPartialWinners);
            }
        }
    
        handleTabClick('winners');
    };

    const handleCorrectWinner = async () => {
        if (!raffleState.raffleRef || !raffleState.winner) return;

        await setDoc(doc(db, "raffles", raffleState.raffleRef), { 
            winner: null,
            manualWinnerNumber: '',
            manualWinnerNumber2: '',
            manualWinnerNumber3: '',
            partialWinners: [],
        }, { merge: true });
        
        setPartialWinners([]);
        showNotification(t('winnerCorrected'), 'info');
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
        if (raffleState.winner && !raffleState.winner.isHouse) {
            searchableParticipants = searchableParticipants.filter(p => p.raffleNumber !== raffleState.winner?.raffleNumber);
        }

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
        const isFree = mode === 'two-digit' ? appSettings.isFreeTwoDigit :
                      mode === 'three-digit' ? appSettings.isFreeThreeDigit :
                      mode === 'infinite' ? appSettings.isFreeInfinite : false;

        if (isFree) {
            handleActivateBoard(mode, 'CO', `FREE_${Date.now()}`);
            return;
        }

        const link =
          mode === 'two-digit'
            ? appSettings.paymentLinkTwoDigit
            : mode === 'three-digit'
            ? appSettings.paymentLinkThreeDigit
            : mode === 'infinite'
            ? appSettings.paymentLinkInfinite
            : undefined;
    
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
        await handleAdminSearch({ refToSearch: raffleRefToSearch, isPublicSearch: true });
        setActivationRefs(prev => ({...prev, [mode]: ''}));
    };

    const handleRefClick = async (ref: string, mode: RaffleMode) => {
        if (!isSuperAdmin) return;
    
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
    
            await fetchNextRefs();
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

            if (transactionDoc.exists() && !finalTransactionId.startsWith('SUPERADMIN') && !finalTransactionId.startsWith('MANUAL_') && !finalTransactionId.startsWith('FREE_')) {
                showNotification(t('transactionAlreadyUsed'), 'error');
                if (loadBoard) setLoading(false);
                return { adminId: null, finalRaffleRef: null };
            }
            
            const finalRaffleRef = newRef || await raffleManager.createNewRaffleRef(mode, false, finalTransactionId.startsWith('MANUAL_') || finalTransactionId.startsWith('FREE_'));

            const existingRaffleDoc = await getDoc(doc(db, "raffles", finalRaffleRef));
            if (existingRaffleDoc.exists()) {
                showNotification(t('raffleNotFound'), 'error');
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
            
            if (!finalTransactionId.startsWith('SUPERADMIN') && !finalTransactionId.startsWith('FREE_')) {
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
        if (appSettings.supportContacts && appSettings.supportContacts.length > 0 && !raffleState.raffleRef) {
            setIsContactDialogOpen(true);
        } else if (appSettings.supportContacts && appSettings.supportContacts.length > 0) {
            const primaryContact = appSettings.supportContacts[0];
            const whatsappUrl = `https://wa.me/57${primaryContact}`;
            window.open(whatsappUrl, '_blank');
        } else {
            const whatsappUrl = `https://wa.me/573145696687`;
            window.open(whatsappUrl, '_blank');
        }
    };
    
    const handleShareToWhatsApp = () => {
        const urlToShare = new URL(window.location.origin);
        if (raffleState.raffleRef) {
            urlToShare.search = `?ref=${raffleState.raffleRef}`;
        }
        const message = encodeURIComponent(t('shareRaffleAppDescription'));
        const whatsappUrl = `https://wa.me/?text=${message} ${encodeURIComponent(urlToShare.toString())}`;
        window.open(whatsappUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const handleShareRefToWhatsapp = (ref: string) => {
        const message = encodeURIComponent(`Hola, te envío la referencia de tu nueva rifa: *${ref}*`);
        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareToFacebook = () => {
        const urlToShare = new URL(window.location.origin);
        if (raffleState.raffleRef) {
            urlToShare.search = `?ref=${raffleState.raffleRef}`;
        }
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare.toString())}`;
        window.open(facebookUrl, '_blank');
        setIsShareDialogOpen(false);
    };

    const startCamera = async () => {
        setIsCaptureDialogOpen(true);
        setCaptureCountdown(3);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            showNotification(t('cameraPermissionDenied'), 'error');
            setIsCaptureDialogOpen(false);
        }
    };

    useEffect(() => {
        if (isCaptureDialogOpen && cameraStream && captureCountdown !== null && captureCountdown > 0) {
            const timer = setTimeout(() => setCaptureCountdown(captureCountdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (captureCountdown === 0) {
            takePhoto();
            setCaptureCountdown(null);
        }
    }, [isCaptureDialogOpen, cameraStream, captureCountdown]);


    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCaptureDialogOpen(false);
        setCapturedImageBlob(null);
        setCaptureCountdown(null);
    };

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        setCapturedImageBlob(blob);
                        setTimeout(() => handleConfirmCapture(blob), 500);
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const handleConfirmCapture = async (blobToUpload?: Blob) => {
        const blob = blobToUpload || capturedImageBlob;
        if (!blob) return;
        
        setIsUploading(true);
        try {
            // URL a la página de previsualización que redirige
            const raffleUrl = `${window.location.origin}/prize/${raffleState.raffleRef}`;
            
            const img = new (window as any).Image();
            const imageUrl = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(img, 0, 0);

            const bannerHeight = canvas.height * 0.3;
            const bannerY = (canvas.height - bannerHeight) / 2;
            
            // Dibujar el botón visual "TOCA PARA JUGAR YA"
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(bannerHeight * 0.25)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RIFA⚡EXPRESS', canvas.width / 2, bannerY + (bannerHeight * 0.3));
            
            ctx.fillStyle = '#facc15'; // Amarillo brillante
            ctx.font = `black ${Math.floor(bannerHeight * 0.3)}px sans-serif`;
            ctx.fillText('¡TOCA PARA JUGAR YA!', canvas.width / 2, bannerY + (bannerHeight * 0.7));

            const stampedBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
            if (!stampedBlob) throw new Error("Could not create stamped blob");

            const file = new File([stampedBlob], `prize_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const uploadedImageUrl = await uploadImage(file, 'prize-images');
            
            await handleFieldChange('prizeImageUrl', uploadedImageUrl, true);
            
            const prizeName = raffleState.prize || '';
            const message = `${raffleUrl}\n\n${t('shareRaffleMessage', { prize: prizeName })}\n\n👉 ¡Toca arriba para jugar ya! ⚡`;

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'RifaExpress',
                        text: message,
                        files: [file],
                        url: raffleUrl, 
                    });
                } catch (shareErr) {
                     await navigator.share({
                        title: 'RifaExpress',
                        text: message,
                        url: raffleUrl,
                    });
                }
            } else {
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
            }
            
            stopCamera();
            setIsShareDialogOpen(false);
            URL.revokeObjectURL(imageUrl);
        } catch (error) {
            console.error("Error sharing prize photo:", error);
            showNotification(t('errorUploadingImage'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSharePrizePhoto = async () => {
        if (!raffleState.prizeImageUrl) {
            showNotification(t('noPrizeImage'), 'warning');
            return;
        }

        setIsUploading(true);
        try {
            // URL a la página de previsualización que redirige
            const raffleUrl = `${window.location.origin}/prize/${raffleState.raffleRef}`;
            const prizeName = raffleState.prize || '';
            const message = `${raffleUrl}\n\n${t('shareRaffleMessage', { prize: prizeName })}\n\n👉 ¡Toca arriba para jugar ya! ⚡`;

            const response = await fetch(raffleState.prizeImageUrl);
            const blob = await response.blob();
            
            const img = new (window as any).Image();
            img.crossOrigin = "anonymous";
            const imageUrl = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(img, 0, 0);

            const bannerHeight = canvas.height * 0.3;
            const bannerY = (canvas.height - bannerHeight) / 2;
            
            // Dibujar el botón visual "TOCA PARA JUGAR YA"
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(bannerHeight * 0.25)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RIFA⚡EXPRESS', canvas.width / 2, bannerY + (bannerHeight * 0.3));
            
            ctx.fillStyle = '#facc15';
            ctx.font = `black ${Math.floor(bannerHeight * 0.3)}px sans-serif`;
            ctx.fillText('¡TOCA PARA JUGAR YA!', canvas.width / 2, bannerY + (bannerHeight * 0.7));

            const stampedBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
            if (!stampedBlob) throw new Error("Could not create stamped blob");

            const file = new File([stampedBlob], 'premio.jpg', { type: 'image/jpeg' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'RifaExpress',
                    text: message,
                    files: [file],
                    url: raffleUrl, 
                });
            } else {
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
            }
            URL.revokeObjectURL(imageUrl);
        } catch (error) {
            console.error("Error sharing existing prize photo:", error);
            const raffleUrl = `${window.location.origin}/prize/${raffleState.raffleRef}`;
            const message = encodeURIComponent(`${raffleUrl}\n\n${t('shareRaffleMessage', { prize: raffleState.prize || '' })}\n\n👉 ¡Toca arriba para jugar ya!`);
            window.open(`https://wa.me/?text=${message}`, '_blank');
        } finally {
            setIsUploading(false);
            setIsShareDialogOpen(false);
        }
    };

    const handleGoToHome = () => {
        raffleSubscription.current?.();
        loadedRaffleIdRef.current = null;
        setRaffleState(initialRaffleData);
        setCurrentAdminId(null);
        localStorage.removeItem('rifaAdminId');
        if (window.location.search) {
            window.history.pushState({}, '', window.location.pathname);
        }
        showNotification(t('backToHome'), 'info');
    };

    const handleSuperAdminLogin = () => {
        const executivePassword = appSettings.superAdminPassword || '32184257361045715054';

        if (superAdminPassword === executivePassword) {
            setIsSuperAdmin(true);
            sessionStorage.setItem('isSuperAdmin', 'true');
            setIsSuperAdminLoginOpen(false);
            setFreeGamesConfig({
                twoDigit: !!appSettings.isFreeTwoDigit,
                threeDigit: !!appSettings.isFreeThreeDigit,
                infinite: !!appSettings.isFreeInfinite,
            });
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

    const handleSaveSupportContacts = async () => {
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, { supportContacts: supportContacts }, { merge: true });
            showNotification(t('secondaryContactSaved'), 'success');
        } catch (error) {
            console.error("Error saving support contact:", error);
            showNotification(t('errorSavingSecondaryContact'), 'error');
        }
    };

    const handleAddSupportContact = async () => {
        if (newSupportContact && !supportContacts.includes(newSupportContact)) {
            const updatedContacts = [...supportContacts, newSupportContact.replace(/\D/g, '')];
            setSupportContacts(updatedContacts);
            setNewSupportContact('');

            try {
                const settingsDocRef = doc(db, 'internal', 'settings');
                await setDoc(settingsDocRef, { supportContacts: updatedContacts }, { merge: true });
                showNotification(t('secondaryContactSaved'), 'success');
            } catch (error) {
                console.error("Error saving support contact:", error);
                showNotification(t('errorSavingSecondaryContact'), 'error');
                setSupportContacts(supportContacts);
            }
        }
    };

    const handleRemoveSupportContact = (contactToRemove: string) => {
        setSupportContacts(supportContacts.filter(contact => contact !== contactToRemove));
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

    const handleSaveFreeGamesSettings = async () => {
        try {
            const settingsDocRef = doc(db, 'internal', 'settings');
            await setDoc(settingsDocRef, {
                isFreeTwoDigit: freeGamesConfig.twoDigit,
                isFreeThreeDigit: freeGamesConfig.threeDigit,
                isFreeInfinite: freeGamesConfig.infinite,
            }, { merge: true });
            showNotification(t('freeGamesSaved'), 'success');
            setIsFreeGamesDialogOpen(false);
        } catch (error) {
            console.error("Error saving free games settings:", error);
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

    const handleGeneratePackage = async () => {
        if (!packageQuantity || packageQuantity <= 0) {
            showNotification(t('enterValidQuantity'), 'warning');
            return;
        }
        setIsGenerating(true);
        setGeneratedPackage([]);
    
        try {
            const batch = writeBatch(db);
            const newPackage: { ref: string; url: string; }[] = [];
    
            for (let i = 0; i < packageQuantity; i++) {
                const adminId = `admin_${Date.now()}_${Math.random()}_${i}`;
                const raffleRef = await raffleManager.createNewRaffleRef(packageRaffleMode, false, true); 
                
                const newRaffleData: Raffle = {
                    ...initialRaffleData,
                    raffleRef: raffleRef,
                    adminId: adminId,
                    raffleMode: packageRaffleMode,
                    isPaid: true,
                    currencySymbol: getCurrencySymbol('CO'),
                    organizerName: '',
                    prize: '',
                    value: '0',
                    password: String(Math.floor(1000 + Math.random() * 9000)),
                };
    
                const docRef = doc(db, "raffles", raffleRef);
                batch.set(docRef, newRaffleData);
    
                const adminUrl = `${appUrl}?ref=${raffleRef}&adminId=${adminId}`;
                newPackage.push({ ref: raffleRef, url: adminUrl });
            }
    
            await batch.commit();
            setGeneratedPackage(newPackage);
            showNotification(t('packageGeneratedSuccess', { count: packageQuantity }), 'success');
    
        } catch (error) {
            console.error("Error generating package:", error);
            showNotification(t('packageGeneratedError'), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePaymentQrImage = async () => {
        if (!isSuperAdmin) return;
        setIsUploading(true);
        try {
            await updateDoc(doc(db, 'internal', 'settings'), {
                paymentQrImageUrl: paymentQrImageUrl,
            });
            showNotification(t('paymentQrImageSaved'), 'success');
            setIsPaymentQrImageDialogOpen(false);
        } catch (error) {
            console.error("Error saving payment QR image:", error);
            showNotification(t('errorSavingPaymentQrImage'), 'error');
        } finally {
             setIsUploading(false);
        }
    };

    const handleDeleteGeneratedRef = (raffleRef: string) => {
        showConfirmationDialog(
            t('deleteGeneratedRefConfirmation', { ref: raffleRef }),
            async () => {
                try {
                    await deleteDoc(doc(db, 'raffles', raffleRef));
                    setGeneratedPackage((prev) => prev.filter((p) => p.ref !== raffleRef));
                    showNotification(t('generatedRefDeletedSuccess', { ref: raffleRef }), 'success');
                } catch (error) {
                    console.error("Error deleting generated ref:", error);
                    showNotification(t('generatedRefDeletedError'), 'error');
                }
            }
        );
    };

    const handleDeleteAllGeneratedRefs = () => {
        showConfirmationDialog(
            t('deleteAllGeneratedRefsConfirmation', { count: generatedPackage.length }),
            async () => {
                setIsGenerating(true);
                try {
                    const batch = writeBatch(db);
                    generatedPackage.forEach((p) => {
                        const docRef = doc(db, 'raffles', p.ref);
                        batch.delete(docRef);
                    });
                    await batch.commit();
                    setGeneratedPackage([]);
                    showNotification(t('allGeneratedRefsDeletedSuccess'), 'success');
                } catch (error) {
                    console.error("Error deleting all generated refs:", error);
                    showNotification(t('allGeneratedRefsDeletedError'), 'error');
                } finally {
                    setIsGenerating(false);
                }
            }
        );
    };


    const allNumbers = Array.from({ length: totalNumbers }, (_, i) => i);
    
    const backgroundImage = raffleState.prizeImageUrl;

    const closeTicketModal = () => {
        setIsTicketModalOpen(false);
        setTicketInfo(null);
    };
    
    const filteredGames = allRaffles.filter(raffle => {
        const searchMatch = raffle.raffleRef?.toLowerCase().includes(gameSearchQuery.toLowerCase());
        if (!searchMatch) return false;
        if (gamesFilter === 'winners') {
            return !!raffle.winner;
        }
        if (gamesFilter === 'past_date') {
            if (!raffle.gameDate) return false;
            const gameDateObj = new Date(raffle.gameDate + 'T00:00:00');
            return gameDateObj < today && !raffle.winner;
        }
        return true;
    });

    const deletableRaffles = filteredGames.filter(r => (r.participants || []).length === 0 || !!r.winner || (new Date(r.gameDate + 'T00:00:00') < today && !r.winner));
    const allDeletableSelected = deletableRaffles.length > 0 && deletableRaffles.every(r => selectedRafflesForDeletion.includes(r.raffleRef));
    const isIndeterminate = selectedRafflesForDeletion.length > 0 && !allDeletableSelected;

    const prizeValueForGoal = raffleState.raffleMode === 'infinite' && raffleState.prize ? parseFloat(String(raffleState.prize).replace(/\D/g, '')) : 0;
    const ticketValueForGoal = raffleState.raffleMode === 'infinite' && raffleState.value ? parseFloat(String(raffleState.prize).replace(/\D/g, '')) : 0;
    const ticketsToCoverPrize = ticketValueForGoal > 0 ? Math.ceil(prizeValueForGoal / ticketValueForGoal) : 0;


    if (loading && !raffleState.raffleRef) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">{t('loading')}...</div>;
    }
    
    const isRegisterFormValidForSubmit = raffleState.name && raffleState.phoneNumber && raffleState.raffleNumber && !allAssignedNumbers.has(parseInt(raffleState.raffleNumber || '0'));
    
    const currentPartialWinners = (raffleState.partialWinners && raffleState.partialWinners.length > 0) ? raffleState.partialWinners : partialWinners;


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
                        
                        <div className="mb-6 rounded-lg overflow-hidden relative flex items-center justify-center shadow-lg bg-gray-200 aspect-auto group">
                             {raffleState.prizeImageUrl ? (
                                <button onClick={() => isCurrentUserAdmin ? handleShare() : handleTabClick('register')} className="w-full flex items-center justify-center cursor-pointer relative" aria-label={t('rafflePrizeAlt')}>
                                    <Image 
                                        src={raffleState.prizeImageUrl} 
                                        alt={t('rafflePrizeAlt')} 
                                        width={1200}
                                        height={1200}
                                        className="w-full h-auto object-contain max-h-[60vh] transition-transform duration-500 group-hover:scale-105"
                                        unoptimized 
                                        key={raffleState.prizeImageUrl}
                                    />
                                    {!isCurrentUserAdmin && (
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2">
                                                <MousePointer2 className="h-4 w-4" />
                                                TOCA PARA JUGAR
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <div className="flex flex-col items-center gap-2 p-16">
                                    <span className="text-gray-500">{t('noPrizeImage')}</span>
                                </div>
                            )}
                             {isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-md p-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                                    <p className="text-white mt-2 text-sm">{t('uploadingImage')}</p>
                                </div>
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
                               <Textarea
                                   ref={prizeTextareaRef}
                                   id="prize-input"
                                   rows={3}
                                   style={{ overflowY: 'hidden' }}
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
                                    <Label>{t('prizeImage')}</Label>
                                    <div className="space-y-2 mt-1">
                                        <div className="flex flex-wrap gap-2">
                                            <Input
                                                id="prize-image-url-input"
                                                type="text"
                                                value={raffleState.prizeImageUrl}
                                                onChange={(e) => handleLocalFieldChange('prizeImageUrl', e.target.value)}
                                                onBlur={(e) => handleFieldChange('prizeImageUrl', e.target.value)}
                                                placeholder={t('pasteImageLinkPlaceholder')}
                                                disabled={!isCurrentUserAdmin || raffleState.isDetailsConfirmed}
                                                className="flex-grow"
                                            />
                                            <a href="https://www.google.com/imghp" target="_blank" rel="noopener noreferrer">
                                                <Button type="button" variant="outline" className="w-full sm:w-auto">
                                                    <Search className="h-4 w-4 mr-2" />
                                                    {t('searchOnGoogle')}
                                                </Button>
                                            </a>
                                        </div>
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
                                <div className="grid grid-cols-2 gap-4">
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
                                    <div>
                                        <Label htmlFor="total-numbers-infinite">{t('totalNumbersToSell')}</Label>
                                        <div className="relative mt-1">
                                            <Input
                                                id="total-numbers-infinite"
                                                type="text"
                                                readOnly
                                                value={(raffleState.infiniteModeDigits && raffleState.infiniteModeDigits >= 4) ? Math.pow(10, raffleState.infiniteModeDigits).toLocaleString() : '0'}
                                                disabled
                                                className="w-full bg-slate-100 font-semibold mt-1"
                                            />
                                            <TicketIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
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
                                        <div className="relative">
                                            <Input
                                                id="manual-winner-input"
                                                type="text"
                                                placeholder={t('winningNumberPlaceholder', { count: raffleState.raffleMode === 'infinite' ? (raffleState.infiniteModeDigits || 4) : numberLength })}
                                                value={raffleState.manualWinnerNumber}
                                                onChange={(e) => handleLocalFieldChange('manualWinnerNumber', e.target.value)}
                                                maxLength={raffleState.raffleMode === 'infinite' ? raffleState.infiniteModeDigits : numberLength}
                                                disabled={raffleState.isWinnerConfirmed || !!raffleState.winner || (raffleState.raffleMode === 'infinite' && raffleState.automaticDraw)}
                                                className="w-full"
                                            />
                                            {!!raffleState.winner && <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />}
                                        </div>
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
                                            disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
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
                                                <div className="relative">
                                                    <Input
                                                        id="manual-winner-3-input"
                                                        type="text"
                                                        placeholder={t('last3Digits')}
                                                        value={raffleState.manualWinnerNumber3}
                                                        onChange={(e) => handleLocalFieldChange('manualWinnerNumber3', e.target.value)}
                                                        maxLength={3}
                                                        disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                        className="w-full"
                                                    />
                                                    {!!raffleState.winner && <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />}
                                                </div>
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
                                                    disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-center mb-1">
                                                    <span className="text-sm font-bold text-green-600">{formatValue(parseFloat(String(raffleState.prize).replace(/\D/g, '') || '0') * (raffleState.partialWinnerPercentage3 || 0) / 100)}</span>
                                                    <p className="text-xs text-gray-500">{t('otherWinners')}</p>
                                                 </div>
                                                <Button
                                                    onClick={() => handleFindPartialWinners(3, raffleState.partialWinnerPercentage3 || 0)}
                                                    disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                    className="bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                                                >
                                                    {t('findWinner')}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-grow">
                                                <Label htmlFor="manual-winner-2-input">{t('last2DigitsNumber')}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="manual-winner-2-input"
                                                        type="text"
                                                        placeholder={t('last2Digits')}
                                                        value={raffleState.manualWinnerNumber2}
                                                        onChange={(e) => handleLocalFieldChange('manualWinnerNumber2', e.target.value)}
                                                        maxLength={2}
                                                        disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                        className="w-full"
                                                    />
                                                    {!!raffleState.winner && <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />}
                                                </div>
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
                                                     disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
                                                 />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                 <div className="text-center mb-1">
                                                    <span className="text-sm font-bold text-green-600">{formatValue(parseFloat(String(raffleState.prize).replace(/\D/g, '') || '0') * (raffleState.partialWinnerPercentage2 || 0) / 100)}</span>
                                                    <p className="text-xs text-gray-500">{t('otherWinners')}</p>
                                                 </div>
                                                <Button
                                                    onClick={() => handleFindPartialWinners(2, raffleState.partialWinnerPercentage2 || 0)}
                                                    disabled={raffleState.isWinnerConfirmed || !!raffleState.winner}
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
                                        <>
                                            <Button
                                                onClick={handleConfirmWinner}
                                                className="bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                {t('confirmResult')}
                                            </Button>
                                            <Button
                                                onClick={handleCorrectWinner}
                                                variant="outline"
                                            >
                                                {t('correctWinner')}
                                            </Button>
                                        </>
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
                    <Image src={backgroundImage} alt={t('raffleBackgroundAlt')} fill style={{objectFit: "cover"}} unoptimized />
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
                                            <DropdownMenuItem onSelect={() => setIsAssignPackageDialogOpen(true)}>
                                                <Package className="mr-2 h-4 w-4" />
                                                <span>{t('assignPackage')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsSupportContactDialogOpen(true)}>
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
                                            <DropdownMenuItem onSelect={() => setIsFreeGamesDialogOpen(true)}>
                                                <RefreshCcw className="mr-2 h-4 w-4" />
                                                <span>{t('freeGames')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsPaymentInfoDialogOpen(true)}>
                                                <Landmark className="mr-2 h-4 w-4" />
                                                <span>{t('paymentInfo')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsPaymentQrImageDialogOpen(true)}>
                                                <QrCode className="mr-2 h-4 w-4" />
                                                <span>{t('paymentQrImage')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsSuperAdminChangePasswordOpen(true)}>
                                                <KeyRound className="mr-2 h-4 w-4" />
                                                <span>{t('changePasswordTitle')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={fetchNextRefs}>
                                                <RefreshCcw className="mr-2 h-4 w-4" />
                                                <span>{t('refreshRefs')}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => {
                                                setGamesFilter('past_date');
                                                handleTabClick('games');
                                            }}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center">
                                                        <ClockIcon className="mr-2 h-4 w-4 text-orange-500" />
                                                        <span>{t('pastDateGames')}</span>
                                                    </div>
                                                    <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded-full ml-4">
                                                        {pastDateRaffles.length}
                                                    </span>
                                                </div>
                                            </DropdownMenuItem>
                                            {pastDateRaffles.length > 0 && (
                                                <DropdownMenuItem onSelect={handleDeleteAllPastDueRaffles} className="text-red-500 focus:bg-red-100 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>{t('deleteAllPastDueGames', { count: pastDateRaffles.length })}</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onSelect={() => {
                                                setGamesFilter('winners');
                                                handleTabClick('games');
                                            }}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center">
                                                        <Trophy className="mr-2 h-4 w-4 text-green-500" />
                                                        <span>{t('gamesWithWinner')}</span>
                                                    </div>
                                                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full ml-4">
                                                        {gamesWithWinner.length}
                                                    </span>
                                                </div>
                                            </DropdownMenuItem>
                                            {gamesWithWinner.length > 0 && (
                                                <DropdownMenuItem onSelect={handleDeleteAllWinnerRaffles} className="text-red-500 focus:bg-red-100 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>{t('deleteAllWinnerGames', { count: gamesWithWinner.length })}</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
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
                        <div className="w-10"></div>
                    </div>

                    {!raffleState.raffleRef ? (
                        <div className="p-8">
                            <div className="text-center">
                                <DateTimeDisplay t={t} />
                                <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('boardLocked')}</h2>
                                <div className="max-w-2xl mx-auto bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mb-8">
                                    <h3 className="font-bold">{t('activationInstructionTitle')}</h3>
                                    <p className="text-sm">{t('activationInstructionBody')}</p>
                                </div>
                                <div className="grid md:grid-cols-1 gap-8 items-start max-w-md mx-auto">
                                    <div className="flex flex-col justify-center items-center gap-8">
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
                                                <Button onClick={() => handlePriceButtonClick('two-digit')} size="lg" className={`w-full ${appSettings.isFreeTwoDigit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white font-bold`}>
                                                    {appSettings.isFreeTwoDigit ? t('freeLabel') : (t('price') + (appSettings.activationPriceTwoDigit ? ` (${appSettings.activationPriceTwoDigit})` : ''))}
                                                </Button>
                                                {!appSettings.isFreeTwoDigit && (
                                                    <div className="text-center">
                                                        <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2 justify-center">
                                                            <BankIcon />
                                                            {t('activate')}
                                                        </Button>
                                                        <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                    </div>
                                                )}
                                                {isSuperAdmin && nextRaffleRefs.twoDigit.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefs2Digit')}{' '}
                                                        {nextRaffleRefs.twoDigit.refs.map((ref, index) => (
                                                            <span key={`ref-2-digit-${index}`}>
                                                                <button className="cursor-pointer hover:underline" onClick={() => handleRefClick(ref, 'two-digit')}>{ref}</button>
                                                                {index < nextRaffleRefs.twoDigit.refs.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

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
                                                <Button onClick={() => handlePriceButtonClick('three-digit')} size="lg" className={`w-full ${appSettings.isFreeThreeDigit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} text-white font-bold`}>
                                                    {appSettings.isFreeThreeDigit ? t('freeLabel') : (t('price') + (appSettings.activationPriceThreeDigit ? ` (${appSettings.activationPriceThreeDigit})` : ''))}
                                                </Button>
                                                {!appSettings.isFreeThreeDigit && (
                                                    <div className="text-center">
                                                        <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2 justify-center">
                                                            <BankIcon />
                                                            {t('activate')}
                                                        </Button>
                                                        <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                    </div>
                                                )}
                                                {isSuperAdmin && nextRaffleRefs.threeDigit.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefs3Digit')}{' '}
                                                        {nextRaffleRefs.threeDigit.refs.map((ref, index) => (
                                                             <span key={`ref-3-digit-${index}`}>
                                                                <button className="cursor-pointer hover:underline" onClick={() => handleRefClick(ref, 'three-digit')}>{ref}</button>
                                                                {index < nextRaffleRefs.threeDigit.refs.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

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
                                                <Button onClick={() => handlePriceButtonClick('infinite')} size="lg" className={`w-full ${appSettings.isFreeInfinite ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'} text-white font-bold`}>
                                                    {appSettings.isFreeInfinite ? t('freeLabel') : (t('price') + (appSettings.activationPriceInfinite ? ` (${appSettings.activationPriceInfinite})` : ''))}
                                                </Button>
                                                {!appSettings.isFreeInfinite && (
                                                    <div className="text-center">
                                                        <Button onClick={handleActivationClick} size="lg" className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold flex items-center gap-2 justify-center">
                                                            <BankIcon />
                                                            {t('activate')}
                                                        </Button>
                                                        <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314'}{'\n'}{appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'}</p>
                                                    </div>
                                                )}
                                                {isSuperAdmin && nextRaffleRefs.infinite.refs.length > 0 && (
                                                    <div className="text-xs text-center text-gray-500 font-semibold">
                                                        {t('nextRefsInfinite')}{' '}
                                                        {nextRaffleRefs.infinite.refs.map((ref, index) => (
                                                            <span key={`ref-infinite-${index}`}>
                                                                <button className="cursor-pointer hover:underline" onClick={() => handleRefClick(ref, 'infinite')}>{ref}</button>
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
                                            onClick={() => {
                                                setGamesFilter('all');
                                                handleTabClick('games');
                                            }}
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
                                    {(raffleState.winner || currentPartialWinners.length > 0) && (
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
                                    {isCurrentUserAdmin && raffleState.raffleMode === 'infinite' && (
                                        <button 
                                            className="flex items-center gap-2 px-3 md:px-6 py-3 font-medium text-sm md:text-lg whitespace-nowrap text-gray-500 hover:text-gray-700"
                                            onClick={() => setIsGoalModalOpen(true)}
                                        >
                                            <TrendingUp className="h-5 w-5 md:hidden"/> <span className="hidden md:inline">{t('goal')}</span>
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
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="enable-separate-number" className="flex flex-col space-y-1">
                                                        <span>{t('enableSeparateNumber')}</span>
                                                        <span className="font-normal leading-snug text-muted-foreground text-sm">
                                                            {t('enableSeparateNumberDescription')}
                                                        </span>
                                                    </Label>
                                                    <Switch
                                                        id="enable-separate-number"
                                                        checked={raffleState.isSeparateNumberEnabled}
                                                        onCheckedChange={(checked) => handlePaymentMethodToggle('isSeparateNumberEnabled', checked)}
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
                                                    <div className="relative mt-1">
                                                        <Input
                                                            id="raffle-number-input"
                                                            type="text"
                                                            value={raffleState.raffleNumber}
                                                            onChange={handleRaffleNumberChange}
                                                            placeholder={t('raffleNumberPlaceholder', { example: raffleState.raffleMode === 'two-digit' ? '05' : raffleState.raffleMode === 'three-digit' ? '142' : '2025' })}
                                                            className="w-full pr-10"
                                                            maxLength={raffleState.raffleMode === 'infinite' ? (raffleState.infiniteModeDigits || 4) : numberLength}
                                                        />
                                                        {raffleState.raffleNumber && allAssignedNumbers.has(parseInt(raffleState.raffleNumber)) && (
                                                            <p className="text-red-500 text-sm mt-1">{t('numberAlreadyAssignedWarning')}</p>
                                                        )}
                                                        {raffleState.raffleMode === 'infinite' && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute inset-y-0 right-0 h-full px-3"
                                                                onClick={handleGenerateRandomNumber}
                                                                title={t('generateRandomNumber')}
                                                            >
                                                                <Wand2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
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
                                                                const cleanRedirectUrl = new URL(redirectUrlWithParams.origin + redirectUrlWithParams.pathname);
                                                                cleanRedirectUrl.searchParams.set('ref', raffleState.raffleRef);
                                                                cleanRedirectUrl.searchParams.set('pName', raffleState.name || '');
                                                                cleanRedirectUrl.searchParams.set('pPhone', raffleState.phoneNumber || '');
                                                                cleanRedirectUrl.searchParams.set('pNum', raffleState.raffleNumber || '');
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
                                                    <Button
                                                        variant="outline"
                                                        type="button"
                                                        className="flex-1 w-full sm:w-auto"
                                                        disabled={!raffleState.nequiAccountNumber}
                                                        onClick={() => {
                                                            if (raffleState.nequiAccountNumber) {
                                                                navigator.clipboard.writeText(raffleState.nequiAccountNumber);
                                                                showNotification(t('accountNumberCopied'), 'success');
                                                            }
                                                        }}
                                                    >
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        {t('copyAccountNumber')}
                                                    </Button>
                                                     {raffleState.isSeparateNumberEnabled && (
                                                         <Button
                                                            onClick={() => handleRegisterParticipant(false, 'separated')}
                                                            disabled={!isRegisterFormValidForSubmit}
                                                            className="w-full sm:flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                                                        >
                                                            {t('separate')}
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
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-2xl font-bold text-gray-800">{
                                                        gamesFilter === 'winners' ? t('gamesWithWinner') :
                                                        gamesFilter === 'past_date' ? t('pastDateGames') :
                                                        t('assignedGames')
                                                    }</h2>
                                                    <span className="bg-gray-200 text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">{filteredGames.length}</span>
                                                </div>
                                                {gamesFilter === 'past_date' && pastDateRaffles.length > 0 && (
                                                    <Button variant="destructive" onClick={handleDeleteAllPastDueRaffles}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t('deleteAllPastDueGames', { count: pastDateRaffles.length })}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                                <Input
                                                    type="text"
                                                    placeholder={t('searchGamePlaceholder')}
                                                    value={gameSearchQuery}
                                                    onChange={(e) => setGameSearchQuery(e.target.value)}
                                                    className="max-w-sm w-full"
                                                />
                                                <div className="flex items-center gap-2">
                                                    {selectedRafflesForDeletion.length > 0 && (
                                                        <Button variant="destructive" onClick={handleDeleteSelectedRaffles}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('deleteSelected', { count: selectedRafflesForDeletion.length })}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {filteredGames.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="p-4">
                                                                    <Checkbox
                                                                        checked={allDeletableSelected ? true : isIndeterminate ? 'indeterminate' : false}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked === true) {
                                                                                setSelectedRafflesForDeletion(deletableRaffles.map(r => r.raffleRef));
                                                                            } else {
                                                                                setSelectedRafflesForDeletion([]);
                                                                            }
                                                                        }}
                                                                        disabled={deletableRaffles.length === 0}
                                                                    />
                                                                </th>
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
                                                            {filteredGames.sort((a, b) => (b.raffleRef || '').localeCompare(a.raffleRef || '')).map((raffle) => {
                                                                const collected = ((raffle.participants || []).filter(p => p.paymentStatus === 'confirmed').length * parseFloat(String(raffle.value).replace(/\D/g, ''))) || 0;
                                                                const gameDateObj = raffle.gameDate ? new Date(raffle.gameDate + 'T00:00:00') : null;
                                                                const isPastDue = gameDateObj ? gameDateObj < today && !raffle.winner : false;
                                                                const canDelete = (raffle.participants || []).length === 0 || !!raffle.winner || isPastDue;
                                                                return (
                                                                    <tr key={`${raffle.raffleRef}-${raffle.adminId}`}>
                                                                        <td className="p-4">
                                                                            <Checkbox
                                                                                checked={selectedRafflesForDeletion.includes(raffle.raffleRef)}
                                                                                onCheckedChange={(checked) => {
                                                                                    setSelectedRafflesForDeletion(prev => checked ? [...prev, raffle.raffleRef] : prev.filter(ref => ref !== raffle.raffleRef));
                                                                                }}
                                                                                disabled={!canDelete}
                                                                            />
                                                                        </td>
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
                                                                            <Button onClick={() => handleAdminSearch({ refToSearch: raffle.raffleRef, isPublicSearch: true })} size="sm" variant="outline">{t('manage')}</Button>
                                                                            <Button onClick={() => handleDeleteRaffle(raffle.raffleRef)} size="sm" variant="destructive" disabled={!canDelete}><Trash2 className="h-4 w-4"/></Button>
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
                                    <div className="mb-4 max-w-sm">
                                        <Input
                                            type="text"
                                            placeholder={t('searchByNumberOrPhone')}
                                            value={pendingSearchQuery}
                                            onChange={(e) => setPendingSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {filteredPendingParticipants.length > 0 ? (
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
                                                    {filteredPendingParticipants.sort((a, b) => a.raffleNumber.localeCompare(b.raffleNumber)).map((p: Participant) => (
                                                        <tr key={p.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                <a href={`https://wa.me/57${p.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                    <WhatsappIcon className="h-4 w-4 text-green-500" />
                                                                    {p.phoneNumber}
                                                                </a>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.timestamp?.toDate ? format(p.timestamp.toDate(), 'PPpp', { locale: language === 'es' ? es : enUS }) : 'N/A'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                                <Button onClick={() => handleConfirmPayment(p.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white">{t('confirmPayment')}</Button>
                                                                <Button onClick={() => handleDeletePending(p.id)} size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
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
                                                    {confirmedParticipants.sort((a, b) => a.raffleNumber.localeCompare(b.raffleNumber)).map((p: any, index: number) => (
                                                        <tr key={p.id}>
                                                            {isCurrentUserAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {isCurrentUserAdmin ? (
                                                                    <a href={`https://wa.me/57${p.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                        <WhatsappIcon className="h-4 w-4 text-green-500" />
                                                                        {p.phoneNumber}
                                                                    </a>
                                                                ) : (<span>******</span>)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{p.raffleNumber}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <Button onClick={() => handleGenerateTicket(p)} size="sm" variant="outline" disabled={!raffleState.prize}>{t('generateTicket')}</Button>
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
                                            {raffleState.winner.isHouse ? (<p className="font-bold text-lg flex items-center"><House className="mr-2"/>{t('housePrizeTitle')}</p>) : (<p className="font-bold text-lg flex items-center"><Award className="mr-2"/>{t('winnerFoundTitle')}</p>)}
                                            <p><strong>{t('number')}:</strong> {raffleState.winner.raffleNumber}</p>
                                            {!raffleState.winner.isHouse && (
                                            <>
                                                <p><strong>{t('name')}:</strong> {raffleState.winner.name}</p>
                                                <p><strong>{t('phone')}:</strong> {isCurrentUserAdmin ? <a href={`https://wa.me/57${raffleState.winner.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{`+57 ${raffleState.winner.phoneNumber}`}</a> : <span>******</span>}</p>
                                            </>
                                            )}
                                        </div>
                                    )}
                                    {currentPartialWinners.length > 0 && (
                                        <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-lg space-y-4">
                                            <h3 className="font-bold text-lg">{t('partialWinnersTitle')}</h3>
                                            {currentPartialWinners.map((group, index) => (
                                                <div key={index}>
                                                    <p className="font-semibold">{t('partialWinnersSubtitle', { count: group.digits, prize: group.prize })}</p>
                                                    <ul className="list-disc list-inside text-sm">
                                                        {group.winners.map(winner => (
                                                            <li key={winner.id}>
                                                                {winner.name} ({winner.raffleNumber})
                                                                {isCurrentUserAdmin && (<a href={`https://wa.me/57${winner.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">{`+57 ${winner.phoneNumber}`}</a>)}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!raffleState.winner && currentPartialWinners.length === 0 && (
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
                            <button onClick={() => setShowConfirmation(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">{t('cancel')}</button>
                            <button onClick={() => { if(confirmationAction) confirmationAction(); setShowConfirmation(false); }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">{t('confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
            
            <Dialog open={isTicketModalOpen} onOpenChange={closeTicketModal}>
                <DialogContent className="w-auto max-w-xs p-0 border-0 bg-transparent shadow-none font-sans">
                     <DialogHeader><DialogTitle className="sr-only">{t('raffleTicket')}</DialogTitle></DialogHeader>
                     {ticketInfo && (
                        <div>
                            <div ref={ticketModalRef} className="bg-white p-2 rounded-lg shadow-lg font-mono text-gray-800 text-[11px] relative overflow-hidden" style={{width: '280px'}}>
                                <div className="absolute inset-0 flex items-center justify-center z-0 opacity-50">
                                    <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none flex items-center gap-1"><span>RIFA⚡EXPRESS</span></p>
                                </div>
                                <div className="relative z-10">
                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold">RIFA⚡EXPRESS</h3>
                                        <p>{t('reference')}: {ticketInfo.raffleRef}</p>
                                        <p className="font-semibold">{t('purchaseReceipt')}</p>
                                    </div>
                                    <p className="text-center text-xs mb-4">{ticketInfo.timestamp?.toDate ? format(ticketInfo.timestamp.toDate(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale: language === 'es' ? es : enUS }) : t('dateNotAvailable')}</p>
                                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                                    <div className="space-y-1"><div className="flex justify-between"><span>{t('client')}:</span><span className="font-semibold text-right">{ticketInfo.name}</span></div></div>
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
                                <Button onClick={handleDownloadTicket} className="w-full bg-purple-500 text-white">{t('downloadTicket')}</Button>
                                <Button onClick={handleShareTicket} className="w-full bg-green-500 text-white flex items-center justify-center gap-2"><WhatsappIcon/>{t('share')}</Button>
                                <Button onClick={closeTicketModal} variant="outline" className="w-full bg-white/80">{t('close')}</Button>
                            </DialogFooter>
                        </div>
                     )}
                </DialogContent>
            </Dialog>

            <Dialog open={isSuperAdminLoginOpen} onOpenChange={setIsSuperAdminLoginOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('superAdminLogin')}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="super-admin-password">{t('password')}</Label>
                        <div className="relative">
                            <Input id="super-admin-password" type={showSuperAdminPassword ? 'text' : 'password'} value={superAdminPassword} onChange={(e) => setSuperAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSuperAdminLogin()}/>
                            <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}>{showSuperAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                    </div>
                    <DialogFooter><Button type="button" onClick={handleSuperAdminLogin}>{t('login')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('recoverAdminAccess')}</DialogTitle>
                        <DialogDescription>{t('recoverAdminAccessDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="admin-ref-search" className="text-right">{t('reference')}</Label>
                            <Input id="admin-ref-search" value={adminRefSearch} onChange={(e) => setAdminRefSearch(e.target.value)} className="col-span-3" placeholder="Ej: JM1"/>
                        </div>
                        {!isSuperAdmin && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="admin-phone-search" className="text-right">{t('phone')}</Label>
                                    <div className="relative col-span-3">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">+57</span></div>
                                        <Input id="admin-phone-search" type="tel" value={adminPhoneSearch} onChange={(e) => setAdminPhoneSearch(e.target.value.replace(/\D/g, ''))} className="pl-12" placeholder="3001234567"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="admin-password-search" className="text-right">{t('password')}</Label>
                                    <Input id="admin-password-search" type="password" value={adminPasswordSearch} onChange={(e) => setAdminPasswordSearch(e.target.value)} className="col-span-3" placeholder={t('yourPassword')}/>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAdminLoginOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" onClick={() => handleAdminSearch({ refToSearch: adminRefSearch, isPublicSearch: true })}>{t('recover')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPublicSearchOpen} onOpenChange={setIsPublicSearchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('searchRaffleByRef')}</DialogTitle>
                        <DialogDescription>{t('searchRaffleByRefDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="public-ref-search" className="text-right">{t('reference')}</Label>
                            <Input id="public-ref-search" value={publicRefSearch} onChange={(e) => setPublicRefSearch(e.target.value)} className="col-span-3" placeholder="Ej: JM1"/>
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
                        <DialogDescription>{t('salesCollectionDescription')}</DialogDescription>
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
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsSalesModalOpen(false)}>{t('close')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('shareRaffle')}</DialogTitle>
                        <DialogDescription>{t('shareRaffleAppDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        <Button onClick={() => handleShareToWhatsApp()} className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"><WhatsappIcon /><span>{t('shareOnWhatsApp')}</span></Button>
                        <Button onClick={() => handleShareToFacebook()} className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"><FacebookIcon /><span>{t('shareOnFacebook')}</span></Button>
                        <Button onClick={() => handleSharePrizePhoto()} className="w-full bg-yellow-500 text-white hover:bg-yellow-600 flex items-center justify-center gap-2"><Camera className="h-5 w-5" /><span>{t('sendPrizePhoto')}</span></Button>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>{t('close')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center">{t('shareWithQR')}</DialogTitle>
                        <DialogDescription className="text-center">{t('shareWithQRDescription')}</DialogDescription>
                    </DialogHeader>
                    {appUrl && (
                        <div className="flex justify-center items-center p-4">
                            <div className="relative inline-block p-4 bg-white rounded-lg shadow-md">
                                <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}&qzone=1&ecc=H`} alt={t('appQRCodeAlt')} width={200} height={200}/>
                                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"><span className="font-bold text-5xl text-yellow-500">⚡</span></div>
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
                        <DialogDescription>{t('confirmActivationDescription')}</DialogDescription>
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

            <Dialog open={isSupportContactDialogOpen} onOpenChange={setIsSupportContactDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('secondaryContact')}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="new-support-contact-input">{t('addNewContact')}</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">+57</span></div>
                                <Input id="new-support-contact-input" type="tel" value={newSupportContact} onChange={(e) => setNewSupportContact(e.target.value.replace(/\D/g, ''))} placeholder="3001234567" className="pl-12"/>
                            </div>
                            <Button onClick={handleAddSupportContact} disabled={!newSupportContact}>{t('add')}</Button>
                        </div>
                        <div className="space-y-2 mt-4">
                             <Label>{t('savedContacts')}</Label>
                             {Array.isArray(supportContacts) && supportContacts.length > 0 ? (
                                supportContacts.map((contact, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                                        <span>+57 {contact}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSupportContact(contact)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))
                             ) : (<p className="text-sm text-gray-500">{t('noSavedContacts')}</p>)}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSupportContactDialogOpen(false)}>{t('cancel')}</Button>
                        <Button type="button" onClick={handleSaveSupportContacts}>{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('contact')}</DialogTitle>
                        <DialogDescription>{t('contactDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        {Array.isArray(appSettings.supportContacts) && appSettings.supportContacts?.map((contact, index) => (
                            <Button
                                key={index}
                                onClick={() => { window.open(`https://wa.me/57${contact}`, '_blank'); setIsContactDialogOpen(false); }}
                                className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                            >
                                <WhatsappIcon />
                                <span>{t('assignReference')} {appSettings.supportContacts.length > 1 ? index + 1 : ''}</span>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isChangePasswordDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setNewPassword(''); setConfirmNewPassword(''); setShowNewPassword(false); } setIsChangePasswordDialogOpen(isOpen); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changePasswordTitle')}</DialogTitle>
                        <DialogDescription>{t('changePasswordDescription', { ref: raffleToChangePassword?.raffleRef })}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="grid gap-2">
                             <Label htmlFor="current-password">{t('currentPassword')}</Label>
                             <div className="relative">
                                 <Input id="current-password" type="text" readOnly value={raffleToChangePassword?.password || ''} />
                                 <Button variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7" onClick={() => navigator.clipboard.writeText(raffleToChangePassword?.password || '')}><Copy className="h-4 w-4" /></Button>
                             </div>
                         </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">{t('newPassword')}</Label>
                            <div className="relative">
                                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/>
                                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-new-password">{t('confirmNewPassword')}</Label>
                             <div className="relative">
                                <Input id="confirm-new-password" type={showNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}/>
                                 <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)}>{t('cancel')}</Button><Button onClick={handleChangePassword}>{t('changePasswordButton')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuperAdminChangePasswordOpen} onOpenChange={(isOpen) => { if (!isOpen) { setNewPassword(''); setConfirmNewPassword(''); setShowNewPassword(false); } setIsSuperAdminChangePasswordOpen(isOpen); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changeExecutivePasswordTitle')}</DialogTitle>
                        <DialogDescription>{t('changeExecutivePasswordDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-super-admin-password">{t('newPassword')}</Label>
                            <div className="relative">
                                <Input id="new-super-admin-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/>
                                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-new-super-admin-password">{t('confirmNewPassword')}</Label>
                            <div className="relative">
                                <Input id="confirm-new-super-admin-password" type={showNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}/>
                                 <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsSuperAdminChangePasswordOpen(false)}>{t('cancel')}</Button><Button onClick={handleChangeSuperAdminPassword}>{t('changePasswordButton')}</Button></DialogFooter>
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
                                <Input id="payment-link-two-digit" value={paymentLinks.twoDigit} onChange={(e) => setPaymentLinks(p => ({ ...p, twoDigit: e.target.value }))}/>
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, twoDigit: '' }))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-link-three-digit">{t('paymentLinkThreeDigit')}</Label>
                            <div className="flex gap-2">
                                <Input id="payment-link-three-digit" value={paymentLinks.threeDigit} onChange={(e) => setPaymentLinks(p => ({ ...p, threeDigit: e.target.value }))}/>
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, threeDigit: '' }))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-link-infinite">{t('paymentLinkInfinite')}</Label>
                             <div className="flex gap-2">
                                <Input id="payment-link-infinite" value={paymentLinks.infinite} onChange={(e) => setPaymentLinks(p => ({ ...p, infinite: e.target.value }))}/>
                                <Button variant="ghost" size="icon" onClick={() => setPaymentLinks(p => ({ ...p, infinite: '' }))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsPaymentLinksDialogOpen(false)}>{t('cancel')}</Button><Button onClick={handleSavePaymentLinks}>{t('save')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyOptionsDialogOpen} onOpenChange={setIsCopyOptionsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('activationOptionsTitle')}</DialogTitle>
                        <DialogDescription>{t('activationOptionsDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-3 py-4">
                        <Button onClick={() => { setIsCopyOptionsDialogOpen(false); setIsPaymentQrDialogOpen(true); }} className="w-full bg-black hover:bg-gray-900 text-white font-bold flex items-center gap-2 justify-center"><QrCode className="h-5 w-5" />{t('payWithQr')}</Button>
                        <Button onClick={() => { const line1 = (appSettings.bankInfoLine1 || 'Banco Caja Social: 24096711314').split(':').pop()?.trim() || ''; navigator.clipboard.writeText(line1); showNotification(t('accountNumberCopied'), 'success'); setIsCopyOptionsDialogOpen(false); }}>{t('copyAccountNumber')}</Button>
                        <Button onClick={() => { const line2 = (appSettings.bankInfoLine2 || 'llave Bre-B @AMIGO1045715054'); const match = line2.match(/(@\S+)/); const keyToCopy = match ? match[0] : line2; if (keyToCopy) { navigator.clipboard.writeText(keyToCopy); showNotification(t('brebKeyCopied'), 'success'); } setIsCopyOptionsDialogOpen(false); }}>{t('copyBrebKey')}</Button>
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
                            <Input id="price-two-digit" value={activationPrices.twoDigit} onChange={(e) => setActivationPrices(p => ({ ...p, twoDigit: e.target.value }))} placeholder="Ej: 12.000"/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price-three-digit">{t('activationPriceThreeDigit')}</Label>
                            <Input id="price-three-digit" value={activationPrices.threeDigit} onChange={(e) => setActivationPrices(p => ({ ...p, threeDigit: e.target.value }))} placeholder="Ej: 15.000"/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price-infinite">{t('activationPriceInfinite')}</Label>
                            <Input id="price-infinite" value={activationPrices.infinite} onChange={(e) => setActivationPrices(p => ({ ...p, infinite: e.target.value }))} placeholder="Ej: 30.000"/>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsActivationPricesDialogOpen(false)}>{t('cancel')}</Button><Button onClick={handleSaveActivationPrices}>{t('save')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFreeGamesDialogOpen} onOpenChange={setIsFreeGamesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('manageFreeGames')}</DialogTitle>
                        <DialogDescription>{t('manageFreeGamesDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="free-two-digit">{t('freeTwoDigit')}</Label>
                            <Switch id="free-two-digit" checked={freeGamesConfig.twoDigit} onCheckedChange={(checked) => setFreeGamesConfig(p => ({ ...p, twoDigit: checked }))}/>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="free-three-digit">{t('freeThreeDigit')}</Label>
                            <Switch id="free-three-digit" checked={freeGamesConfig.threeDigit} onCheckedChange={(checked) => setFreeGamesConfig(p => ({ ...p, threeDigit: checked }))}/>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="free-infinite">{t('freeInfinite')}</Label>
                            <Switch id="free-infinite" checked={freeGamesConfig.infinite} onCheckedChange={(checked) => setFreeGamesConfig(p => ({ ...p, infinite: checked }))}/>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsFreeGamesDialogOpen(false)}>{t('cancel')}</Button><Button onClick={handleSaveFreeGamesSettings}>{t('save')}</Button></DialogFooter>
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
                            <Input id="payment-info-line1" value={paymentInfo.line1} onChange={(e) => setPaymentInfo(p => ({ ...p, line1: e.target.value }))}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment-info-line2">{t('bankInfoLine2Label')}</Label>
                            <Input id="payment-info-line2" value={paymentInfo.line2} onChange={(e) => setPaymentInfo(p => ({ ...p, line2: e.target.value }))}/>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsPaymentInfoDialogOpen(false)}>{t('cancel')}</Button><Button onClick={handleSavePaymentInfo}>{t('save')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isAssignPackageDialogOpen} onOpenChange={setIsAssignPackageDialogOpen}>
                <DialogContent className="max-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('assignPackage')}</DialogTitle>
                        <DialogDescription>{t('assignPackageDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="grid gap-2 flex-1 w-full">
                                <Label htmlFor="package-quantity">{t('quantity')}</Label>
                                <Input id="package-quantity" type="number" value={packageQuantity} onChange={(e) => setPackageQuantity(Number(e.target.value))} placeholder="e.g., 100"/>
                            </div>
                            <div className="grid gap-2 flex-1 w-full">
                                <Label htmlFor="package-raffle-mode">{t('raffleType')}</Label>
                                <Select onValueChange={(value: RaffleMode) => setPackageRaffleMode(value)} defaultValue={packageRaffleMode}>
                                    <SelectTrigger id="package-raffle-mode"><SelectValue placeholder={t('raffleType')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="two-digit">{t('2digitMode')}</SelectItem>
                                        <SelectItem value="three-digit">{t('3digitMode')}</SelectItem>
                                        <SelectItem value="infinite">{t('infiniteRaffle')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleGeneratePackage} disabled={isGenerating}>{isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('generate')}</Button>
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">{t('generatedReferences')}</h4>
                                {generatedPackage.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="destructive" size="sm" onClick={handleDeleteAllGeneratedRefs}><Trash2 className="mr-2 h-3 w-3" />{t('deleteAll')}</Button>
                                        <Button variant="outline" size="sm" onClick={() => { const textToCopy = generatedPackage.map(p => `Referencia: ${p.ref}, Enlace de Administrador: ${p.url}`).join('\n'); navigator.clipboard.writeText(textToCopy); showNotification(t('listCopied'), 'success'); }}><Copy className="mr-2 h-3 w-3" />{t('copyList')}</Button>
                                    </div>
                                )}
                            </div>
                            <ScrollArea className="h-64 mt-2 border rounded-md p-4 bg-gray-50/50">
                                {isGenerating ? (<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>) : generatedPackage.length > 0 ? (
                                    <div className="space-y-3 text-sm">
                                        {generatedPackage.map((p) => (
                                            <div key={p.ref} className="p-2 bg-white rounded-md border space-y-1">
                                                <div className="flex justify-between items-center"><div><span className="font-semibold">Referencia:</span> <span className="font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{p.ref}</span></div></div>
                                                <div className="flex items-center gap-2">
                                                    <Input readOnly value={p.url} className="text-xs h-8" />
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(p.url); showNotification(t('linkCopied'), 'success'); }}><Copy className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={() => handleDeleteGeneratedRef(p.ref)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (<p className="text-muted-foreground text-center pt-8">{t('generateToSeeRefs')}</p>)}
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('goalTitle')}</DialogTitle>
                        <DialogDescription>{t('goalDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg"><p className="font-semibold text-gray-600">{t('prizeValue')}:</p><p className="font-bold text-xl text-gray-800">{formatValue(raffleState.prize)}</p></div>
                        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg"><p className="font-semibold text-gray-600">{t('ticketValue')}:</p><p className="font-bold text-xl text-gray-800">{formatValue(raffleState.value)}</p></div>
                        <div className="flex justify-between items-center bg-green-100 p-4 rounded-lg"><p className="font-semibold text-green-800">{t('ticketsToCoverPrize')}:</p><p className="font-bold text-2xl text-green-800">{ticketsToCoverPrize.toLocaleString(language === 'es' ? 'es-CO' : 'en-US')}</p></div>
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsGoalModalOpen(false)}>{t('close')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentQrDialogOpen} onOpenChange={setIsPaymentQrDialogOpen}>
                <DialogContent className="max-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">{t('payWithQr')}</DialogTitle>
                        <DialogDescription className="text-center">{t('scanQrToPay')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center p-4">
                        {appSettings.paymentQrImageUrl ? (
                            <div className="relative inline-block bg-white rounded-lg shadow-md"><Image src={appSettings.paymentQrImageUrl} alt={t('paymentQrCodeAlt')} width={400} height={400} className="object-contain" unoptimized /></div>
                        ) : (<div className="text-muted-foreground bg-gray-100 p-8 rounded-lg flex items-center justify-center h-[300px] w-[300px]"><p>{t('noPrizeImage')}</p></div>)}
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsPaymentQrDialogOpen(false)}>{t('close')}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentQrImageDialogOpen} onOpenChange={setIsPaymentQrImageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('managePaymentQrImage')}</DialogTitle>
                        <DialogDescription>{t('managePaymentQrImageDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {isUploading && (<div className="flex justify-center items-center p-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">{t('uploadingImage')}...</span></div>)}
                        <div className="grid gap-2">
                            <Label htmlFor="payment-qr-image-url">{t('paymentQrImageUrlLabel')}</Label>
                            <Input id="payment-qr-image-url" value={paymentQrImageUrl} onChange={(e) => setPaymentQrImageUrl(e.target.value)} placeholder="https://example.com/qr.png" disabled={isUploading}/>
                        </div>
                        {paymentQrImageUrl && (
                            <div className="mt-4 p-4 border rounded-lg bg-gray-50 flex flex-col items-center gap-2">
                                <Label>{t('preview')}</Label>
                                <div className="relative inline-block bg-white rounded-lg shadow-md"><Image key={paymentQrImageUrl} src={paymentQrImageUrl} alt={t('paymentQrCodeAlt')} width={200} height={200} className="object-contain" unoptimized /></div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentQrImageDialogOpen(false)} disabled={isUploading}>{t('cancel')}</Button>
                        <Button onClick={handleSavePaymentQrImage} disabled={isUploading || !paymentQrImageUrl}>{isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPrizeImageModalOpen} onOpenChange={setIsPrizeImageModalOpen}>
                <DialogContent className="max-w-4xl w-auto bg-transparent border-none shadow-none p-2">
                    <DialogHeader><DialogTitle className="sr-only">{raffleState.prize || t('rafflePrizeAlt')}</DialogTitle></DialogHeader>
                    {raffleState.prizeImageUrl && (<Image src={raffleState.prizeImageUrl} alt={raffleState.prize || t('rafflePrizeAlt')} width={1920} height={1080} className="rounded-lg object-contain max-h-[90vh] w-auto h-auto" unoptimized />)}
                </DialogContent>
            </Dialog>

            <Dialog open={isCaptureDialogOpen} onOpenChange={(open) => !open && stopCamera()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{t('takePrizePhoto')}</DialogTitle></DialogHeader>
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        {capturedImageBlob ? (<Image src={URL.createObjectURL(capturedImageBlob)} alt={t('capturedPrizePhotoAlt')} fill className="object-cover" unoptimized />) : (
                            <>
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                {captureCountdown !== null && (<div className="absolute inset-0 flex items-center justify-center bg-black/30"><span className="text-8xl font-bold text-white drop-shadow-lg animate-ping">{captureCountdown > 0 ? captureCountdown : '📸'}</span></div>)}
                            </>
                        )}
                        {isUploading && (<div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white mb-2" /><p className="text-white text-sm">{t('uploadingImage')}...</p></div>)}
                    </div>
                    <DialogFooter className="flex-row justify-center gap-4 sm:justify-center">
                         {!capturedImageBlob && (<Button variant="outline" onClick={stopCamera}>{t('cancel')}</Button>)}
                        {capturedImageBlob && (<div className="flex flex-col items-center gap-2"><p className="text-sm font-semibold text-green-600 animate-pulse">{t('imageUploadedSuccess')}</p><p className="text-xs text-gray-500">{t('uploadingImage')}...</p></div>)}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default App;
