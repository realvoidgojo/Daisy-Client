package dev.daisy.clientcore.net

import com.google.gson.JsonParser
import dev.daisy.clientcore.ui.ClientUi
import net.fabricmc.loader.api.FabricLoader
import net.minecraft.client.Minecraft
//? if >=26.1 {
/*import dev.daisy.clientcore.compat.*
*///?} else {
import net.minecraft.client.gui.GuiGraphics
//?}
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

/** Optional update notice for standalone installations. Network responses never disable local modules. */
object ModUpdateCheck {

    private const val RELEASES = "https://github.com/realvoidgojo/Daisy-Client/releases"

    private val standalone = System.getProperty("minecraft.launcher.brand", "").lowercase() !in setOf("daisy", "daisy-client", "daisy-launcher")

    @Volatile private var latest = ""
    @Volatile private var behind = 0
    @Volatile private var maxBehind = 0

    /** Compatibility accessor: update availability never revokes local gameplay. */
    val turnedOff: Boolean get() = false

    private var started = false

    private val ownVersion: String by lazy {
        FabricLoader.getInstance().getModContainer("clientcore")
            .map { it.metadata.version.friendlyString.substringBefore('+') }
            .orElse("")
    }

    fun start() {
        if (!standalone || started) return
        started = true
        Thread({
            runCatching {
                val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
                fun fetch(url: String): String? {
                    val request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8))
                        .header("User-Agent", "DaisyClient-Mod/$ownVersion").GET().build()
                    val response = http.send(request, HttpResponse.BodyHandlers.ofString())
                    return response.body().takeIf { response.statusCode() in 200..299 }
                }
                val manifestUrl = if (ownVersion.contains('-')) {
                    val listing = fetch("https://api.github.com/repos/realvoidgojo/Daisy-Client/releases?per_page=30")
                        ?: return@runCatching
                    val tag = JsonParser.parseString(listing).asJsonArray
                        .map { it.asJsonObject }
                        .filter { it.get("draft")?.asBoolean != true }
                        .mapNotNull { it.get("tag_name")?.asString }
                        .filter { it.matches(Regex("v[0-9]+\\.[0-9]+\\.[0-9]+(?:\\.[0-9]+){0,2}(?:-(?:alpha|beta|rc)\\.[0-9]+)?")) }
                        .maxWithOrNull { a, b -> compare(a.removePrefix("v"), b.removePrefix("v")) }
                        ?: return@runCatching
                    "$RELEASES/download/$tag/latest.json"
                } else "$RELEASES/latest/download/latest.json"
                val body = fetch(manifestUrl) ?: return@runCatching
                val json = JsonParser.parseString(body).asJsonObject
                val newest = json.get("version")?.asString.orEmpty()
                if (newest.isEmpty() || ownVersion.isEmpty()) return@runCatching
                behind = if (compare(newest, ownVersion) > 0) 1 else 0
                latest = newest
            }
            // Offline or the server is down: nothing is shown and nothing is turned off.
        }, "daisy-mod-update-check").apply { isDaemon = true }.start()
    }

    /** Top of Daisy's main menu, while there is something to say. */
    fun renderMainMenu(client: Minecraft, g: GuiGraphics, screenWidth: Int) {
        if (latest.isEmpty() || behind <= 0) return
        val font = client.font
        val line = when {
            turnedOff -> "Daisy Client $ownVersion is too old. Get $latest"
            maxBehind > 0 -> "Daisy Client $latest is out."
            else -> "Daisy Client $latest is out."
        }
        g.drawString(font, line, (screenWidth - font.width(line)) / 2, 6, if (turnedOff) ClientUi.DANGER else ClientUi.TEXT, true)
    }

    /** 1 when a is newer than b, -1 when older, 0 when the same; "0.2.5.1" is newer than "0.2.5". */
    private fun compare(a: String, b: String): Int {
        return runCatching {
            net.fabricmc.loader.api.Version.parse(a.substringBefore('+'))
                .compareTo(net.fabricmc.loader.api.Version.parse(b.substringBefore('+')))
        }.getOrDefault(0)
    }
}
