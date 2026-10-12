import type { UpNextApi, UpNextSnapshot } from 'spotifyplus';

type Upcoming = Pick<UpNextApi, 'get' | 'add'>;

export class PlayNextError extends Error {
    constructor(message: string, readonly added: boolean, options?: ErrorOptions) {
        super(message, options);
        this.name = 'PlayNextError';
    }
}

export class PlayNextQueue {
    private pending: string[] = [];

    constructor(private readonly upNext: Upcoming) { }

    get hasPending(): boolean {
        return this.pending.length > 0;
    }

    reset(): void {
        this.pending = [];
    }

    private reconcile(snapshot: UpNextSnapshot): void {
        const upcoming = new Set(snapshot.next.map(track => track.uid));
        this.pending = this.pending.filter(uid => uid !== snapshot.current?.uid && upcoming.has(uid));
    }

    refresh(): void {
        if (this.hasPending) this.reconcile(this.upNext.get());
    }

    add(uri: string): void {
        if (!/^spotify:track:[A-Za-z0-9]+$/.test(uri)) {
            throw new PlayNextError('Play next only supports tracks', false);
        }

        let added = false;
        let stage = 'read Up next';

        try {
            const before = this.upNext.get();
            this.reconcile(before);
            const owned = new Set(this.pending);
            let destination = 0;

            for (let index = 0; index < before.next.length; index++) {
                if (owned.has(before.next[index].uid)) destination = index + 1;
            }

            stage = 'insert the track into Play next';
            const entries = this.upNext.add(uri, destination);
            added = true;

            if (!Array.isArray(entries) || entries.length !== 1 || !entries[0].uid || entries[0].uri !== uri) {
                throw new Error('Spotify Plus did not return the ID. Please try restarting Spotify');
            }

            const entry = entries[0];
            this.pending.push(entry.uid);
        } catch (cause) {
            const detail = (cause as { message?: string } | null)?.message ?? String(cause);
            throw new PlayNextError(`Could not ${stage}: ${detail}`, added, { cause });
        }
    }
}