package dev.daisy.clientcore.module.impl

import dev.daisy.clientcore.cosmetic.DaisyCape
import dev.daisy.clientcore.module.Module
import dev.daisy.clientcore.module.ModuleCategory
import dev.daisy.clientcore.module.ModuleEditorProfile
import dev.daisy.clientcore.module.settings.ChoiceSetting
import dev.daisy.clientcore.module.settings.Setting

/**
 * Daisy cape cosmetic: toggle it on and pick a style (Daisy, Sakura Valley, Moonrise).
 * Managed from the Wardrobe screen; other Daisy users on the same server see your exact
 * style via the presence roster. Purely visual. See [dev.daisy.clientcore.cosmetic.DaisyCape].
 */
class CapeModule : Module("cape", "Daisy Cape", "Wear a Daisy cape", ModuleCategory.COSMETICS, "shirt", 0, 0, false) {
    override val editorProfile: ModuleEditorProfile = ModuleEditorProfile.MINIMAL
    override val showInMenu: Boolean = false // managed from the Wardrobe screen
    override fun acceptsDraggablePosition(): Boolean = false
    override fun showPositionControlsInEditor(): Boolean = false

    fun styleIndex(): Int = scalar("style", 0).coerceIn(0, DaisyCape.STYLES.size - 1)

    /** The selected style id (e.g. "river"). */
    fun selectedStyle(): String = DaisyCape.STYLES[styleIndex()]

    fun setStyleIndex(index: Int) = setScalar("style", index.coerceIn(0, DaisyCape.STYLES.size - 1))

    override fun addModuleSettings(list: MutableList<Setting>) {
        list.add(ChoiceSetting(
            "Cape",
            DaisyCape.LABELS,
            { DaisyCape.LABELS[styleIndex()] },
            { setStyleIndex(DaisyCape.LABELS.indexOf(it).coerceAtLeast(0)) }
        ))
    }
}
