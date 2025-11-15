import { doc, getDoc, setDoc, increment, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { persistenceEnabled } from './firebase';

type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';

class RaffleManager {
    private db: Firestore;
    private counterRefEven: DocumentReference;
    private counterRefOdd: DocumentReference;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRefEven = doc(this.db, 'internal', 'raffleCounterEven');
        this.counterRefOdd = doc(this.db, 'internal', 'raffleCounterOdd');
    }

    private getCounterRef(mode: RaffleMode): DocumentReference {
        return mode === 'two-digit' ? this.counterRefEven : this.counterRefOdd;
    }

    public async getNextRefNumber(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false, count: number = 1): Promise<number[]> {
        if (typeof window === 'undefined') {
            return Array.from({ length: count }, (_, i) => i + 1);
        }

        if (persistenceEnabled) {
            await persistenceEnabled;
        }

        const counterRef = this.getCounterRef(mode);
        
        try {
            const docSnap = await getDoc(counterRef);
            let currentCount = 0;
            if (docSnap.exists()) {
                currentCount = docSnap.data()?.count || 0;
            } else if (!peek) {
                 await setDoc(counterRef, { count: 0 });
            }

            const nextNumbers: number[] = [];
            let incrementBy = 0;

            for (let i = 0; i < count; i++) {
                nextNumbers.push(currentCount + (i * 2) + (mode === 'two-digit' ? 2 : 1));
                incrementBy += 2;
            }
            
            if (!peek) {
                 if (docSnap.exists()) {
                    await updateDoc(counterRef, { count: increment(incrementBy) });
                } else {
                    await setDoc(counterRef, { count: incrementBy });
                }
            }
            
            return nextNumbers;

        } catch (error) {
            console.error("Error getting next ref number:", error);
            return [Math.floor(Math.random() * 1000)];
        }
    }

    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const [nextNumber] = await this.getNextRefNumber(mode, peek, isManualActivation);
        const ref = `JM${nextNumber}`;
        return ref;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 1): Promise<string[]> {
        const nextNumbers = await this.getNextRefNumber(mode, true, false, count);
        return nextNumbers.map(num => `JM${num}`);
    }

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRefEven, { count: 0 });
            await setDoc(this.counterRefOdd, { count: -1 });
        }
    }
}

export { RaffleManager };
