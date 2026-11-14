package dev.daisy.clientcore.ui.widget

import dev.daisy.clientcore.module.Module
import dev.daisy.clientcore.safety.ServerSafety
import dev.daisy.clientcore.ui.ClientUi
import dev.daisy.clientcore.ui.DaisyIcons
import dev.daisy.clientcore.ui.DaisyText
import net.minecraft.client.Minecraft
//? if >=26.1 {
/*import dev.daisy.clientcore.compat.*
*///?} else {
import net.minecraft.client.gui.GuiGraphics
//?}
import kotlin.math.roundToInt

/** Module card rendering and control hit regions; selection belongs to the screen. */
class ModuleCardRenderer(
    private val registerHit: (Int, Int, Int, Int, () -> Unit) -> Unit,
    private val openPanel: (Module) -> Unit
) {
    private val font get() = Minecraft.getInstance().font
    private fun lay(overlay: Int, base: Int) = if (ClientUi.glassFrame) overlay else ClientUi.over(overlay, base)
    private fun trim(text: String, width: Int): String {
        if (width <= 0) return ""
        if (font.width(text) <= width) return text
        var shortened = text
        while (shortened.isNotEmpty() && font.width("$shortened…") > width) shortened = shortened.dropLast(1)
        return "$shortened…"
    }

    fun draw(g: GuiGraphics, module: Module, x: Int, y: Int, w: Int, h: Int, mouseX: Int, mouseY: Int, inContent: Boolean, selected: Boolean) {
        val hovered = inContent && mouseX in x..(x + w) && mouseY in y..(y + h)
        val anim = ClientUi.hover("card:${module.id}", hovered)
        val lift = (anim * 2f).roundToInt()
        val cy = y - lift

        if (module.comingSoon) {
            ClientUi.drawModuleCard(g, x, y, w, h, 0f, false, false)
            DaisyIcons.draw(g, module.icon, x + 15, y + (h - 16) / 2, 16, ClientUi.alpha(ClientUi.DIM, 0.7f))
            g.drawString(font, trim(module.displayName, w - 54), x + 44, y + 11, ClientUi.DIM, true)
            // Big, centred "Soon..." — light grey, shadowed, no tag chrome.
            val label = "Soon..."
            val scale = 2f
            val lw = font.width(label) * scale
            val lh = font.lineHeight * scale
            val pose = g.pose()
//? if >=1.21.6 {
            pose.pushMatrix()
            pose.translate(x + (w - lw) / 2f, y + h - lh - 6f)
            pose.scale(scale, scale)
//?} else {
/*            pose.pushPose()
            pose.translate(x + (w - lw) / 2f, y + h - lh - 6f, 0f)
            pose.scale(scale, scale, 1f)
*///?}
            g.drawString(font, label, 0, 0, 0xFFC2C6D0.toInt(), true)
//? if >=1.21.6 {
            pose.popMatrix()
//?} else {
/*            pose.popPose()
*///?}
            return
        }

        ClientUi.drawModuleCard(g, x, cy, w, h, anim, selected, module.enabled)
        // Body click opens the settings panel; the control hits below are registered later, so they win.
        registerHit(x, y, w, h) { openPanel(module) }
        if (module.enabled) {
            val allowed = ServerSafety.allows(module)
            // With round cards the glow already says "on"; the bar stays for a module the server blocks.
            if (!allowed || !dev.daisy.clientcore.ui.DaisyShapes.available) {
                val barColor = if (allowed) ClientUi.mix(ClientUi.ACCENT_A, ClientUi.ACCENT_B, 0.6f) else ClientUi.WARNING
                ClientUi.fillRounded(g, x + 3, cy + 10, 2, h - 20, 1, barColor)
            }
        }

        // Name and description as one block centred in the card, the icon centred beside it.
        val nameY = cy + (h - 23) / 2
        val descY = nameY + 14
        DaisyIcons.draw(g, module.icon, x + 14, cy + (h - 16) / 2, 16, if (module.enabled) ClientUi.TEXT else ClientUi.MUTED)

        // The cog and star only show while the card is hovered - or the star while it is a
        // favourite - so a page of cards is not a page of icons. They sit on the name's
        // line, left of the toggle, which leaves the description the card's full width.
        val controls = maxOf(anim, if (selected) 1f else 0f)
        val textX = x + 40
        val rightZone = if (controls > 0.01f) 92 else if (module.favorite) 72 else 56
        val name = trim(module.displayName, w - (textX - x) - rightZone)
        DaisyText.drawBold(g, font, name, textX, nameY, if (module.enabled) ClientUi.TEXT else ClientUi.mix(ClientUi.MUTED, ClientUi.TEXT, anim))
        if (module.keybind >= 0) {
            // The bound key as a small keycap after the name.
            val key = dev.daisy.clientcore.ui.widget.InputNames.keyName(module.keybind)
            val kx = textX + DaisyText.boldWidth(font, name) + 6
            val kw = font.width(key) + 8
            if (kx + kw < x + w - rightZone) {
                ClientUi.fillRounded(g, kx, nameY - 2, kw, 12, 3, lay(ClientUi.alpha(ClientUi.ACCENT_B, 0.16f), ClientUi.PANEL_ALT))
                ClientUi.drawRoundedBorder(g, kx, nameY - 2, kw, 12, 3, ClientUi.alpha(ClientUi.ACCENT_B, 0.45f))
                g.drawString(font, key, kx + 4, nameY, ClientUi.ACCENT_B, false)
            }
        }

        val descColor: Int
        val desc: String
        when {
            module.enabled && ServerSafety.cinematicMode -> {
                desc = "Paused by cinematic mode"
                descColor = ClientUi.WARNING
            }
            else -> {
                desc = module.description
                descColor = ClientUi.DIM
            }
        }
        g.drawString(font, trim(desc, w - (textX - x) - 14), textX, descY, descColor, false)

        // The toggle lines up with the name; hit boxes follow the same offset from y.
        val rowShift = nameY - cy
        ClientUi.drawMinimalToggle(g, x + w - 48, nameY - 2, module.enabled, hovered, id = "card:${module.id}")
        registerHit(x + w - 50, y + rowShift - 5, 38, 18) { module.enabled = !module.enabled }

        val starX = x + w - 66
        val starHovered = inContent && mouseX in (starX - 3)..(starX + 13) && mouseY in (y + rowShift - 5)..(y + rowShift + 11)
        val starColor = when {
            module.favorite -> 0xFFFFD46B.toInt()
            starHovered -> ClientUi.TEXT
            else -> ClientUi.alpha(ClientUi.DIM, controls)
        }
        if (module.favorite || controls > 0.01f) DaisyIcons.draw(g, "star", starX, nameY - 1, 11, starColor)
        registerHit(starX - 3, y + rowShift - 5, 16, 16) { module.favorite = !module.favorite }

        val gearX = starX - 17
        val gearHovered = inContent && mouseX in (gearX - 3)..(gearX + 13) && mouseY in (y + rowShift - 5)..(y + rowShift + 11)
        if (controls > 0.01f) {
            val gearColor = if (gearHovered || selected) ClientUi.ACCENT_B else ClientUi.DIM
            DaisyIcons.draw(g, "gear", gearX, nameY - 1, 11, ClientUi.alpha(gearColor, controls))
        }
        registerHit(gearX - 3, y + rowShift - 5, 16, 16) { openPanel(module) }
    }

}
