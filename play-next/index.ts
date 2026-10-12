import { SpotifyPlus } from 'spotifyplus';
import { PlayNextError, PlayNextQueue } from './play-next';

const queue = new PlayNextQueue(SpotifyPlus.UpNext);
let timer: ReturnType<typeof setInterval> | undefined;
let refreshFailed = false;

function updateTimer(): void {
    if (queue.hasPending && timer === undefined) timer = setInterval(refresh, 5_000);

    if (!queue.hasPending && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
    }
}

function refresh(): void {
    try {
        queue.refresh();
        refreshFailed = false;
    } catch (error) {
        if (!refreshFailed) SpotifyPlus.warn('Could not refresh Play next entries', error);
        refreshFailed = true;
    }

    updateTimer();
}

function reset(): void {
    queue.reset();
    refreshFailed = false;

    updateTimer();
}

new SpotifyPlus.ContextMenu('Play next', uri => {
    if (!SpotifyPlus.UpNext) {
        SpotifyPlus.toast('Update Spotify Plus and restart Spotify to use Play next.');
        return;
    }

    try {
        queue.add(uri);
        SpotifyPlus.toast('Added to up next');
    } catch (error) {
        SpotifyPlus.error('Could not add Play next track', error);
        if (error instanceof PlayNextError && error.cause !== undefined) {
            const cause = error.cause as { message?: string; stack?: string };
            SpotifyPlus.error('Play next underlying error', cause?.message ?? String(error.cause), cause?.stack);
        }

        SpotifyPlus.toast(error instanceof PlayNextError && error.added ? "Added to Up next, but couldn't track it. Update Spotify Plus." : 'Could not add to Play next. Please try again.');
    }

    updateTimer();
}, uri => /^spotify:track:[A-Za-z0-9]+$/.test(uri), false, 'track').register();

SpotifyPlus.Events.on('songChanged', refresh);
SpotifyPlus.Events.on('shuffleChanged', refresh);
SpotifyPlus.Events.on('contextChanged', reset);
SpotifyPlus.Events.on('deviceChanged', reset);