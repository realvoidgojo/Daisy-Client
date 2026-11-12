package dev.daisy.clientcore.module.impl

import dev.daisy.clientcore.ClientCore
import dev.daisy.clientcore.module.Module
import dev.daisy.clientcore.module.ModuleCategory
import dev.daisy.clientcore.module.ModuleEditorProfile
import dev.daisy.clientcore.module.settings.ChoiceSetting
import dev.daisy.clientcore.module.settings.Setting

/**
 * The Daisy watermark. Draws only over menus (pause, inventory, ...) — see
 * [dev.daisy.clientcore.hud.WatermarkRenderer]. This module just holds the toggle
 * and the corner choice; it has no in-world HUD element to place.
 */
class WatermarkModule : Module("watermark", "Watermark", "Daisy logo in the corner of menus", ModuleCategory.VISUAL, "flag", 0, 0) {

    override val editorProfile: ModuleEditorProfile = ModuleEditorProfile.MINIMAL
    override fun acceptsDraggablePosition(): Boolean = false
    override fun showPositionControlsInEditor(): Boolean = false

    private val corners = listOf("Top left", "Top right", "Bottom left", "Bottom right")

    override fun addModuleSettings(list: MutableList<Setting>) {
        list.add(ChoiceSetting(
            "Corner",
            corners,
            { corners.getOrElse(ClientCore.config.watermarkCorner) { corners.last() } },
            { ClientCore.config.watermarkCorner = corners.indexOf(it).coerceAtLeast(0) }
        ))
    }
}
