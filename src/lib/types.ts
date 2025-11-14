
export interface Participant {
    id: number;
    name: string;
    phoneNumber: string;
    raffleNumber: string;
    timestamp: Date | any; // Allow for Firebase Timestamp
    paymentStatus: 'pending' | 'confirmed';
    isHouse?: boolean;
    raffleRef?: string;
}

export interface PendingActivation {
    id: string;
    transactionId: string;
    raffleMode: 'two-digit' | 'three-digit' | 'infinite';
    status: 'pending' | 'completed';
    createdAt: any; // Allow for Firebase Timestamp
}


export interface Raffle {
    drawnNumbers: any[];
    lastDrawnNumber: null;
    prize: string;
    value: string;
    isWinnerConfirmed: boolean;
    isDetailsConfirmed: boolean;
    name: string;
    phoneNumber: string;
    raffleNumber: string;
    nequiAccountNumber: string;
    isNequiEnabled: boolean;
    isPaymentLinkEnabled: boolean;
    paymentLink: string;
    gameDate: string;
    lottery: string;
    customLottery: string;
    organizerName: string;
    organizerPhoneNumber: string;
    password?: string;
    participants: Participant[];
    raffleRef: string;
    winner: null | Participant;
    manualWinnerNumber: string;
    manualWinnerNumber3: string;
    manualWinnerNumber2: string;
    isPaid: boolean;
    adminId: null | string;
    raffleMode: 'two-digit' | 'three-digit' | 'infinite';
    prizeImageUrl: string;
    imageGenPrompt: string;
    currencySymbol: string;
    infiniteModeDigits?: number;
    partialWinnerPercentage3?: number;
    partialWinnerPercentage2?: number;
    sharePrize?: boolean;
    automaticDraw?: boolean;
    allowPartialWinners?: boolean;
}

    

    

