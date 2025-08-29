class RaffleManager {
    private static RAFFLE_COUNTER_KEY = 'raffleCounter';

    constructor() {
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
        const ref = `JM${this.getNextRefNumber()}`;
        return ref;
    }

    public resetRef(): void {
        // No action needed here anymore as ref is generated on demand
    }
}

export { RaffleManager };
