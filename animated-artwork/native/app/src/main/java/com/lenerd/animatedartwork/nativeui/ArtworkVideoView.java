package com.lenerd.animatedartwork.nativeui;

import android.content.Context;
import android.graphics.Matrix;
import android.graphics.Outline;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.MotionEvent;
import android.view.TextureView;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;
import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.VideoSize;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;

public final class ArtworkVideoView extends FrameLayout {
    private static final String TAG = "AnimatedArtwork";
    private static final long SETTLE_MS = 300;
    private static final long FADE_MS = 150;

    private final TextureView texture;
    private final Runnable reveal = this::updateVisibility;

    private ExoPlayer player;
    private String source;
    private boolean ready;
    private long since;
    private int videoWidth, videoHeight;
    private float pixelRatio = 1f;

    public ArtworkVideoView(Context context) {
        super(context);

        setClickable(false);
        setAlpha(0);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        setClipToOutline(true);
        setOutlineProvider(new ViewOutlineProvider() {
            @Override public void getOutline(View view, Outline outline) {
                outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), view.getWidth() * 0.02f);
            }
        });

        texture = new TextureView(context);
        texture.setClickable(false);
        texture.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> applyCrop());
        
        addView(texture, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
    }

    public void setSource(String src) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            post(() -> setSource(src));
            return;
        }

        String next = src == null || src.isEmpty() ? null : src;
        if (next == null ? source == null : next.equals(source)) return;

        source = next;
        load();
    }

    private void load() {
        ready = false;
        since = SystemClock.uptimeMillis();
        videoWidth = videoHeight = 0;
        animate().cancel();
        setAlpha(0);

        if (source == null) {
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
            return;
        }

        if (!isAttachedToWindow()) return;

        ExoPlayer p = ensurePlayer();

        p.setMediaItem(MediaItem.fromUri(source));
        p.setPlayWhenReady(getWindowVisibility() == VISIBLE);
        p.prepare();
    }

    @OptIn(markerClass = UnstableApi.class)
    private ExoPlayer ensurePlayer() {
        if (player != null) return player;

        Context application = getContext().getApplicationContext();
        DefaultTrackSelector selector = new DefaultTrackSelector(application);
        selector.setParameters(selector.buildUponParameters() .setMaxVideoSize(1280, 1280) .setMaxVideoBitrate(2_500_000) .setTrackTypeDisabled(C.TRACK_TYPE_AUDIO, true));

        player = new ExoPlayer.Builder(application) .setTrackSelector(selector) .setLoadControl(new DefaultLoadControl.Builder() .setBufferDurationsMs(2000, 6000, 500, 1000) .setTargetBufferBytes(8 * 1024 * 1024) .setPrioritizeTimeOverSizeThresholds(false) .build()) .build();

        player.setRepeatMode(Player.REPEAT_MODE_ONE);
        player.setVolume(0f);
        player.setVideoTextureView(texture);
        player.addListener(new Player.Listener() {
            @Override public void onRenderedFirstFrame() {
                ready = true;
                updateVisibility();
            }

            @Override public void onVideoSizeChanged(VideoSize size) {
                videoWidth = size.width;
                videoHeight = size.height;
                pixelRatio = size.pixelWidthHeightRatio;

                applyCrop();
            }

            @Override public void onPlayerError(PlaybackException error) {
                Log.w(TAG, "Could not play animated artwork " + source, error);
                ready = false;

                updateVisibility();
            }
        });

        return player;
    }

    private void updateVisibility() {
        removeCallbacks(reveal);
        boolean visible = ready && isAttachedToWindow() && getWindowVisibility() == VISIBLE;

        long waited = SystemClock.uptimeMillis() - since;
        if (visible && waited < SETTLE_MS) {
            postDelayed(reveal, SETTLE_MS - waited);
            return;
        }

        float alpha = visible ? 1f : 0f;
        if (getAlpha() == alpha) return;

        animate().cancel();
        animate().alpha(alpha).setDuration(FADE_MS).start();
    }

    private void applyCrop() {
        int width = texture.getWidth(), height = texture.getHeight();
        if (width <= 0 || height <= 0 || videoWidth <= 0 || videoHeight <= 0) return;

        float video = videoWidth * pixelRatio;
        float scale = Math.max(width / video, height / (float) videoHeight);

        Matrix transform = new Matrix();
        transform.setScale(video * scale / width, videoHeight * scale / height, width / 2f, height / 2f);
        texture.setTransform(transform);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) { return false; }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();

        since = SystemClock.uptimeMillis();
        if (source != null && player == null) load();
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);

        if (player != null) player.setPlayWhenReady(visibility == VISIBLE && source != null);
        updateVisibility();
    }

    @Override
    protected void onDetachedFromWindow() {
        teardown();
        super.onDetachedFromWindow();
    }

    private void teardown() {
        removeCallbacks(reveal);

        if (player != null) {
            player.release();
            player = null;
        }

        ready = false;
        animate().cancel();
        setAlpha(0);
    }

    public void release() {
        teardown();
        source = null;
    }
}