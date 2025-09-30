
export interface Participant {
    id: number;
    name: string;
    phoneNumber: string;
    raffleNumber: string;
    timestamp: Date | any; // Allow for Firebase Timestamp
    paymentStatus: 'pending' | 'confirmed';
    isHouse?: boolean;
}
