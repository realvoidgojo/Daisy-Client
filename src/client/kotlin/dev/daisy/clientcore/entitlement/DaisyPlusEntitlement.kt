package dev.daisy.clientcore.entitlement

import net.minecraft.client.Minecraft
import java.util.UUID

/**
 * Gate for Daisy Client+ premium features (nametag text effects, future cosmetics).
 *
 * Currently a stub:
 *  - [isOwnEntitled] returns false until the Daisy Client+ service ships.
 *  - [isEntitled] returns false for everyone for now.
 *
 * When the Daisy Client+ backend is added, replace the stub with a roster fetch
 * (signed JSON of entitled UUIDs from the updates worker) cached in memory.
 */
object DaisyPlusEntitlement {

    @Volatile
    private var entitledUuids: Set<UUID> = emptySet()

    @Volatile
    private var rosterLoadedAt: Long = 0L

    @JvmStatic
    fun isOwnEntitled(): Boolean = isEntitled(Minecraft.getInstance().user.profileId)

    @JvmStatic
    fun isEntitled(uuid: UUID): Boolean = entitledUuids.contains(uuid)

    @JvmStatic
    fun isAvailable(): Boolean = false

    @JvmStatic
    fun setRoster(uuids: Set<UUID>) {
        entitledUuids = uuids.toSet()
        rosterLoadedAt = System.currentTimeMillis()
    }

    @JvmStatic
    fun lastRosterRefresh(): Long = rosterLoadedAt
}
