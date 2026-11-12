package dev.daisy.clientcore

import net.fabricmc.api.ClientModInitializer

object ClientCore : ClientModInitializer {
    const val MOD_ID = "clientcore"
    const val DISPLAY_NAME = "Fabric + Daisy"

    val config
        get() = DaisyRuntime.config

    override fun onInitializeClient() {
        DaisyRuntime.initialize()
    }
}
