package com.spotifyplus.sleeptimermanager;

import android.content.Context;
import android.view.View;
import com.lenerd.spotifyplus.sdk.*;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public final class TimerManagerPlugin implements SpotifyPlusPlugin {
    @Override 
    public void register(SpotifyPlusRegistry registry, SpotifyPlusContext context) {
        SpotifyPlusEvents events = context.getEvents();

        registry.registerComponent(new SpotifyPlusComponent<ReorderTimersView>() {
            @Override 
            public String getName() { 
                return "TimerList"; 
            }

            @Override 
            public ReorderTimersView createView(Context androidContext, SpotifyPlusContext spotify) {
                final ReorderTimersView[] reference = new ReorderTimersView[1];

                reference[0] = new ReorderTimersView(androidContext, new ReorderTimersView.Listener() {
                    private void emit(String type, Object value) {
                        try {
                            events.emit("sleepTimers.listAction", new JSONObject() .put("instance", reference[0].getTag()) .put("type", type).put(type.equals("move") ? "order" : "key", value));
                        } catch (Exception error) { reference[0].setBusy(false); }
                    }

                    @Override 
                    public void reorder(List<String> keys) { 
                        emit("move", new JSONArray(keys));
                    }

                    @Override 
                    public void remove(String key) { 
                        emit("remove", key);
                     }
                });

                return reference[0];
            }

            @Override 
            public void updateProps(ReorderTimersView view, JSONObject oldProps, JSONObject props) {
                view.setTag(props.optString("instance"));
                JSONArray data = props.optJSONArray("rows");
                JSONArray previous = oldProps == null ? null : oldProps.optJSONArray("rows");
                
                if (data != null && !data.toString().equals(previous == null ? "" : previous.toString())) {
                    List<ReorderTimersView.Row> rows = new ArrayList<>();

                    for (int i = 0; i < data.length(); i++) {
                        JSONObject row = data.optJSONObject(i);
                        if (row != null) rows.add(new ReorderTimersView.Row(row.optString("key"), row.optString("label"), row.optBoolean("available")));
                    }

                    view.setRows(rows);
                }

                view.setBusy(false);
            }

            @Override 
            public android.view.ViewGroup getChildren(ReorderTimersView view) { return null; }

            @Override 
            public void onDropView(View view) { ((ReorderTimersView) view).release(); }
        });
    }
}
