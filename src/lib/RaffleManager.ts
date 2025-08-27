class RaffleManager {
    private ref: string;
    private static RAFFLE_COUNTER_KEY = 'raffleCounter';

    constructor() {
        this.ref = '';
    }

    private getNextRefNumber(): number {
        if (typeof window === 'undefined') {
            return 1;
        }
        const counter = parseInt(localStorage.getItem(RaffleManager.RAFFLE_COUNTER_KEY) || '0', 10);
        const nextCounter = counter + 1;
        localStorage.setItem(RaffleManager.RAFFLE_COUNTER_KEY, nextCounter.toString());
        return nextCounter;
    }

    public startNewRaffle(): string {
        this.ref = String(this.getNextRefNumber());
        return this.ref;
    }

    public getRef(): string {
        return this.ref;
    }
}

export { RaffleManager };
