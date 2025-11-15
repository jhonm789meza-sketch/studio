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
        if (mode === 'two-digit') {
            return this.counterRefEven;
        }
        if (mode === 'three-digit') {
            return this.counterRefOdd;
        }
        return this.counterRefInfinite;
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
                 if (docSnap.exists()) {
                     currentCount = docSnap.data()?.count || (isEvenMode ? 0 : isOddMode ? 1 : 1);
                 } else {
                     currentCount = isEvenMode ? 0 : isOddMode ? 1 : 1;
                 }

                if (isEvenMode) {
                    playedCount = currentCount / 2;
                } else if (isOddMode) {
                    playedCount = Math.floor(currentCount / 2);
                } else { // infinite
                    playedCount = currentCount - 1;
                }


                nextNumbers = [];
                for (let i = 0; i < count; i++) {
                     if (isEvenMode || isOddMode) {
                        nextNumbers.push(currentCount + (i * 2));
                     } else { // infinite
                        nextNumbers.push(currentCount + i);
                     }
                 }

                if (!peek) {
                    let newCount: number;
                    if (isEvenMode || isOddMode) {
                        newCount = currentCount + (count * 2);
                    } else { // infinite
                        newCount = currentCount + count;
                    }
                    transaction.set(counterRef, { count: newCount }, { merge: true });
                }
            });
            
            return { numbers: nextNumbers, playedCount };

        } catch (error) {
            console.error("Error getting next ref number:", error);
            // Fallback to a random number in case of transaction failure
            const randomBase = Math.floor(Math.random() * 1000);
            if (isEvenMode) return { numbers: [randomBase * 2], playedCount: 0 };
            if (isOddMode) return { numbers: [randomBase * 2 + 1], playedCount: 0 };
            return { numbers: [randomBase], playedCount: 0 };
        }
    }


    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const { numbers: [nextNumber] } = await this.getNextRefInfo(mode, peek || isManualActivation, 1);
        
        if (mode === 'infinite') {
            return `JM∞${nextNumber}`;
        }
        
        const ref = `JM${nextNumber}`;
        return ref;
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

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRefEven, { count: 0 });
            await setDoc(this.counterRefOdd, { count: 1 });
            await setDoc(this.counterRefInfinite, { count: 1 });
        }
    }
}

export { RaffleManager };
export type { NextRaffleInfo };

    