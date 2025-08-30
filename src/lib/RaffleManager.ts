import { doc, getDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

class RaffleManager {
    private db: Firestore;
    private counterRef;

    constructor(db: Firestore) {
        this.db = db;
        this.counterRef = doc(this.db, 'internal', 'raffleCounter');
    }

    private async getNextRefNumber(): Promise<number> {
        // This function should only run on the client-side where there's a user context.
        if (typeof window === 'undefined') {
            // Returning a placeholder or handling server-side rendering appropriately.
            return 1; 
        }
        
        try {
            const docSnap = await getDoc(this.counterRef);

            if (docSnap.exists()) {
                // Use updateDoc with increment for atomic operation
                await updateDoc(this.counterRef, { count: increment(1) });
                // Re-fetch the document to get the updated count
                const updatedSnap = await getDoc(this.counterRef);
                return updatedSnap.data()?.count || 1;
            } else {
                // If the counter document doesn't exist, create it.
                await setDoc(this.counterRef, { count: 1 });
                return 1;
            }
        } catch (error) {
            console.error("Error getting next ref number:", error);
            // Fallback in case of error
            return Math.floor(Math.random() * 1000);
        }
    }

    public async startNewRaffle(): Promise<string> {
        const nextNumber = await this.getNextRefNumber();
        const ref = `JM${nextNumber}`;
        return ref;
    }

    public async resetRef(): Promise<void> {
        if (typeof window !== 'undefined') {
            await setDoc(this.counterRef, { count: 0 });
        }
    }
}

export { RaffleManager };
