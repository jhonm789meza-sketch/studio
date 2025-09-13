import { doc, getDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

class RaffleManager {
    private db: Firestore;
    private counterRef;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRef = doc(this.db, 'internal', 'raffleCounter');
    }

    public async getNextRefNumber(): Promise<number> {
        if (typeof window === 'undefined') {
            return 1;
        }
        
        try {
            const docSnap = await getDoc(this.counterRef);

            if (docSnap.exists()) {
                await updateDoc(this.counterRef, { count: increment(1) });
                const updatedSnap = await getDoc(this.counterRef);
                return updatedSnap.data()?.count || 1;
            } else {
                await setDoc(this.counterRef, { count: 1 });
                return 1;
            }
        } catch (error) {
            console.error("Error getting next ref number:", error);
            return Math.floor(Math.random() * 1000);
        }
    }

    public async createNewRaffleRef(): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const nextNumber = await this.getNextRefNumber();
        const ref = `JM${nextNumber}`;
        return ref;
    }

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRef, { count: 0 });
        }
    }
}

export { RaffleManager };
