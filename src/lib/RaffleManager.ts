class RaffleManager {
    private ref: string;

    constructor() {
        this.ref = this.generateRef();
    }

    private generateRef(): string {
        return Math.random().toString(36).substring(2, 9).toUpperCase();
    }

    public getRef(): string {
        return this.ref;
    }

    public generateNewRef(): void {
        this.ref = this.generateRef();
    }
}

export { RaffleManager };
