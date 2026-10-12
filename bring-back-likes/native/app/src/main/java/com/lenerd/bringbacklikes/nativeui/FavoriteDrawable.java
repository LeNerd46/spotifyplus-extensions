package com.lenerd.bringbacklikes.nativeui;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;

final class FavoriteDrawable extends Drawable {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path = new Path();
    private final Path filledPath = new Path();
    private boolean filled;

    FavoriteDrawable() {
        paint.setColor(Color.WHITE);
        path.setFillType(Path.FillType.EVEN_ODD);
        path.moveTo(480, -120);
        path.lineTo(422, -172);
        path.quadTo(321, -263, 255, -329);
        path.quadTo(189, -395, 150, -447.5f);
        path.quadTo(111, -500, 95.5f, -544);
        path.quadTo(80, -588, 80, -634);
        path.quadTo(80, -728, 143, -791);
        path.quadTo(206, -854, 300, -854);
        path.quadTo(352, -854, 399, -832);
        path.quadTo(446, -810, 480, -770);
        path.quadTo(514, -810, 561, -832);
        path.quadTo(608, -854, 660, -854);
        path.quadTo(754, -854, 817, -791);
        path.quadTo(880, -728, 880, -634);
        path.quadTo(880, -588, 864.5f, -544);
        path.quadTo(849, -500, 810, -447.5f);
        path.quadTo(771, -395, 705, -329);
        path.quadTo(639, -263, 538, -172);

        path.close();
        
        filledPath.set(path);
        path.moveTo(480, -228);
        path.quadTo(576, -314, 638, -375.5f);
        path.quadTo(700, -437, 736, -482.5f);
        path.quadTo(772, -528, 786, -563.5f);
        path.quadTo(800, -599, 800, -634);
        path.quadTo(800, -694, 760, -734);
        path.quadTo(720, -774, 660, -774);
        path.quadTo(613, -774, 573, -747.5f);
        path.quadTo(533, -721, 518, -680);
        path.lineTo(442, -680);
        path.quadTo(427, -721, 387, -747.5f);
        path.quadTo(347, -774, 300, -774);
        path.quadTo(240, -774, 200, -734);
        path.quadTo(160, -694, 160, -634);
        path.quadTo(160, -599, 174, -563.5f);
        path.quadTo(188, -528, 224, -482.5f);
        path.quadTo(260, -437, 322, -375.5f);
        path.quadTo(384, -314, 480, -228);
        
        path.close();
    }

    @Override public void draw(Canvas canvas) {
        int saved = canvas.save();
        canvas.translate(getBounds().left, getBounds().top);
        canvas.scale(getBounds().width() / 960f, getBounds().height() / 960f);
        canvas.translate(0, 960);
        canvas.drawPath(filled ? filledPath : path, paint);
        canvas.restoreToCount(saved);
    }
    
    void setFilled(boolean filled) { this.filled = filled; invalidateSelf(); }
    
    @Override public void setAlpha(int alpha) { paint.setAlpha(alpha); invalidateSelf(); }
    @Override public void setColorFilter(ColorFilter filter) { paint.setColorFilter(filter); invalidateSelf(); }
    @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    @Override public int getIntrinsicWidth() { return 24; }
    @Override public int getIntrinsicHeight() { return 24; }
}
