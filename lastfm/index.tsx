
import { useEffect, useState } from 'react';
import { ExtensionSetting, SpotifyPlus } from 'spotifyplus';
import { Image, Text, View } from 'spotifyplus/react';

const logo = SpotifyPlus.Assets.image('assets/lastfm');
let username: string = SpotifyPlus.Platform.Storage.get('username') ?? '';
const apiKey = '3713c2e0b7493e945555b7f52dc4232e';

type MediaType = 'track' | 'album' | 'artist';

interface MediaInfo {
    type: MediaType;
    title: string;
    artist?: string;
    image: string;
}

const getMediaType = (uri: string): MediaType | null => {
    if (uri.startsWith('spotify:track:')) return 'track';
    if (uri.startsWith('spotify:album:')) return 'album';
    if (uri.startsWith('spotify:artist:')) return 'artist';
    return null;
};

const getScrobbles = async (media: MediaInfo): Promise<number> => {
    const params = new URLSearchParams({
        method: `${media.type}.getInfo`,
        api_key: apiKey,
        format: 'json',
        user: username
    });

    if (media.type === 'track') {
        params.set('track', media.title);
        params.set('artist', media.artist ?? '');
    } else if (media.type === 'album') {
        params.set('album', media.title);
        params.set('artist', media.artist ?? '');
    } else {
        params.set('artist', media.title);
    }

    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
    if (!response.ok) throw new Error(`Last.fm HTTP ${response.status}`);

    const json: any = await response.json();
    if (json.error) throw new Error(json.message ?? 'Last.fm API error');

    const count = media.type === 'artist'
        ? json.artist?.stats?.userplaycount
        : json[media.type]?.userplaycount;

    return Number(count ?? 0);
};

const getMedia = async (uri: string, type: MediaType): Promise<MediaInfo | null> => {
    switch (type) {
        case 'track': {
            const track = await SpotifyPlus.Internal.getTrack(uri);
            if (!track) return null;

            return {
                type,
                title: track.title,
                artist: track.artist,
                image: track.album.image
            };
        }

        case 'album': {
            const album = await SpotifyPlus.Internal.getAlbum(uri);
            if (!album) return null;

            return {
                type,
                title: album.name,
                artist: album.artists[0].name,
                image: album.image
            };
        }

        case 'artist': {
            const artist = await SpotifyPlus.Internal.getArtist(uri);
            if (!artist) return null;

            return {
                type,
                title: artist.name,
                image: artist.image
            };
        }
    }
};

SpotifyPlus.UI.replace('contextMenu.header', (thing) => {
    const [media, setMedia] = useState<MediaInfo | null>(null);
    const [scrobbles, setScrobbles] = useState<number | null>(null);

    useEffect(() => {
        const uri = thing.context.uri;
        const type = uri ? getMediaType(uri) : null;

        let cancelled = false;

        setMedia(null);
        setScrobbles(null);

        if (!uri || !type) return;

        const loadMedia = async () => {
            try {
                const result = await getMedia(uri, type);
                if (cancelled || !result) return;

                setMedia(result);

                const count = await getScrobbles(result);
                if (cancelled) return;

                setScrobbles(count);
            } catch (error) {
                if (!cancelled) console.error('Failed to load media information:', error);
            }
        };

        loadMedia();

        return () => { cancelled = true; };
    }, [thing.context.uri]);


    const subtitle = media
        ? [
            media.artist,
            scrobbles !== null ? `${scrobbles.toLocaleString()} scrobbles` : null
        ].filter(Boolean).join(' · ')
        : '';

    const type = thing.context.uri ? getMediaType(thing.context.uri) : null;
    if (!type) return <thing.Original />;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12, width: '100%' }}>
            {media ? (
                <>
                    <Image source={{ uri: media.image }} style={{ width: 48, height: 48, borderRadius: media.type === 'artist' ? 24 : 4 }} />

                    <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                            {media.title}
                        </Text>

                        {subtitle ? (
                            <Text numberOfLines={1} style={{ color: '#B3B3B3', fontSize: 14 }}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>
                </>
            ) : (
                <Text style={{ color: '#B3B3B3', fontSize: 14 }}>Loading...</Text>
            )}
        </View>
    );
});

const usernameSetting: ExtensionSetting = {
    id: 'lastfm_username',
    type: 'text',
    label: 'Last.fm Username',
    value: username,
    description: 'Enter your last.fm username so it can show you the scrobbles for your account',
    placeholder: 'Username'
}

SpotifyPlus.Settings.registerSettings([
    {
        title: 'Last.fm Settings',
        items: [usernameSetting]
    }
]);

SpotifyPlus.Events.on('settings.changed', (e: unknown) => {
    const setting = e as ExtensionSetting | undefined;

    if (setting?.id === 'lastfm_username' && setting?.type === 'text') {
        SpotifyPlus.Platform.Storage.set('username', setting.value);
        usernameSetting.value = setting.value;
        username = setting.value;
    }
});

new SpotifyPlus.ContextMenu('Open in Last.fm', (uri) => {
    SpotifyPlus.Navigation.open(``);
    //@ts-ignore
}, undefined, undefined, undefined, logo).register();