import React, { useEffect, useRef, useState } from 'react';
import { SpotifyPlus } from 'spotifyplus';
import { createNativeComponent } from 'spotifyplus/react';

const HeartOverlay = createNativeComponent<{ liked: boolean; available: boolean }>('HeartOverlay');
type LikeState = { uri: string | null; liked: boolean };

function LikeButton() {
    const [state, setState] = useState<LikeState>({ uri: null, liked: false });
    const current = useRef(state);
    const pendingUntil = useRef(0);

    useEffect(() => {
        function refresh() {
            try {
                const playing = SpotifyPlus.Player.getState().trackUri;

                const uri = playing?.startsWith('spotify:track:') ? playing : null;
                if (uri === current.current.uri && Date.now() < pendingUntil.current) return;

                const next = { uri, liked: uri ? SpotifyPlus.Library.isLiked(uri) : false };
                if (next.uri !== current.current.uri || next.liked !== current.current.liked) {
                    current.current = next;
                    setState(next);
                }
            } catch (error) {
                console.warn("Could not check the current song's like status", error);
            }
        }

        refresh();
        SpotifyPlus.Events.on('songChanged', refresh);

        // We're doing this in case if the song got liked somewhere else, like on another device or something
        const timer = setInterval(refresh, 1500);
        return () => {
            clearInterval(timer);
            SpotifyPlus.Events.off('songChanged', refresh);
        };
    }, []);

    function toggle() {
        if (Date.now() < pendingUntil.current) return;

        const uri = current.current.uri;
        if (!uri || SpotifyPlus.Player.getState().trackUri !== uri) return;

        try {
            const liked = SpotifyPlus.Library.isLiked(uri);
            if (liked) SpotifyPlus.Library.unlike(uri);
            else SpotifyPlus.Library.like(uri);

            pendingUntil.current = Date.now() + 1200;
            current.current = { uri, liked: !liked };

            setState(current.current);
        } catch (error) {
            console.error("Could not change the song's like status", error);
            SpotifyPlus.toast('Could not update Liked Songs. Please try again');
        }
    }

    return React.createElement(HeartOverlay, {
        width: '100%',
        height: '100%',
        liked: state.liked,
        available: state.uri !== null,
        onPress: toggle
    });
}

SpotifyPlus.UI.overlay('nowPlaying.page', LikeButton);