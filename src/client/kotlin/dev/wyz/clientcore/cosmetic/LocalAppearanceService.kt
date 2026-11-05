package dev.wyz.clientcore.cosmetic

import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import net.minecraft.client.Minecraft
import java.io.File
import java.util.UUID

/**
 * Service managing local-player custom appearance (skin, cape, model type).
 * Persists selected appearance locally and ties it to the active Minecraft account.
 */
object LocalAppearanceService {

    private val gson = GsonBuilder().setPrettyPrinting().create()
    private var localAppearance: PlayerAppearance? = null

    private val configFile: File by lazy {
        val dir = File(Minecraft.getInstance().gameDirectory, "daisy/config")
        if (!dir.exists()) dir.mkdirs()
        File(dir, "local_appearance.json")
    }

    init {
        loadFromDisk()
    }

    /**
     * Checks if the given UUID matches the active local Minecraft user/player.
     */
    @JvmStatic
    fun isLocalPlayer(uuid: UUID?): Boolean {
        if (uuid == null) return false
        val userProfileId = runCatching { Minecraft.getInstance().user.profileId }.getOrNull()
        if (userProfileId != null && userProfileId == uuid) {
            return true
        }
        val localPlayerUuid = runCatching { Minecraft.getInstance().player?.uuid }.getOrNull()
        return localPlayerUuid != null && localPlayerUuid == uuid
    }

    /**
     * Gets the local player's configured appearance, ensuring UUID matches the current user.
     */
    @JvmStatic
    fun getLocalAppearance(): PlayerAppearance? {
        val activeUuid = runCatching { Minecraft.getInstance().user.profileId }.getOrNull() ?: return localAppearance
        val current = localAppearance ?: return null
        return if (current.uuid == activeUuid.toString().replace("-", "").lowercase()) {
            current
        } else {
            // Keep local appearance tied to the active account/profile
            current.copy(uuid = activeUuid.toString().replace("-", "").lowercase())
        }
    }

    /**
     * Sets and saves the local custom appearance.
     */
    @JvmStatic
    fun setLocalAppearance(appearance: PlayerAppearance?) {
        localAppearance = appearance
        saveToDisk()
    }

    /**
     * Sets custom skin for local player with given asset and model type.
     */
    @JvmStatic
    fun setSkin(skinAsset: AppearanceAsset?, model: SkinModel = SkinModel.CLASSIC) {
        val uuid = runCatching { Minecraft.getInstance().user.profileId.toString() }.getOrDefault(UUID.randomUUID().toString())
        val existing = getLocalAppearance()
        val updated = PlayerAppearance(
            uuid = uuid,
            skin = skinAsset,
            cape = existing?.cape,
            model = model,
            updatedAt = System.currentTimeMillis()
        )
        setLocalAppearance(updated)
    }

    /**
     * Sets custom cape for local player.
     */
    @JvmStatic
    fun setCape(capeAsset: AppearanceAsset?) {
        val uuid = runCatching { Minecraft.getInstance().user.profileId.toString() }.getOrDefault(UUID.randomUUID().toString())
        val existing = getLocalAppearance()
        val updated = PlayerAppearance(
            uuid = uuid,
            skin = existing?.skin,
            cape = capeAsset,
            model = existing?.model ?: SkinModel.CLASSIC,
            updatedAt = System.currentTimeMillis()
        )
        setLocalAppearance(updated)
    }

    /**
     * Clears local custom appearance.
     */
    @JvmStatic
    fun clear() {
        localAppearance = null
        runCatching {
            if (configFile.exists()) configFile.delete()
        }
    }

    private fun loadFromDisk() {
        runCatching {
            if (configFile.exists() && configFile.isFile) {
                val json = configFile.readText()
                val obj = JsonParser.parseString(json).asJsonObject
                localAppearance = PlayerAppearance.fromJson(obj)
            }
        }
    }

    private fun saveToDisk() {
        runCatching {
            val app = localAppearance
            if (app != null) {
                val json = gson.toJson(app.toJson())
                configFile.writeText(json)
            } else {
                if (configFile.exists()) configFile.delete()
            }
        }
    }
}

