import { SpotifyPlus, type ExtensionSetting, type ExtensionToggle } from 'spotifyplus';

const saved = SpotifyPlus.Platform.Storage.get<boolean>('persistentPrivateSession');
const toggle: ExtensionToggle = {
    id: 'persistentPrivateSession',
    type: 'toggle',
    label: 'Persistent private session',
    description: 'Enable private session and turn it back on whenever Spotify disables it.',
    value: typeof saved === 'boolean' ? saved : true,
};

let retry: ReturnType<typeof setTimeout> | undefined;

function cancelRetry(): void {
    if (retry !== undefined) clearTimeout(retry);
    retry = undefined;
}

function ensurePrivateSession(): void {
    if (!toggle.value) return;

    try {
        if (SpotifyPlus.Settings.get('privateSession') !== true) {
            SpotifyPlus.Settings.set('privateSession', true);
        }

        cancelRetry();
    } catch (error) {
        if (retry === undefined) {
            console.warn('Could not enable private session; retrying in 5 seconds', error);

            retry = setTimeout(() => {
                retry = undefined;
                ensurePrivateSession();
            }, 5_000);
        }
    }
}

SpotifyPlus.Settings.registerSetting({
    title: 'Persistent Private Session',
    items: [toggle],
});

SpotifyPlus.Events.on<ExtensionSetting>('settings.changed', (setting) => {
    if (setting.id !== 'persistentPrivateSession' || setting.type !== 'toggle') return;

    SpotifyPlus.Platform.Storage.set('persistentPrivateSession', setting.value);
    toggle.value = setting.value;

    cancelRetry();
    if (toggle.value) ensurePrivateSession();
});

SpotifyPlus.Events.on('settingChanged', ({ id, value }) => {
    if (id === 'privateSession' && value === false) ensurePrivateSession();
});

ensurePrivateSession();