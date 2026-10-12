package com.spotifyplus.sleeptimermanager;

import android.content.ClipData;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.DragEvent;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;

public final class ReorderTimersView extends ScrollView {
    public record Row(String key, String label, boolean available) {}

    public interface Listener { 
        void reorder(List<String> keys); 
        void remove(String key);
    }
    
    private static final int MOVE_EARLIER = View.generateViewId();
    private static final int MOVE_LATER = View.generateViewId();
    
    private final LinearLayout list;
    private final Listener listener;
    
    private final List<Row> rows = new ArrayList<>();
    private List<Row> original;

    private View draggedView;
    private String dragging;
    private boolean busy, dropped;
    private float pointerY;
    private int scrollDirection;

    private final Runnable edgeScroll = new Runnable() {
        @Override 
        public void run() {
            if (dragging == null || scrollDirection == 0) return;

            scrollBy(0, scrollDirection * dp(12));
            moveAt(pointerY + getScrollY());
            postOnAnimation(this);
        }
    };

    public ReorderTimersView(Context context, Listener listener) {
        super(context);
        this.listener = listener;
        
        setFillViewport(false);
        setNestedScrollingEnabled(true);
        setClipToPadding(false);

        list = new LinearLayout(context);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setOnDragListener(this::drag);
        
        addView(list, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
    }

    public void setRows(List<Row> updated) {
        releaseDrag();
        
        rows.clear();
        rows.addAll(updated);

        rebuild();
    }

    public void setBusy(boolean value) { 
        busy = value; setAlpha(value ? .55f : 1f); 
    }

    private void rebuild() {
        list.removeAllViews();
        
        if (rows.isEmpty()) {
            TextView empty = text("No presets yet. Add a timer below.", 15, 0xffb3b3b3);
            
            empty.setPadding(dp(8), dp(28), dp(8), dp(28));
            list.addView(empty);

            return;
        }
        
        for (Row row : rows) {
            LinearLayout item = new LinearLayout(getContext());

            item.setOrientation(LinearLayout.HORIZONTAL);
            item.setGravity(android.view.Gravity.CENTER_VERTICAL);
            item.setPadding(dp(14), dp(4), dp(6), dp(4));
            item.setMinimumHeight(dp(56));
            item.setTag(row.key());
            item.setBackground(background(0xff282828));
            
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            lp.bottomMargin = dp(6);
            list.addView(item, lp);

            TextView grip = text("≡", 22, 0xff777777);
            grip.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            item.addView(grip, new LinearLayout.LayoutParams(dp(32), LayoutParams.WRAP_CONTENT));
            
            LinearLayout title = new LinearLayout(getContext());
            title.setOrientation(LinearLayout.VERTICAL);
            title.addView(text(row.label(), 15, Color.WHITE));
            
            if (!row.available()) title.addView(text("Hidden by another extension", 12, 0xffb3b3b3));
            item.addView(title, new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
            
            Button remove = new Button(getContext());

            remove.setText("−");
            remove.setTextSize(24);
            remove.setAllCaps(false);
            remove.setTextColor(0xffb3b3b3);
            remove.setBackgroundColor(Color.TRANSPARENT);
            remove.setContentDescription("Remove " + row.label());
            remove.setOnClickListener(view -> { if (!busy && dragging == null) listener.remove(row.key()); });
            
            item.addView(remove, new LinearLayout.LayoutParams(dp(48), dp(48)));
            item.setFocusable(true);
            item.setContentDescription(row.label() + ". Touch and hold to reorder.");
            
            View.OnLongClickListener hold = view -> beginDrag(item, row.key());

            item.setOnLongClickListener(hold);
            grip.setOnLongClickListener(hold);
            title.setOnLongClickListener(hold);
            
            item.setAccessibilityDelegate(new View.AccessibilityDelegate() {
                @Override
                public void onInitializeAccessibilityNodeInfo(View view, AccessibilityNodeInfo info) {
                    super.onInitializeAccessibilityNodeInfo(view, info);
                    
                    int index = indexOf(row.key());

                    if (index > 0) info.addAction(new AccessibilityNodeInfo.AccessibilityAction(MOVE_EARLIER, "Move earlier"));
                    if (index >= 0 && index < rows.size() - 1) info.addAction(new AccessibilityNodeInfo.AccessibilityAction(MOVE_LATER, "Move later"));
                }
                @Override 
                public boolean performAccessibilityAction(View view, int action, Bundle args) {
                    if (!busy && dragging == null && (action == MOVE_EARLIER || action == MOVE_LATER)) {
                        int index = indexOf(row.key()), next = index + (action == MOVE_EARLIER ? -1 : 1);
                        
                        if (index >= 0 && next >= 0 && next < rows.size()) {
                            rows.add(next, rows.remove(index));
                            
                            rebuild();
                            setBusy(true);
                            
                            listener.reorder(keys());
                            announceForAccessibility(row.label() + " moved to position " + (next + 1));

                            return true;
                        }
                    }
                    
                    return super.performAccessibilityAction(view, action, args);
                }
            });
        }
    }

    private boolean beginDrag(View item, String key) {
        if (busy || dragging != null) return false;
        
        original = new ArrayList<>(rows);
        dragging = key;
        draggedView = item;
        dropped = false;

        item.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
        boolean started = item.startDragAndDrop(ClipData.newPlainText("sleep-timer", key), new View.DragShadowBuilder(item), this, 0);
        
        if (started) { 
            item.setAlpha(.35f); requestDisallowInterceptTouchEvent(true); 
        } else {
            releaseDrag();
        }

        return started;
    }

    private boolean drag(View view, DragEvent event) {
        if (event.getLocalState() != this) return false;
        
        switch (event.getAction()) {
            case DragEvent.ACTION_DRAG_STARTED: return dragging != null;
            case DragEvent.ACTION_DRAG_LOCATION:
                if (dragging == null) return true;

                pointerY = event.getY() - getScrollY();
                moveAt(event.getY());
                int direction = pointerY < dp(56) ? -1 : pointerY > getHeight() - dp(56) ? 1 : 0;
                
                if (direction != scrollDirection) {
                    removeCallbacks(edgeScroll);
                    scrollDirection = direction;
                    
                    if (direction != 0) postOnAnimation(edgeScroll);
                }
                return true;
            case DragEvent.ACTION_DRAG_EXITED:
                scrollDirection = 0;
                removeCallbacks(edgeScroll);
                
                return true;
            case DragEvent.ACTION_DROP:
                dropped = true;
                removeCallbacks(edgeScroll);
                
                if (original != null && !rows.equals(original)) {
                    setBusy(true);
                    listener.reorder(keys());
                }
                
                return true;
            case DragEvent.ACTION_DRAG_ENDED:
                if (!dropped && original != null) { rows.clear(); rows.addAll(original); }
                
                releaseDrag();
                rebuild();
                
                return true;
            default: return true;
        }
    }

    private void moveAt(float y) {
        if (dragging == null) return;
        
        int index = indexOf(dragging), destination = 0;
        if (index < 0) return;

        for (int i = 0; i < list.getChildCount(); i++) {
            View child = list.getChildAt(i);
            if (child != draggedView && y > child.getTop() + child.getHeight() / 2f) destination++;
        }
        
        if (destination != index) {
            Row row = rows.remove(index);

            rows.add(Math.min(destination, rows.size()), row);
            list.removeView(draggedView);
            list.addView(draggedView, Math.min(destination, list.getChildCount()));
        }
    }

    private int indexOf(String key) {
        for (int i = 0; i < rows.size(); i++) {
            if (rows.get(i).key().equals(key)) return i;
        }

        return -1;
    }
    
    private List<String> keys() {
        List<String> keys = new ArrayList<>();

        for (Row row : rows) {
            keys.add(row.key());
        }

        return keys;
    }
    
    private int dp(float value) { 
        return Math.round(value * getResources().getDisplayMetrics().density); 
    }

    private TextView text(String value, float size, int color) {
        TextView text = new TextView(getContext());
        text.setText(value); text.setTextSize(size); text.setTextColor(color);
        text.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        
        return text;
    }

    private GradientDrawable background(int color) {
        GradientDrawable shape = new GradientDrawable(); 
        shape.setColor(color); 
        shape.setCornerRadius(dp(12)); 
        
        return shape;
    }

    private void releaseDrag() {
        removeCallbacks(edgeScroll);

        if (draggedView != null) draggedView.setAlpha(1);
        dragging = null; draggedView = null; original = null; scrollDirection = 0;
        
        requestDisallowInterceptTouchEvent(false);
    }

    public void release() { 
        releaseDrag(); 
        list.setOnDragListener(null); 
    }

    @Override 
    protected void onDetachedFromWindow() { 
        releaseDrag(); 
        super.onDetachedFromWindow(); 
    }
}