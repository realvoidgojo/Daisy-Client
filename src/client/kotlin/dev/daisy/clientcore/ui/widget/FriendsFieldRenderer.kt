package dev.daisy.clientcore.ui.widget

import dev.daisy.clientcore.ui.ClientUi
import dev.daisy.clientcore.ui.DaisyIcons
import net.minecraft.client.Minecraft
//? if >=26.1 {
/*import dev.daisy.clientcore.compat.*
*///?} else {
import net.minecraft.client.gui.GuiGraphics
//?}

/** Text field drawing, cursor and counter; text/focus state remain in the screen. */
class FriendsFieldRenderer(
    private val background: () -> Int,
    private val focusChangedAt: () -> Long,
    private val registerHit: (Int, Int, Int, Int, () -> Unit) -> Unit
) {
    private val font get() = Minecraft.getInstance().font
    private fun inside(mx: Int, my: Int, x: Int, y: Int, w: Int, h: Int) = mx >= x && mx < x + w && my >= y && my < y + h
    private fun trim(text: String, width: Int): String {
        if (width <= 0) return ""
        if (font.width(text) <= width) return text
        var shortened = text
        while (shortened.isNotEmpty() && font.width("$shortened…") > width) shortened = shortened.dropLast(1)
        return "$shortened…"
    }
    private fun tail(text: String, width: Int): String {
        if (width <= 0 || font.width(text) <= width) return text
        var shortened = text
        while (shortened.isNotEmpty() && font.width(shortened) > width) shortened = shortened.drop(1)
        return shortened
    }

    fun draw(
        g: GuiGraphics, x: Int, y: Int, w: Int, h: Int, mx: Int, my: Int,
        text: String, placeholder: String, focused: Boolean, icon: String?, key: String,
        limit: Int = 0, reserve: Int = 0, onFocus: () -> Unit
    ) {
        val hovered = inside(mx, my, x, y, w, h)
        val anim = ClientUi.hover(key, hovered || focused)
        g.fill(x, y, x + w, y + h, background())
        val border = if (focused) ClientUi.alpha(ClientUi.ACCENT_B, 0.85f)
            else ClientUi.mix(ClientUi.BORDER, ClientUi.over(ClientUi.alpha(0xFFFFFFFF.toInt(), 0.14f), ClientUi.BORDER), anim)
        ClientUi.drawRoundedBorder(g, x, y, w, h, 0, border)

        var tx = x + 7
        if (icon != null) {
            DaisyIcons.draw(g, icon, x + 6, y + (h - 9) / 2, 9, if (focused) ClientUi.ACCENT_B else ClientUi.DIM)
            tx = x + 20
        }
        val ty = y + (h - 8) / 2
        val counter = if (limit > 0 && text.length > limit - 56) "${text.length}/$limit" else ""
        val counterW = if (counter.isNotEmpty()) font.width(counter) + 8 else 0
        val room = x + w - 6 - reserve - counterW - tx
        if (text.isEmpty() && !focused) {
            g.drawString(font, trim(placeholder, room), tx, ty, ClientUi.DIM, false)
        } else if (text.isEmpty()) {
            g.drawString(font, trim(placeholder, room), tx, ty, ClientUi.alpha(ClientUi.DIM, 0.6f), false)
        }
        // A long message shows its end, where the typing is happening.
        val visible = tail(text, room - 2)
        if (visible.isNotEmpty()) g.drawString(font, visible, tx, ty, ClientUi.TEXT, false)
        if (focused && ((System.currentTimeMillis() - focusChangedAt()) / 530) % 2 == 0L) {
            val cx = tx + font.width(visible) + 1
            g.fill(cx, ty - 1, cx + 1, ty + 9, ClientUi.TEXT)
        }
        if (counter.isNotEmpty()) {
            val over = text.length >= limit
            g.drawString(font, counter, x + w - 6 - reserve - font.width(counter), ty, if (over) ClientUi.DANGER else ClientUi.DIM, false)
        }
        registerHit(x, y, w, h, onFocus)
    }

}
