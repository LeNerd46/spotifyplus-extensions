package com.lenerd.bringbacklikes.nativeui;

import android.content.Context;
import android.graphics.Color;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;

public final class HeartOverlay extends FrameLayout {
    private final ImageButton heart;
    private final int[] nativePosition = new int[2];
    private final int[] overlayPosition = new int[2];
    private final ViewTreeObserver.OnPreDrawListener observer = () -> { align(); return true; };
    private View original;
    private float originalAlpha;
    private int originalAccessibility;
    private boolean available;
    private int feedbackId;
    private ViewTreeObserver observedTree;

    public HeartOverlay(Context context) {
        super(context);
        
        setClipChildren(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        
        heart = new ImageButton(context);
        heart.setImageDrawable(new FavoriteDrawable());
        heart.setBackgroundColor(Color.TRANSPARENT);
        heart.setScaleType(ImageView.ScaleType.FIT_CENTER);
        
        int padding = Math.round(8 * getResources().getDisplayMetrics().density);
        heart.setPadding(padding, padding, padding, padding);
        heart.setOnClickListener(v -> performClick());
        heart.setVisibility(INVISIBLE);

        addView(heart, new LayoutParams(0, 0));
        feedbackId = getResources().getIdentifier("feedback_buttons_container", "id", "com.spotify.music");
    }

    public void setState(boolean liked, boolean available) {
        this.available = available;
        ((FavoriteDrawable) heart.getDrawable()).setFilled(liked);
        
        heart.setColorFilter(liked ? Color.rgb(29, 185, 84) : Color.WHITE);
        heart.setContentDescription(liked ? "Unlike song" : "Like song");
        heart.setEnabled(available);

        align();
    }

    @Override protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        observedTree = getViewTreeObserver();
        observedTree.addOnPreDrawListener(observer);

        align();
    }

    private void align() {
        View candidate = null;
        View feedback = feedbackId == 0 ? null : getRootView().findViewById(feedbackId);

        if (available && feedback instanceof ViewGroup group && group.getChildCount() > 0) {
            View last = group.getChildAt(group.getChildCount() - 1);
            if (last.isShown() && last.getWidth() > 0 && last.getHeight() > 0 && last.isClickable()) candidate = last;
        }
        
        if (candidate != original) {
            restore();
            original = candidate;
            if (original != null) {
                originalAlpha = original.getAlpha();
                originalAccessibility = original.getImportantForAccessibility();
            }
        }
        if (original == null || !isAttachedToWindow()) {
            heart.setVisibility(INVISIBLE);
            return;
        }

        original.getLocationInWindow(nativePosition);
        getLocationInWindow(overlayPosition);
        
        int x = nativePosition[0] - overlayPosition[0];
        int y = nativePosition[1] - overlayPosition[1];
        
        LayoutParams layout = (LayoutParams) heart.getLayoutParams();
        if (layout.width != original.getWidth() || layout.height != original.getHeight() || layout.leftMargin != x || layout.topMargin != y) {
            layout.width = original.getWidth();
            layout.height = original.getHeight();
            layout.leftMargin = x;
            layout.topMargin = y;
            heart.setLayoutParams(layout);
        }

        original.setAlpha(0);
        original.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);

        heart.setVisibility(VISIBLE);
    }

    @Override public boolean onTouchEvent(MotionEvent event) { return false; }

    private void restore() {
        if (original != null) {
            original.setAlpha(originalAlpha);
            original.setImportantForAccessibility(originalAccessibility);

            original = null;
        }
    }

    public void release() {
        if (observedTree != null && observedTree.isAlive()) observedTree.removeOnPreDrawListener(observer);
        observedTree = null;
        
        restore();
        heart.setVisibility(INVISIBLE);
    }

    @Override protected void onDetachedFromWindow() {
        release();
        super.onDetachedFromWindow();
    }
}
