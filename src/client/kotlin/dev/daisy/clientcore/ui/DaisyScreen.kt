package dev.daisy.clientcore.ui

/** Marker for Daisy Client screens so shared hooks (watermark, HUD) can skip them. */
interface DaisyScreen {
    /**
     * Whether this screen runs at Daisy's display-relative GUI scale cap (see
     * WindowGuiScaleMixin). True for menus, which are laid out for a fixed virtual size.
     * False for anything that has to match the in-game HUD pixel for pixel.
     */
    fun capsGuiScale(): Boolean = true
}
