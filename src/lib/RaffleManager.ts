
import { doc, getDoc, setDoc, increment, updateDoc, DocumentReference, runTransaction } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { persistenceEnabled } from './firebase';

type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';

interface NextRaffleInfo {
    refs: string[];
    count: number;
}

class RaffleManager {
    private db: Firestore;
    private counterRefEven: DocumentReference;
    private counterRefOdd: DocumentReference;
    private counterRefInfinite: DocumentReference;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRefEven = doc(this.db, 'internal', 'raffleCounterEven');
        this.counterRefOdd = doc(this.db, 'internal', 'raffleCounterOdd');
        this.counterRefInfinite = doc(this.db, 'internal', 'raffleCounterInfinite');
    }

    private getCounterRef(mode: RaffleMode): DocumentReference {
        switch (mode) {
            case 'two-digit':
                return this.counterRefEven;
            case 'three-digit':
                return this.counterRefOdd;
            case 'infinite':
                return this.counterRefInfinite;
        }
    }
    
    public async getNextRefInfo(mode: RaffleMode, peek: boolean = false, count: number = 1): Promise<{ numbers: number[], playedCount: number }> {
        if (typeof window === 'undefined') {
             return { numbers: Array.from({ length: count }, (_, i) => i + 1), playedCount: 0 };
        }

        if (persistenceEnabled) {
            await persistenceEnabled;
        }

        const counterRef = this.getCounterRef(mode);
        const isEvenMode = mode === 'two-digit';
        const isOddMode = mode === 'three-digit';

        try {
            let nextNumbers: number[] = [];
            let playedCount = 0;
            
            await runTransaction(this.db, async (transaction) => {
                const docSnap = await transaction.get(counterRef);
                let currentCount: number;

                if (docSnap.exists() && typeof docSnap.data()?.count === 'number') {
                    currentCount = docSnap.data().count;
                } else {
                    // Initialize counter if it doesn't exist or is invalid
                    if (isEvenMode) currentCount = 0;
                    else if (isOddMode) currentCount = 1;
                    else currentCount = 1; // Infinite mode
                }

                if (isEvenMode) {
                    playedCount = currentCount / 2;
                } else if (isOddMode) {
                    playedCount = Math.floor(currentCount / 2);
                } else { // infinite
                    playedCount = currentCount > 0 ? currentCount - 1 : 0;
                }

                nextNumbers = [];
                let numberCursor = currentCount;
                for (let i = 0; i < count; i++) {
                    nextNumbers.push(numberCursor);
                    if (isEvenMode || isOddMode) {
                        numberCursor += 2;
                    } else { // infinite
                        numberCursor += 1;
                    }
                }

                if (!peek) {
                    const incrementBy = isEvenMode || isOddMode ? (count * 2) : count;
                    const newCount = currentCount + incrementBy;
                    transaction.set(counterRef, { count: newCount }, { merge: true });
                }
            });
            
            return { numbers: nextNumbers, playedCount };

        } catch (error) {
            console.error(`Error in getNextRefInfo for mode ${mode}:`, error);
            // Fallback to a random number to avoid complete failure, although transactions should prevent this.
            const randomBase = Date.now();
            if (isEvenMode) return { numbers: [randomBase - (randomBase % 2)], playedCount: 0 };
            if (isOddMode) return { numbers: [randomBase - (randomBase % 2) + 1], playedCount: 0 };
            return { numbers: [randomBase], playedCount: 0 };
        }
    }

    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        
        // When not peeking, we want to consume exactly one number.
        // isManualActivation peeks, it does not consume.
        const shouldConsume = !peek && !isManualActivation;
        const { numbers: [nextNumber] } = await this.getNextRefInfo(mode, !shouldConsume, 1);
        
        if (mode === 'infinite') {
            return `JM∞${nextNumber}`;
        }
        
        return `JM${nextNumber}`;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 2): Promise<NextRaffleInfo> {
        const { numbers, playedCount } = await this.getNextRefInfo(mode, true, count);
        let refs: string[];

        if (mode === 'infinite') {
            refs = numbers.map(num => `JM∞${num}`);
        } else {
            refs = numbers.map(num => `JM${num}`);
        }
        return { refs, count: playedCount };
    }

    public async resetCounters(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRefEven, { count: 0 });
            await setDoc(this.counterRefOdd, { count: 1 });
            await setDoc(this.counterRefInfinite, { count: 1 });
        }
    }
}

export { RaffleManager };
export type { NextRaffleInfo };
