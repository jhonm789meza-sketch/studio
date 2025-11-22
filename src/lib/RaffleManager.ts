
import { doc, getDoc, setDoc, increment, updateDoc, DocumentReference, runTransaction, collection, getDocs, writeBatch } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

type RaffleMode = 'two-digit' | 'three-digit' | 'infinite';

interface NextRaffleInfo {
    refs: string[];
    count: number;
}

class RaffleManager {
    private db: Firestore;

    constructor(db: Firestore) {
        this.db = db;
    }

    private getUsedNumbersRef(mode: RaffleMode): DocumentReference {
        return doc(this.db, 'internal', `usedNumbers_${mode}`);
    }

    private getCounterRef(mode: RaffleMode): DocumentReference {
        return doc(this.db, 'internal', `raffleCounter_${mode}`);
    }

    public async getNextRefInfo(mode: RaffleMode, peek: boolean = false, count: number = 1): Promise<{ numbers: number[], playedCount: number }> {
        if (typeof window === 'undefined') {
            return { numbers: Array.from({ length: count }, (_, i) => i + 1), playedCount: 0 };
        }
        
        const counterRef = this.getCounterRef(mode);

        try {
            let nextNumbers: number[] = [];
            let playedCount = 0;

            const counterDoc = await getDoc(counterRef);
            playedCount = counterDoc.exists() ? counterDoc.data().count : 0;

            let min: number, max: number;
            switch (mode) {
                case 'two-digit':
                    min = 0;
                    max = 99;
                    break;
                case 'three-digit':
                    min = 0;
                    max = 999;
                    break;
                case 'infinite':
                    min = 100000;
                    max = 999999;
                    break;
            }
            
            for (let i = 0; i < count; i++) {
                const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                nextNumbers.push(randomNumber);
            }

            if (!peek) {
                await updateDoc(counterRef, { count: increment(count) }).catch(async (err) => {
                     // If document doesn't exist, create it.
                    if (err.code === 'not-found') {
                        await setDoc(counterRef, { count: count });
                    }
                });
            }
            
            return { numbers: nextNumbers, playedCount };

        } catch (error) {
            console.error(`Error in getNextRefInfo for mode ${mode}:`, error);
            // Fallback to a simple random number if transaction fails
            return { numbers: [Math.floor(Math.random() * 1000)], playedCount: 0 };
        }
    }

    public async createNewRaffleRef(mode: RaffleMode, peek: boolean = false, isManualActivation: boolean = false): Promise<string> {
        if (typeof window === 'undefined') {
            return 'JM-SERVER';
        }
        
        const shouldConsume = !peek && !isManualActivation;
        const { numbers: [nextNumber] } = await this.getNextRefInfo(mode, !shouldConsume, 1);
        
        const prefix = 'JM';
        let numStr = '';

        switch (mode) {
            case 'two-digit':
                numStr = String(nextNumber).padStart(2, '0');
                break;
            case 'three-digit':
                numStr = String(nextNumber).padStart(3, '0');
                break;
            case 'infinite':
                numStr = String(nextNumber);
                break;
        }
        
        return `${prefix}${numStr}`;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 5): Promise<NextRaffleInfo> {
        const { numbers, playedCount } = await this.getNextRefInfo(mode, true, count);
        
        let refs: string[];
        const prefix = 'JM';
        
        switch (mode) {
            case 'two-digit':
                refs = numbers.map(num => `${prefix}${String(num).padStart(2, '0')}`);
                break;
            case 'three-digit':
                refs = numbers.map(num => `${prefix}${String(num).padStart(3, '0')}`);
                break;
            case 'infinite':
                refs = numbers.map(num => `${prefix}${num}`);
                break;
        }

        return { refs, count: playedCount };
    }

    public async resetCounters(): Promise<void> {
        if (typeof window !== 'undefined') {
            const batch = writeBatch(this.db);
            const modes: RaffleMode[] = ['two-digit', 'three-digit', 'infinite'];
            for (const mode of modes) {
                batch.set(this.getCounterRef(mode), { count: 0 });
                batch.set(this.getUsedNumbersRef(mode), { numbers: [] });
            }
            await batch.commit();
        }
    }
}

export { RaffleManager };
export type { NextRaffleInfo };
