package dev.daisy.clientcore.module

import dev.daisy.clientcore.module.impl.ArmorHudModule
import dev.daisy.clientcore.module.impl.AutoGGModule
import dev.daisy.clientcore.module.impl.AutoReconnectModule
import dev.daisy.clientcore.module.impl.ChatTweaksModule
import dev.daisy.clientcore.module.impl.BlockOutlineModule
import dev.daisy.clientcore.module.impl.CapeModule
import dev.daisy.clientcore.module.impl.CoordsCopyModule
import dev.daisy.clientcore.module.impl.CombatVisualsModule
import dev.daisy.clientcore.module.impl.CosmeticsModule
import dev.daisy.clientcore.module.impl.CountersModule
import dev.daisy.clientcore.module.impl.CoordinatesModule
import dev.daisy.clientcore.module.impl.StatsModule
import dev.daisy.clientcore.module.impl.TimeModule
import dev.daisy.clientcore.module.impl.TpsModule
import dev.daisy.clientcore.module.impl.ServerAddressModule
import dev.daisy.clientcore.module.impl.SaturationModule
import dev.daisy.clientcore.module.impl.DayCounterModule
import dev.daisy.clientcore.module.impl.PackDisplayModule
import dev.daisy.clientcore.module.impl.ParticlesModule
import dev.daisy.clientcore.module.impl.StopwatchModule
import dev.daisy.clientcore.module.impl.CrosshairModule
import dev.daisy.clientcore.module.impl.EnabledModulesModule
import dev.daisy.clientcore.module.impl.FreelookModule
import dev.daisy.clientcore.module.impl.LyricsModule
import dev.daisy.clientcore.module.impl.SkyEffectsModule
import dev.daisy.clientcore.module.impl.ContainerPreviewModule
import dev.daisy.clientcore.module.impl.FullbrightModule
import dev.daisy.clientcore.module.impl.MacrosModule
import dev.daisy.clientcore.module.impl.InventoryHudModule
import dev.daisy.clientcore.module.impl.KeystrokesModule
import dev.daisy.clientcore.module.impl.NameTagModule
import dev.daisy.clientcore.module.impl.PerformanceModule
import dev.daisy.clientcore.module.impl.PerspectiveModule
import dev.daisy.clientcore.module.impl.NowPlayingModule
import dev.daisy.clientcore.module.impl.PotionHudModule
import dev.daisy.clientcore.module.impl.ReachDisplayModule
import dev.daisy.clientcore.module.impl.ScoreboardModule
import dev.daisy.clientcore.module.impl.TiersModule
import dev.daisy.clientcore.module.impl.TotemCounterModule
import dev.daisy.clientcore.module.impl.CooldownHudModule
import dev.daisy.clientcore.module.impl.HitColorModule
import dev.daisy.clientcore.module.impl.FlySpeedModule
import dev.daisy.clientcore.module.impl.FogModule
import dev.daisy.clientcore.module.impl.TimeChangerModule
import dev.daisy.clientcore.module.impl.ToggleSprintModule
import dev.daisy.clientcore.module.impl.ViewModelModule
import dev.daisy.clientcore.module.impl.WatermarkModule
import dev.daisy.clientcore.module.impl.WaypointsModule
import dev.daisy.clientcore.module.impl.ZoomModule
import net.minecraft.client.Minecraft
//? if >=26.1 {
/*import dev.daisy.clientcore.compat.*
*///?} else {
import net.minecraft.client.gui.GuiGraphics
//?}

object ModuleRegistry {
    private val modulesById = LinkedHashMap<String, Module>()

    /** Registration only happens in [bootstrap], so the list is built once and reused
     *  (the old getter allocated a fresh copy on every access, every frame). */
    private var cachedAll: List<Module> = emptyList()

    val all: List<Module>
        get() = cachedAll

