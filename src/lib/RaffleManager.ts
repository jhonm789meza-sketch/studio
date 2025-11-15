import { doc, getDoc, setDoc, increment, updateDoc, DocumentReference, runTransaction } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { persistenceEnabled } from './firebase';

type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';

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

    public async getNextRefNumber(mode: RaffleMode, peek: boolean = false, count: number = 1): Promise<number[]> {
        if (typeof window === 'undefined') {
            return Array.from({ length: count }, (_, i) => i + 1);
        }

        if (persistenceEnabled) {
            await persistenceEnabled;
        }

        const counterRef = this.getCounterRef(mode);
        const isEvenMode = mode === 'two-digit';
        const isOddMode = mode === 'three-digit';

        try {
            let nextNumbers: number[] = [];
            
            if (peek) {
                 const docSnap = await getDoc(counterRef);
                 let currentCount: number;
                 if (docSnap.exists()) {
                     currentCount = docSnap.data()?.count || (isEvenMode ? 0 : isOddMode ? 1 : 1);
                 } else {
                     currentCount = isEvenMode ? 0 : isOddMode ? 1 : 1;
                 }

                 for (let i = 0; i < count; i++) {
                     if (isEvenMode || isOddMode) {
                        nextNumbers.push(currentCount + (i * 2));
                     } else { // infinite
                        nextNumbers.push(currentCount + i);
                     }
                 }
            } else {
                 await runTransaction(this.db, async (transaction) => {
                    const docSnap = await transaction.get(counterRef);
                    let currentCount: number;
                    if (docSnap.exists()) {
                        currentCount = docSnap.data()?.count || (isEvenMode ? 0 : isOddMode ? 1 : 1);
                    } else {
                        currentCount = isEvenMode ? 0 : isOddMode ? 1 : 1;
                    }


                    nextNumbers = [];
                    let newCount: number;

                    if (isEvenMode || isOddMode) {
                        for (let i = 0; i < count; i++) {
                            nextNumbers.push(currentCount + (i * 2));
                        }
                        newCount = currentCount + (count * 2);
                    } else { // infinite
                         for (let i = 0; i < count; i++) {
                            nextNumbers.push(currentCount + i);
                        }
                        newCount = currentCount + count;
                    }
                    
                    transaction.set(counterRef, { count: newCount }, { merge: true });
                });
            }
            
            return nextNumbers;

        } catch (error) {
            console.error("Error getting next ref number:", error);
            // Fallback to a random number in case of transaction failure
            const randomBase = Math.floor(Math.random() * 1000);
            if (isEvenMode) return [randomBase * 2];
            if (isOddMode) return [randomBase * 2 + 1];
            return [randomBase];
        }
    }

    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
             return 'JM-SERVER';
        }
        const [nextNumber] = await this.getNextRefNumber(mode, peek || isManualActivation, 1);
        
        if (mode === 'infinite') {
            return `JM∞${nextNumber}`;
        }
        
        const ref = `JM${nextNumber}`;
        return ref;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 2): Promise<string[]> {
        const nextNumbers = await this.getNextRefNumber(mode, true, count);
        if (mode === 'infinite') {
            return nextNumbers.map(num => `JM∞${num}`);
        }
        return nextNumbers.map(num => `JM${num}`);
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
