import { doc, getDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { persistenceEnabled } from './firebase';

class RaffleManager {
    private db: Firestore;
    private counterRef;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRef = doc(this.db, 'internal', 'raffleCounter');
    }

    public async getNextRefNumber(peek: boolean = false): Promise<number> {
        if (typeof window === 'undefined') {
            return 1;
        }

        if (persistenceEnabled) {
            await persistenceEnabled;
        }
        
        try {
            const docSnap = await getDoc(this.counterRef);

            if (docSnap.exists()) {
                if (peek) {
                    return (docSnap.data()?.count || 0) + 1;
                }
                await updateDoc(this.counterRef, { count: increment(1) });
                const updatedSnap = await getDoc(this.counterRef);
                return updatedSnap.data()?.count || 1;
            } else {
                 if (peek) {
                    return 1;
                }
                await setDoc(this.counterRef, { count: 1 });
                return 1;
            }
        } catch (error) {
            console.error("Error getting next ref number:", error);
            return Math.floor(Math.random() * 1000);
        }
    }

    public async createNewRaffleRef(peek: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const nextNumber = await this.getNextRefNumber(peek);
        const ref = `JM${nextNumber}`;
        return ref;
    }
    
    public async peekNextRaffleRef(): Promise<string> {
        return this.createNewRaffleRef(true);
    }

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRef, { count: 0 });
        }
    }
}

export { RaffleManager };
