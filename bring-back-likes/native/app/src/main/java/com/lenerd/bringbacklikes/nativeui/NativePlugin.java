package com.lenerd.bringbacklikes.nativeui;

import android.content.Context;
import android.view.View;
import com.lenerd.spotifyplus.sdk.SpotifyPlusPlugin;
import com.lenerd.spotifyplus.sdk.SpotifyPlusRegistry;
import com.lenerd.spotifyplus.sdk.SpotifyPlusComponent;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;
import org.json.JSONObject;

public final class NativePlugin implements SpotifyPlusPlugin {
    @Override public void register(SpotifyPlusRegistry registry, SpotifyPlusContext context) {
        registry.registerComponent(new SpotifyPlusComponent<HeartOverlay>() {
            @Override public String getName() { 
                return "HeartOverlay"; 
            }

            @Override public HeartOverlay createView(Context context, SpotifyPlusContext spotify) {
                return new HeartOverlay(context);
            }

            @Override public void updateProps(HeartOverlay view, JSONObject oldProps, JSONObject props) {
                view.setState(props.optBoolean("liked"), props.optBoolean("available"));
            }
            
            @Override public void onDropView(View view) { ((HeartOverlay) view).release(); }
        });
    }
}
