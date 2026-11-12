package dev.daisy.clientcore.cosmetic

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Client appearance roster storing custom player appearances by normalized UUID.
 * Thread-safe and atomic.
 */
object AppearanceRoster {

    private val roster = ConcurrentHashMap<String, PlayerAppearance>()

    private fun normalize(uuid: UUID): String =
        uuid.toString().replace("-", "").lowercase()

    private fun normalize(raw: String): String =
        raw.replace("-", "").lowercase()

    fun get(uuid: UUID): PlayerAppearance? =
        roster[normalize(uuid)]

    fun get(rawUuid: String): PlayerAppearance? =
        roster[normalize(rawUuid)]

    fun upsert(appearance: PlayerAppearance) {
        val key = normalize(appearance.uuid)
        val existing = roster[key]
        if (existing == null || appearance.updatedAt >= existing.updatedAt) {
            roster[key] = appearance
        }
    }

    fun remove(rawUuid: String) {
        roster.remove(normalize(rawUuid))
    }

    fun remove(uuid: UUID) {
        roster.remove(normalize(uuid))
    }

    fun setAll(list: List<PlayerAppearance>) {
        roster.clear()
        for (item in list) {
            roster[normalize(item.uuid)] = item
        }
    }

    fun clear() {
        roster.clear()
    }
}

