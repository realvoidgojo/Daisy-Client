package dev.wyz.clientcore.net

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import dev.wyz.clientcore.cosmetic.AppearanceRoster
import dev.wyz.clientcore.cosmetic.PlayerAppearance
import net.minecraft.client.Minecraft
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * SKLauncher-style Client-Side Appearance Lookup Service.
 *
 * Detects players visible on the client (tab list / world entities),
 * looks up their appearance from the Daisy Web API / CDN,
 * and caches results locally without requiring any server plugins.
 */
object AppearanceLookupService {

    // Endpoints for Daisy appearance service
    private const val DEFAULT_API_BASE = "http://127.0.0.1:25585/appearance"
    private const val CONNECT_TIMEOUT_MS = 5000
    private const val READ_TIMEOUT_MS = 6000
    private const val NEGATIVE_CACHE_TTL_MS = 120_000L // 2 minutes retry if not found
    private const val POSITIVE_CACHE_TTL_MS = 6 * 3600_000L // 6 hours cache

    private val pool = Executors.newFixedThreadPool(2) { r ->
        Thread(r, "Daisy-AppearanceLookup").apply { isDaemon = true }
    }

    private val inFlight = ConcurrentHashMap.newKeySet<String>()
    private val negativeCache = ConcurrentHashMap<String, Long>()

    private val diskCacheDir by lazy {
        val dir = File(Minecraft.getInstance().gameDirectory, "daisy/cache/appearances")
        if (!dir.exists()) dir.mkdirs()
        dir
    }

    /**
     * Looks up appearance for a player by UUID and username.
     * Non-blocking: returns cached appearance immediately if present, otherwise dispatches async lookup.
     */
    fun getOrQuery(uuid: UUID, name: String?): PlayerAppearance? {
        val cached = AppearanceRoster.get(uuid)
        if (cached != null) return cached

        val cleanUuid = uuid.toString().replace("-", "").lowercase()
        val key = cleanUuid.ifEmpty { name?.lowercase() ?: "" }
        if (key.isEmpty()) return null

        // Check negative cache
        val failedAt = negativeCache[key]
        if (failedAt != null && System.currentTimeMillis() - failedAt < NEGATIVE_CACHE_TTL_MS) {
            return null
        }

        // Trigger async lookup if not already in-flight
        if (inFlight.add(key)) {
            pool.submit {
                try {
                    val appearance = queryFromDiskOrApi(cleanUuid, name)
                    if (appearance != null) {
                        AppearanceRoster.upsert(appearance)
                        negativeCache.remove(key)
                    } else {
                        negativeCache[key] = System.currentTimeMillis()
                    }
                } catch (_: Throwable) {
                    negativeCache[key] = System.currentTimeMillis()
                } finally {
                    inFlight.remove(key)
                }
            }
        }

        return null
    }

    private fun queryFromDiskOrApi(uuid: String, name: String?): PlayerAppearance? {
        // 1. Check local disk cache
        val diskFile = File(diskCacheDir, "$uuid.json")
        if (diskFile.exists() && diskFile.isFile) {
            val age = System.currentTimeMillis() - diskFile.lastModified()
            if (age < POSITIVE_CACHE_TTL_MS) {
                runCatching {
                    val json = JsonParser.parseString(diskFile.readText()).asJsonObject
                    return PlayerAppearance.fromJson(json)
                }
            }
        }

        // 2. Query API by UUID first, then username
        val fromUuid = fetchJson("$DEFAULT_API_BASE/uuid/$uuid")
        val root = fromUuid ?: if (!name.isNullOrBlank()) fetchJson("$DEFAULT_API_BASE/name/$name") else null

        if (root != null) {
            val appObj = if (root.has("appearance")) root.getAsJsonObject("appearance") else root
            val appearance = PlayerAppearance.fromJson(appObj)
            if (appearance != null) {
                runCatching { diskFile.writeText(appearance.toJson().toString()) }
                return appearance
            }
        }

        return null
    }

    private fun fetchJson(urlString: String): JsonObject? {
        return runCatching {
            val uri = URI(urlString)
            val conn = (uri.toURL().openConnection() as HttpURLConnection).apply {
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Daisy-Client/1.0")
            }
            if (conn.responseCode != 200) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            JsonParser.parseString(body).asJsonObject
        }.getOrNull()
    }
}

