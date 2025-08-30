import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

class RaffleManager {
    private db: Firestore;
    private counterRef;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRef = doc(this.db, 'internal', 'raffleCounter');
    }

    private async getNextRefNumber(): Promise<number> {
        if (typeof window === 'undefined') {
            return 1;
        }
        
        const docSnap = await getDoc(this.counterRef);

        if (docSnap.exists()) {
            await setDoc(this.counterRef, { count: increment(1) }, { merge: true });
            const updatedSnap = await getDoc(this.counterRef);
            return updatedSnap.data()?.count || 1;
        } else {
            await setDoc(this.counterRef, { count: 1 });
            return 1;
        }
    }

    public async startNewRaffle(): Promise<string> {
        const nextNumber = await this.getNextRefNumber();
        const ref = `JM${nextNumber}`;
        return ref;
    }

    public resetRef(): void {
        // This is now handled by Firestore
    }
}

export { RaffleManager };
