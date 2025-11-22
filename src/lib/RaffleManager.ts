
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

    private getCounterRef(mode: RaffleMode): DocumentReference {
        return doc(this.db, 'internal', `raffleCounter_${mode}`);
    }

    public async getNextRefInfo(mode: RaffleMode, peek: boolean = false, count: number = 1): Promise<{ numbers: number[], playedCount: number }> {
        if (typeof window === 'undefined') {
            return { numbers: Array.from({ length: count }, (_, i) => i + 1), playedCount: 0 };
        }
        
        try {
            let nextNumbers: number[] = [];
            const playedCount = 0; // No longer tracking count from firestore

            // All modes will generate a large random number
            const min = 100000;
            const max = 999999;
            
            for (let i = 0; i < count; i++) {
                const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                nextNumbers.push(randomNumber);
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
        let numStr = String(nextNumber);
        
        return `${prefix}${numStr}`;
    }
    
    public async peekNextRaffleRef(mode: RaffleMode, count: number = 5): Promise<NextRaffleInfo> {
        const { numbers, playedCount } = await this.getNextRefInfo(mode, true, count);
        
        const prefix = 'JM';
        const refs = numbers.map(num => `${prefix}${String(num)}`);

        return { refs, count: playedCount };
    }

    public async resetCounters(): Promise<void> {
        if (typeof window !== 'undefined') {
            const batch = writeBatch(this.db);
            const modes: RaffleMode[] = ['two-digit', 'three-digit', 'infinite'];
            for (const mode of modes) {
                batch.set(this.getCounterRef(mode), { count: 0 });
            }
            await batch.commit();
        }
    }
}

export { RaffleManager };
export type { NextRaffleInfo };
