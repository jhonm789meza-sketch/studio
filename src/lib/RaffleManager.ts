class RaffleManager {
    private ref: string;
    private static RAFFLE_COUNTER_KEY = 'raffleCounter';

    constructor() {
        this.ref = this.generateRef(true);
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

    private getCurrentRefNumber(): number {
         if (typeof window === 'undefined') {
            return 1;
        }
        return parseInt(localStorage.getItem(RaffleManager.RAFFLE_COUNTER_KEY) || '1', 10);
    }

    private generateRef(isInitial: boolean = false): string {
        const num = isInitial ? this.getCurrentRefNumber() : this.getNextRefNumber();
        return String(num);
    }

    public getRef(): string {
        return this.ref;
    }

    public generateNewRef(): void {
        this.ref = this.generateRef();
    }
}

export { RaffleManager };
