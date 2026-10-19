import { useEffect, useState } from 'react';
import { SpotifyPlus } from 'spotifyplus';
import { createNativeComponent } from 'spotifyplus/react';
import { ArtworkQuery, findAnimatedArtwork } from './artwork';

const ArtworkVideo = createNativeComponent<{ src: string | null }>('ArtworkVideo');

const middleCover = {
    screen: 'nowPlaying.page',
    resourceId: 'com.spotify.music:id/cover_art_container',
    minVisible: 0.85
} as const;

const albumHeader = {
    screen: 'album.page',
    resourceId: 'com.spotify.music:id/cwp_header_artwork'
} as const;

async function queryFor(uri: string): Promise<ArtworkQuery | null> {
    if (uri.startsWith('spotify:track:')) {
        const track = await SpotifyPlus.Internal.getTrack(uri);
        return track && { title: track.title, artist: track.artist, album: track.album.title };
    }

    if (uri.startsWith('spotify:album:')) {
        const album = await SpotifyPlus.Internal.getAlbum(uri);
        return album && { artist: album.artists[0]?.name ?? '', album: album.name };
    }

    return null;
}

function AnimatedArtwork({ uri }: { uri: string | null }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setSrc(null);

        if (!uri) return;

        const load = async () => {
            try {
                const query = await queryFor(uri);
                if (cancelled || !query) return;

                const video = await findAnimatedArtwork(query);

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
SpotifyPlus.UI.overlay(albumHeader, ({ context }) => <AnimatedArtwork uri={context.uri} />);