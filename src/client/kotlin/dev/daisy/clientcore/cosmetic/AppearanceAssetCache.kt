package dev.daisy.clientcore.cosmetic

import com.mojang.blaze3d.platform.NativeImage
import dev.daisy.clientcore.compat.McId
import net.minecraft.client.Minecraft
import net.minecraft.client.renderer.texture.DynamicTexture
//? if >=1.21.9 {
import net.minecraft.core.ClientAsset
//?}
import java.io.ByteArrayInputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Thread-safe disk and in-memory cache for appearance assets (skins & capes).
 * Validates SHA-256 integrity and dimensions before registration.
 * Never executes network downloads on the render thread.
 */
object AppearanceAssetCache {

    private const val CONNECT_TIMEOUT_MS = 5000
    private const val READ_TIMEOUT_MS = 8000
    private const val MAX_FILE_SIZE = 1024 * 1024 // 1 MB limit

    private val pool = Executors.newFixedThreadPool(3) { r ->
        Thread(r, "Daisy-AssetCache").apply { isDaemon = true }
    }

    private val loadedTextures = ConcurrentHashMap<String, McId>()
//? if >=1.21.9 {
    private val clientAssets = ConcurrentHashMap<String, ClientAsset.ResourceTexture>()
//?}
    private val inFlight = ConcurrentHashMap.newKeySet<String>()

    private val cacheDir: File by lazy {
        val dir = File(Minecraft.getInstance().gameDirectory, "daisy/cache/assets")
        if (!dir.exists()) dir.mkdirs()
        dir
    }

    /**
     * Retrieves the registered texture McId if already downloaded and loaded, or null.
     * Triggers asynchronous download if not loaded.
     */
    fun getOrLoadTexture(asset: AppearanceAsset, isCape: Boolean = false): McId? {
        val hash = asset.sha256.lowercase()
        loadedTextures[hash]?.let { return it }

        if (inFlight.add(hash)) {
            pool.submit {
                try {
                    val bytes = loadAssetBytes(asset)
                    if (bytes != null) {
                        Minecraft.getInstance().execute {
                            registerTexture(hash, bytes, isCape)
                            inFlight.remove(hash)
                        }
                    } else {
                        inFlight.remove(hash)
                    }
                } catch (t: Throwable) {
                    inFlight.remove(hash)
                }
            }
        }
        return null
    }

//? if >=1.21.9 {
    fun getOrLoadClientAsset(asset: AppearanceAsset, isCape: Boolean = false): ClientAsset.ResourceTexture? {
        val hash = asset.sha256.lowercase()
        clientAssets[hash]?.let { return it }
        val id = getOrLoadTexture(asset, isCape) ?: return null
        val clientAsset = ClientAsset.ResourceTexture(id, id)
        clientAssets[hash] = clientAsset
        return clientAsset
    }
//?}

    private fun registerTexture(hash: String, bytes: ByteArray, isCape: Boolean) {
        runCatching {
            val img = ByteArrayInputStream(bytes).use { NativeImage.read(it) }
            val w = img.width
            val h = img.height

            // Validate standard Minecraft dimensions
            if (isCape) {
                if (w != 64 || (h != 32 && h != 64)) return
            } else {
                if (w != 64 || (h != 64 && h != 32)) return
            }

            val prefix = if (isCape) "daisy_cape_" else "daisy_skin_"
            val id = McId.fromNamespaceAndPath("clientcore", "$prefix$hash")

//? if >=1.21.5 {
            Minecraft.getInstance().textureManager.register(id, DynamicTexture({ "$prefix$hash" }, img))
//?} else {
/*            Minecraft.getInstance().textureManager.register(id, DynamicTexture(img))
*///?}

            loadedTextures[hash] = id
//? if >=1.21.9 {
            clientAssets[hash] = ClientAsset.ResourceTexture(id, id)
//?}
        }
    }

    private fun loadAssetBytes(asset: AppearanceAsset): ByteArray? {
        val hash = asset.sha256.lowercase()
        val file = File(cacheDir, "$hash.png")

        if (file.exists() && file.isFile) {
            val bytes = file.readBytes()
            if (verifySha256(bytes, hash)) {
                return bytes
            } else {
                file.delete()
            }
        }

        // Validate URL safety (only http or https)
        if (!asset.url.startsWith("http://") && !asset.url.startsWith("https://")) {
            return null
        }

        val downloaded = runCatching {
            val conn = (URL(asset.url).openConnection() as HttpURLConnection).apply {
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Daisy-Client")
            }
            conn.inputStream.use { it.readBytes() }
        }.getOrNull() ?: return null

        if (downloaded.size > MAX_FILE_SIZE) return null
        if (!verifySha256(downloaded, hash)) return null

        runCatching { file.writeBytes(downloaded) }
        return downloaded
    }

    private fun verifySha256(bytes: ByteArray, expected: String): Boolean {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        val hex = digest.joinToString("") { "%02x".format(it) }
        return hex.equals(expected, ignoreCase = true)
    }

    fun clearMemory() {
        loadedTextures.clear()
//? if >=1.21.9 {
        clientAssets.clear()
//?}
        inFlight.clear()
    }
}

