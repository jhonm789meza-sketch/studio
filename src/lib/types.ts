
export interface Participant {
    id: number;
    name: string;
    phoneNumber: string;
    raffleNumber: string;
    timestamp: Date;
    paymentStatus: 'pending' | 'confirmed';
}
