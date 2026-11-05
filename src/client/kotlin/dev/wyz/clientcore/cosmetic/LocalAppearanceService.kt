package dev.wyz.clientcore.cosmetic

import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import net.minecraft.client.Minecraft
import java.io.File
import java.security.MessageDigest
import java.util.UUID

/**
 * Service managing local-player custom appearance (skin, cape, model type).
 * Persists selected appearance locally and ties it to the active Minecraft account.
 * Automatically discovers skins equipped via the Daisy launcher or CustomSkinLoader.
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
     * Falls back to launcher/local synchronized skin if not explicitly saved in local_appearance.json.
     */
    @JvmStatic
    fun getLocalAppearance(): PlayerAppearance? {
        val activeUuid = runCatching { Minecraft.getInstance().user.profileId }.getOrNull()
        val current = localAppearance ?: discoverFromLauncherOrDisk()
        if (current == null) return null

        return if (activeUuid != null && current.uuid != activeUuid.toString().replace("-", "").lowercase()) {
            current.copy(uuid = activeUuid.toString().replace("-", "").lowercase())
        } else {
            current
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
        if (localAppearance == null) {
            localAppearance = discoverFromLauncherOrDisk()
        }
    }

    /**
     * Discovers active skin exported by the Daisy launcher into CustomSkinLoader or daisy-launcher directories.
     */
    private fun discoverFromLauncherOrDisk(): PlayerAppearance? {
        val username = runCatching { Minecraft.getInstance().user.name }.getOrNull()?.trim() ?: return null
        val uuid = runCatching { Minecraft.getInstance().user.profileId.toString() }.getOrDefault(UUID.randomUUID().toString())
        val gameDir = Minecraft.getInstance().gameDirectory

        // 1. Check local instance CustomSkinLoader sync: CustomSkinLoader/LocalSkin/skins/<name>.png
        val localSkinFile = File(gameDir, "CustomSkinLoader/LocalSkin/skins/$username.png")
        if (localSkinFile.exists() && localSkinFile.isFile && localSkinFile.length() > 0) {
            val asset = cacheFileToAsset(localSkinFile)
            if (asset != null) {
                return PlayerAppearance(uuid, asset, null, SkinModel.CLASSIC)
            }
        }

        // 2. Check launcher skin history: AppData/Roaming/daisy-launcher/skins/skin-history-<name>.json
        val appData = System.getenv("APPDATA")
        if (appData != null) {
            val historyFile = File(appData, "daisy-launcher/skins/skin-history-$username.json")
            if (historyFile.exists() && historyFile.isFile) {
                runCatching {
                    val root = JsonParser.parseString(historyFile.readText()).asJsonObject
                    val skins = root.getAsJsonArray("skins")
                    if (skins != null && skins.size() > 0) {
                        val skinObj = skins.firstOrNull { it.asJsonObject.get("active")?.asBoolean == true }?.asJsonObject
                            ?: skins.get(0).asJsonObject
                        val path = skinObj.get("path")?.asString
                        val variant = skinObj.get("variant")?.asString
                        if (!path.isNullOrEmpty()) {
                            val file = File(path)
                            if (file.exists() && file.isFile && file.length() > 0) {
                                val asset = cacheFileToAsset(file)
                                if (asset != null) {
                                    val model = if (variant.equals("slim", ignoreCase = true)) SkinModel.SLIM else SkinModel.CLASSIC
                                    return PlayerAppearance(uuid, asset, null, model)
                                }
                            }
                        }
                    }
                }
            }
        }

        return null
    }

    private fun cacheFileToAsset(file: File): AppearanceAsset? {
        return runCatching {
            val bytes = file.readBytes()
            val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
            val hash = digest.joinToString("") { "%02x".format(it) }

            // Copy into daisy cache directory so AppearanceAssetCache can serve it directly
            val cacheDir = File(Minecraft.getInstance().gameDirectory, "daisy/cache/assets")
            if (!cacheDir.exists()) cacheDir.mkdirs()
            val target = File(cacheDir, "$hash.png")
            if (!target.exists()) {
                target.writeBytes(bytes)
            }

            AppearanceAsset(
                assetId = hash,
                url = file.toURI().toString(),
                sha256 = hash
            )
        }.getOrNull()
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
