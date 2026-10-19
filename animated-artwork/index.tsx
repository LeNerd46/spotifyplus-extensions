import { useEffect, useState } from 'react';
import { SpotifyPlus } from 'spotifyplus';
import { createNativeComponent } from 'spotifyplus/react';
import { findAnimatedArtwork } from './artwork';

const ArtworkVideo = createNativeComponent<{ src: string | null }>('ArtworkVideo');

const middleCover = {
    screen: 'nowPlaying.page',
    resourceId: 'com.spotify.music:id/cover_art_container',
    minVisible: 0.85
} as const;

function AnimatedArtwork({ uri }: { uri: string | null }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setSrc(null);

        if (!uri?.startsWith('spotify:track:')) return;

        const load = async () => {
            try {
                const track = await SpotifyPlus.Internal.getTrack(uri);
                if (cancelled || !track) return;

                const video = await findAnimatedArtwork({
                    title: track.title,
                    artist: track.artist,
                    album: track.album.title
                });

                if (!cancelled) setSrc(video);
            } catch (error) {
                if (!cancelled) console.warn('Could not load animated artwork', error);
            }
        };

        load();

        return () => { cancelled = true; };
    }, [uri]);

    return <ArtworkVideo width="100%" height="100%" src={src} />;
}

SpotifyPlus.UI.overlay(middleCover, ({ context }) => <AnimatedArtwork uri={context.uri} />);