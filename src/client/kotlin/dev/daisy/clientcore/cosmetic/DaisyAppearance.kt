package dev.daisy.clientcore.cosmetic

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser

//? if >=1.21.9 {
import net.minecraft.world.entity.player.PlayerSkin
import java.util.Optional
//?} else {
/*import net.minecraft.client.resources.PlayerSkin
*///?}

/**
 * Shared appearance model for offline/custom skins and capes.
 */
data class AppearanceAsset(
    val assetId: String,
    val url: String,
    val sha256: String
)

enum class SkinModel(val id: String) {
    CLASSIC("classic"),
    SLIM("slim");

    companion object {
        fun fromId(raw: String?): SkinModel =
            if (raw.equals("slim", ignoreCase = true)) SLIM else CLASSIC
    }
}

data class PlayerAppearance(
    val uuid: String,
    val skin: AppearanceAsset?,
    val cape: AppearanceAsset?,
    val model: SkinModel = SkinModel.CLASSIC,
    val updatedAt: Long = System.currentTimeMillis()
) {
    fun toJson(): JsonObject {
        val root = JsonObject()
        root.addProperty("uuid", uuid)
        root.addProperty("model", model.id)
        root.addProperty("updatedAt", updatedAt)

        if (skin != null) {
            val sObj = JsonObject()
            sObj.addProperty("assetId", skin.assetId)
            sObj.addProperty("url", skin.url)
            sObj.addProperty("sha256", skin.sha256)
            root.add("skin", sObj)
        }
        if (cape != null) {
            val cObj = JsonObject()
            cObj.addProperty("assetId", cape.assetId)
            cObj.addProperty("url", cape.url)
            cObj.addProperty("sha256", cape.sha256)
            root.add("cape", cObj)
        }
        return root
    }

    companion object {
        fun fromJson(obj: JsonObject): PlayerAppearance? {
            val uuid = obj.get("uuid")?.asString?.trim() ?: return null
            if (uuid.isEmpty()) return null

            val model = SkinModel.fromId(obj.get("model")?.asString)
            val updatedAt = obj.get("updatedAt")?.asLong ?: System.currentTimeMillis()

            val skin = obj.getAsJsonObject("skin")?.let { s ->
                val assetId = s.get("assetId")?.asString ?: ""
                val url = s.get("url")?.asString ?: ""
                val sha256 = s.get("sha256")?.asString ?: ""
                if (url.isNotEmpty() && sha256.isNotEmpty()) AppearanceAsset(assetId, url, sha256) else null
            }

            val cape = obj.getAsJsonObject("cape")?.let { c ->
                val assetId = c.get("assetId")?.asString ?: ""
                val url = c.get("url")?.asString ?: ""
                val sha256 = c.get("sha256")?.asString ?: ""
                if (url.isNotEmpty() && sha256.isNotEmpty()) AppearanceAsset(assetId, url, sha256) else null
            }

            return PlayerAppearance(uuid, skin, cape, model, updatedAt)
        }

//? if <1.21.9 {
/*        @JvmStatic
        fun applyLegacySkin(current: PlayerSkin, appearance: PlayerAppearance): PlayerSkin {
            val skinAsset = appearance.skin ?: return current
            val skinId = AppearanceAssetCache.getOrLoadTexture(skinAsset, false) ?: return current
            val model = if (appearance.model == SkinModel.SLIM) PlayerSkin.Model.SLIM else PlayerSkin.Model.WIDE
            return PlayerSkin(
                skinId,
                current.textureUrl(),
                current.capeTexture(),
                current.elytraTexture(),
                model,
                current.secure()
            )
        }
*///?}
    }
}

