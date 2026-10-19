package com.lenerd.animatedartwork.nativeui;

import android.content.Context;
import android.view.View;
import com.lenerd.spotifyplus.sdk.SpotifyPlusComponent;
import com.lenerd.spotifyplus.sdk.SpotifyPlusPlugin;
import com.lenerd.spotifyplus.sdk.SpotifyPlusRegistry;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;
import org.json.JSONObject;

public final class NativePlugin implements SpotifyPlusPlugin {
    @Override public void register(SpotifyPlusRegistry registry, SpotifyPlusContext context) {
        registry.registerComponent(new SpotifyPlusComponent<ArtworkVideoView>() {
            @Override
            public String getName() {
                return "ArtworkVideo";
            }

            @Override
            public ArtworkVideoView createView(Context context, SpotifyPlusContext spotify) {
                return new ArtworkVideoView(context);
            }

            @Override
            public void updateProps(ArtworkVideoView view, JSONObject oldProps, JSONObject props) {
                view.setSource(props.isNull("src") ? null : props.optString("src", null));
            }

            @Override
            public void onDropView(View view) { ((ArtworkVideoView) view).release(); }
        });
    }
}
