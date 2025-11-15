import { doc, getDoc, setDoc, increment, updateDoc, DocumentReference, runTransaction } from 'firebase/firestore';
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
        // 'two-digit' uses even, 'three-digit' and 'infinite' use odd
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
        const isEvenMode = mode === 'two-digit';

        try {
            let nextNumbers: number[] = [];
            
            if (peek) {
                 const docSnap = await getDoc(counterRef);
                 let currentCount = isEvenMode ? 0 : 1;
                 if (docSnap.exists()) {
                     currentCount = docSnap.data()?.count || currentCount;
                 }
                 for (let i = 0; i < count; i++) {
                     nextNumbers.push(currentCount + (i * 2));
                 }
            } else {
                 await runTransaction(this.db, async (transaction) => {
                    const docSnap = await transaction.get(counterRef);
                    let currentCount = isEvenMode ? 0 : 1;
                    if (docSnap.exists()) {
                        currentCount = docSnap.data()?.count || currentCount;
                    }

                    nextNumbers = [];
                    for (let i = 0; i < count; i++) {
                        nextNumbers.push(currentCount + (i * 2));
                    }
                    
                    const newCount = currentCount + (count * 2);
                    transaction.set(counterRef, { count: newCount }, { merge: true });
                });
            }
            
            return nextNumbers;

        } catch (error) {
            console.error("Error getting next ref number:", error);
            // Fallback to a random number in case of transaction failure
            const randomBase = Math.floor(Math.random() * 1000);
            return [isEvenMode ? randomBase * 2 : randomBase * 2 + 1];
        }
    }

    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const [nextNumber] = await this.getNextRefNumber(mode, peek, isManualActivation, 1);
        const ref = `JM${nextNumber}`;
        return ref;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 2): Promise<string[]> {
        const nextNumbers = await this.getNextRefNumber(mode, true, false, count);
        return nextNumbers.map(num => `JM${num}`);
    }

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            // Reset even counter to start at 0, next will be 0.
            await setDoc(this.counterRefEven, { count: 0 });
            // Reset odd counter to start at 1, next will be 1.
            await setDoc(this.counterRefOdd, { count: 1 });
        }
    }
}

export { RaffleManager };
