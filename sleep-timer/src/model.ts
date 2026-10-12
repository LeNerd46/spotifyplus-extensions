import type { SleepTimerApi, SleepTimerUnit } from 'spotifyplus';

export interface Preset {
    key: string;
    minutes: number;
    defaultId?: string
}

export interface Configuration {
    version: 1;
    presets: Preset[]
}

export interface Request {
    requestId: string;
    revision: number;
    type: 'move' | 'remove' | 'submit';
    key?: string;
    order?: string[];
    duration?: number;
    unit?: SleepTimerUnit;
    save?: boolean
}

export interface Row {
    key: string;
    label: string;
    available: boolean
}

const DEFAULTS = [5, 10, 15, 30, 45, 60, 0];

export const STORAGE_KEY = 'sleep-timer-presets-v1';

export function defaultConfiguration(): Configuration {
    return { version: 1, presets: DEFAULTS.map(minutes => ({ key: minutes ? `default:${minutes}` : 'default:end-of-content', defaultId: minutes ? `default:${minutes}` : 'default:end-of-content', minutes })) };
}

export function readConfiguration(value: unknown): Configuration {
    if (!value || typeof value !== 'object') return defaultConfiguration();

    const config = value as Configuration;
    if (config.version !== 1 || !Array.isArray(config.presets)) return defaultConfiguration();

    const keys = new Set<string>();
    for (const row of config.presets) {
        if (!row || typeof row.key !== 'string' || !row.key || keys.has(row.key)) return defaultConfiguration();
        keys.add(row.key);

        if (row.defaultId) {
            const original = defaultConfiguration().presets.find(preset => preset.key === row.defaultId);
            if (!original || row.key !== original.key || row.minutes !== original.minutes) return defaultConfiguration();
        } else if (!row.key.startsWith('custom:') || !Number.isInteger(row.minutes) || row.minutes <= 0 || row.minutes > 2147483647) return defaultConfiguration();
    }
    return { version: 1, presets: config.presets.map(row => ({ key: row.key, minutes: row.minutes, ...(row.defaultId ? { defaultId: row.defaultId } : {}) })) };
}

export function durationMinutes(duration: number, unit: SleepTimerUnit): number {
    const minutes = duration * (unit === 'hours' ? 60 : 1);

    if (typeof duration !== 'number' || !Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0 || minutes > 2147483647 || !['minutes', 'hours'].includes(unit))
        throw new Error('Enter a positive duration in whole minutes (for example, 25 minutes or 1.5 hours).');

    return minutes;
}

export function label(minutes: number): string {
    if (!minutes) return 'End of track / episode';
    const hours = Math.floor(minutes / 60), rest = minutes % 60;

    if (!hours) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minute${rest === 1 ? '' : 's'}` : ''}`;
}

interface Storage {
    get<T>(key: string): T | null;
    set(key: string, value: unknown): void
}

export class TimerManager {
    private config: Configuration;
    private ids = new Map<string, string>();
    private revision = 0;

    constructor(private api: SleepTimerApi, private storage: Storage, private open: () => void | Promise<void>, private createId: () => string) {
        this.config = readConfiguration(storage.get(STORAGE_KEY));
        this.apply(this.config);
    }

    private apply(config: Configuration): void {
        this.api.reset();
        this.ids.clear();

        const visibleDefaults = new Set(this.api.list().filter(row => !row.scriptId).map(row => row.id));
        for (const preset of defaultConfiguration().presets) {
            if (!config.presets.some(row => row.defaultId === preset.defaultId) && visibleDefaults.has(preset.key)) this.api.remove(preset.key);
        }

        for (const preset of config.presets) {
            if (preset.defaultId) {
                if (visibleDefaults.has(preset.defaultId)) {
                    this.ids.set(preset.key, preset.defaultId);
                }
            } else {
                this.ids.set(preset.key, this.api.add(preset.minutes).id);
            }
        }

        let before: string | undefined;
        for (const preset of [...config.presets].reverse()) {
            const id = this.ids.get(preset.key);
            if (id) { this.api.move(id, before); before = id; }
        }

        const button = this.api.addButton('Manage timers', this.open);
        this.api.move(button.id, before);
    }

    snapshot() {
        return { revision: this.revision, rows: this.config.presets.map(row => ({ key: row.key, label: label(row.minutes), available: this.ids.has(row.key) })) };
    }

    handle(request: Request) {
        if (!request || typeof request.requestId !== 'string') throw new Error('Invalid timer request.');
        if (request.revision !== this.revision) throw new Error('The timer list changed. Please try again.');

        if (request.type === 'submit') {
            const minutes = durationMinutes(request.duration!, request.unit!);

            if (typeof request.save !== 'boolean') throw new Error('Choose whether to save this timer.');

            if (!request.save) {
                this.api.start(request.duration!, request.unit!);
                return { ...this.snapshot(), requestId: request.requestId, started: true, minutes };
            }

            if (this.config.presets.some(row => row.minutes === minutes && minutes > 0)) throw new Error('That duration is already in your timer list.');
            this.commit({ version: 1, presets: [...this.config.presets, { key: `custom:${this.createId()}`, minutes }] });

            return { ...this.snapshot(), requestId: request.requestId, saved: true };
        }

        if (request.type === 'remove') {
            if (!this.config.presets.some(row => row.key === request.key)) throw new Error('This timer is no longer in the list.');

            this.commit({ version: 1, presets: this.config.presets.filter(row => row.key !== request.key) });
        } else if (request.type === 'move') {
            const order = request.order;

            if (!Array.isArray(order) || order.length !== this.config.presets.length || new Set(order).size !== order.length || order.some(key => !this.config.presets.some(row => row.key === key)))
                throw new Error('The timer order is invalid.');

            this.commit({ version: 1, presets: order.map(key => this.config.presets.find(row => row.key === key)!) });
        } else throw new Error('Unknown timer action.');

        return { ...this.snapshot(), requestId: request.requestId };
    }

    private commit(next: Configuration): void {
        const previous = this.config;

        try {
            this.apply(next);
            this.storage.set(STORAGE_KEY, next);
            this.config = next;
            this.revision++;
        } catch (error) {
            this.apply(previous);
            throw error;
        }
    }
}