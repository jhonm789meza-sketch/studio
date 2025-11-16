
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
    private usedRandomNumbersRef: DocumentReference;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRefEven = doc(this.db, 'internal', 'raffleCounterEven');
        this.counterRefOdd = doc(this.db, 'internal', 'raffleCounterOdd');
        this.counterRefInfinite = doc(this.db, 'internal', 'raffleCounterInfinite');
        this.usedRandomNumbersRef = doc(this.db, 'internal', 'usedRandomNumbers');
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
        const isInfiniteMode = mode === 'infinite';

        try {
            let nextNumbers: number[] = [];
            let playedCount = 0;
            
            await runTransaction(this.db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                let currentCount: number;

                if (counterDoc.exists() && typeof counterDoc.data()?.count === 'number') {
                    currentCount = counterDoc.data().count;
                } else {
                    currentCount = isOddMode ? 1 : 0; 
                }
                
                if (isInfiniteMode) {
                     playedCount = currentCount;
                } else if (isEvenMode) {
                    playedCount = currentCount / 2;
                } else { // isOddMode
                    playedCount = (currentCount - 1) / 2;
                }

                nextNumbers = [];

                if (isInfiniteMode) {
                    const usedNumbersDoc = await transaction.get(this.usedRandomNumbersRef);
                    const usedNumbersData = usedNumbersDoc.data();
                    const usedNumbers = usedNumbersData && Array.isArray(usedNumbersData.numbers) ? usedNumbersData.numbers : [];
                    const usedNumbersSet = new Set(usedNumbers);

                    for (let i = 0; i < count; i++) {
                        let randomNumber;
                        do {
                            randomNumber = Math.floor(Math.random() * 900000) + 100000;
                        } while (usedNumbersSet.has(randomNumber));
                        
                        nextNumbers.push(randomNumber);
                        usedNumbersSet.add(randomNumber);
                    }

                    if (!peek) {
                        transaction.update(counterRef, { count: increment(count) });
                        const updatedUsedNumbers = [...usedNumbers, ...nextNumbers].slice(-5000); // Keep the list from growing indefinitely
                        transaction.set(this.usedRandomNumbersRef, { numbers: updatedUsedNumbers }, { merge: true });
                    }
                } else { // Sequential modes
                    let numberCursor = currentCount;
                    for (let i = 0; i < count; i++) {
                        nextNumbers.push(numberCursor);
                        numberCursor += 2;
                    }

                    if (!peek) {
                        const incrementBy = count * 2;
                        transaction.update(counterRef, { count: increment(incrementBy) });
                    }
                }
            });
            
            return { numbers: nextNumbers, playedCount };

        } catch (error) {
            console.error(`Error in getNextRefInfo for mode ${mode}:`, error);
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
            await setDoc(this.counterRefInfinite, { count: 0 });
            await setDoc(this.usedRandomNumbersRef, { numbers: [] });
        }
    }
}

export { RaffleManager };
export type { NextRaffleInfo };

    