    fun bootstrap() {
        if (modulesById.isNotEmpty()) return

        // HUD
        register(NowPlayingModule())
        register(StatsModule())
        register(TimeModule())
        register(TpsModule())
        register(ServerAddressModule())
        register(SaturationModule())
        register(DayCounterModule())
        register(PackDisplayModule())
        register(StopwatchModule())
        register(CoordinatesModule())
        register(KeystrokesModule())
        register(ArmorHudModule())
        register(PotionHudModule())
        register(InventoryHudModule())
        register(EnabledModulesModule())
        // Performance + Perf Stats removed: the default-on entity occlusion culling ran a
        // per-tick raycast over every entity on the render thread, which tanked FPS and
        // added input lag on weaker CPUs. Unregistering (rather than deleting the classes)
        // makes every perf mixin's ModuleRegistry.get("performance") null-check revert to
        // vanilla, with no risk of a mixin/startup break.
        register(CountersModule())
        register(TotemCounterModule())
        register(CooldownHudModule())
        register(ReachDisplayModule())

        // Visual
        register(CrosshairModule())
        register(ZoomModule())
        register(FullbrightModule())
        register(ContainerPreviewModule())
        register(BlockOutlineModule())
        register(HitColorModule())
        register(FogModule())
        register(CombatVisualsModule())
        register(ParticlesModule())
        register(ScoreboardModule())

        // Gameplay
        register(ToggleSprintModule())
        register(FreelookModule())
        register(FlySpeedModule())
        register(PerspectiveModule())
        register(ViewModelModule())

        // Utility
        register(WaypointsModule())
        register(ChatTweaksModule())
        register(MacrosModule())
        register(TiersModule())
        register(CoordsCopyModule())
        register(TimeChangerModule())
        register(AutoReconnectModule())
        register(AutoGGModule())

        // Cosmetics
        register(NameTagModule())
        register(WatermarkModule())
        register(CapeModule())
        register(CosmeticsModule())
        register(LyricsModule())
        register(SkyEffectsModule())

        cachedAll = modulesById.values.toList()
    }

    fun byCategory(category: ModuleCategory): List<Module> = all.filter { it.category == category && it.showInMenu }

    fun search(query: String): List<Module> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return all.filter { it.showInMenu }
        return all.filter {
            it.showInMenu && (
                it.displayName.lowercase().contains(q) ||
                    it.description.lowercase().contains(q) ||
                    it.id.replace('_', ' ').contains(q)
                )
        }
    }

    fun tick(client: Minecraft) {
        val modules = cachedAll
        for (i in modules.indices) {
            val module = modules[i]
            if (module.active) {
                module.tick(client)
            }
        }
        // These keep vanilla state consistent, so they run even while inactive.
        get<FullbrightModule>("fullbright")?.sync(client)
        get<ToggleSprintModule>("toggle_sprint")?.sync(client)
        get<FreelookModule>("freelook")?.sync(client)
        get<FlySpeedModule>("fly_speed")?.sync(client)
    }

    fun render(client: Minecraft, graphics: GuiGraphics, tickDelta: Float) {
        // Indexed loop with the scale transform inlined: no iterator or closure
        // allocations in the per-frame HUD path.
        val modules = cachedAll
        val only = dev.daisy.clientcore.dev.DevShot.hudOnly
        for (i in modules.indices) {
            val module = modules[i]
            if (!module.active) continue
            if (only != null && module.id != only) continue
            val scale = module.scaleFactor()
            if (scale == 1f) {
                module.withTextStyle { module.render(client, graphics, tickDelta) }
            } else {
                val pose = graphics.pose()
//? if >=1.21.6 {
                pose.pushMatrix()
                pose.translate(module.x.toFloat(), module.y.toFloat())
                pose.scale(scale, scale)
                pose.translate(-module.x.toFloat(), -module.y.toFloat())
//?} else {
/*                pose.pushPose()
                pose.translate(module.x.toFloat(), module.y.toFloat(), 0f)
                pose.scale(scale, scale, 1f)
                pose.translate(-module.x.toFloat(), -module.y.toFloat(), 0f)
*///?}
                module.withTextStyle { module.render(client, graphics, tickDelta) }
//? if >=1.21.6 {
                pose.popMatrix()
//?} else {
/*                pose.popPose()
*///?}
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    fun <T : Module> get(id: String): T? = modulesById[id] as? T

    private fun register(module: Module) {
        modulesById[module.id] = module
    }
}
