package dev.daisy.clientcore.media

import com.google.gson.Gson
import dev.daisy.clientcore.config.ConfigService
import java.nio.charset.StandardCharsets
import java.nio.file.Files

/**
 * What is playing on this PC, read by the game itself. The launcher already feeds the Now
 * Playing module, but only while it is the one that started the game, and only to the second;
 * lyrics need to work from any launcher and need the position to a few hundred milliseconds.
 *
 * Windows only: one hidden PowerShell process reads the system media session (the same thing
 * the volume flyout shows) and prints a line every 400 ms. It is started the first time
 * something asks, stopped when nothing has asked for a while, and quits by itself if the game
 * goes away without stopping it.
 */
object MediaSession {
    class Track(val title: String, val artist: String, val album: String, val durationMs: Long, val positionMs: Long, val playing: Boolean)

    private class Line(
        val playing: Boolean = false,
        val title: String = "",
        val artist: String = "",
        val album: String = "",
        val positionMs: Long = 0L,
        val durationMs: Long = 0L,
        val error: Boolean = false
    )

    private const val IDLE_STOP_MS = 10_000L
    private const val STALE_MS = 3_000L
    private const val RESTART_DELAY_MS = 15_000L

    private val gson = Gson()
    private val windows = System.getProperty("os.name", "").lowercase().contains("win")

    @Volatile private var last: Line? = null
    @Volatile private var lastAt = 0L
    @Volatile private var unsupported = false
    private var process: Process? = null
    private var lastAsked = 0L
    private var lastStart = 0L

    /** The current track, or null when nothing is playing, it is not known yet, or this is not Windows. */
    @Synchronized
    fun current(): Track? {
        val now = System.currentTimeMillis()
        lastAsked = now
        if (!windows || unsupported) return null
        if (process?.isAlive != true && now - lastStart > RESTART_DELAY_MS) start(now)
        val line = last ?: return null
        if (now - lastAt > STALE_MS || line.title.isBlank()) return null
        val position = if (line.playing) line.positionMs + (now - lastAt) else line.positionMs
        val limit = if (line.durationMs > 0) line.durationMs else Long.MAX_VALUE
        return Track(line.title, line.artist, line.album, line.durationMs, position.coerceIn(0L, limit), line.playing)
    }

    /** Stops the reader once nobody has asked for a while. Called every tick. */
    @Synchronized
    fun tick() {
        if (process != null && System.currentTimeMillis() - lastAsked > IDLE_STOP_MS) stop()
    }

    /** Presses a media key on the playing app: "next", "prev" or "playpause". False when the reader is not running. */
    @Synchronized
    fun command(action: String): Boolean {
        if (process?.isAlive != true) return false
        return runCatching {
            Files.writeString(ConfigService.daisyDirectory().resolve("media").resolve("command.txt"), action)
        }.isSuccess
    }

    @Synchronized
    fun stop() {
        process?.destroy()
        process = null
        last = null
    }

    private fun start(now: Long) {
        lastStart = now
        runCatching {
            val script = ConfigService.daisyDirectory().resolve("media").resolve("session.ps1")
            val source = MediaSession::class.java.getResourceAsStream("/assets/clientcore/media/session.ps1")?.use { it.readBytes() } ?: return
            Files.createDirectories(script.parent)
            if (!Files.exists(script) || !Files.readAllBytes(script).contentEquals(source)) Files.write(script, source)
            val started = ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                "-File", script.toString(), "-GamePid", ProcessHandle.current().pid().toString()
            ).redirectErrorStream(true).start()
            process = started
            Thread({ read(started) }, "Daisy Media Session").apply { isDaemon = true }.start()
        }
    }

    private fun read(started: Process) {
        runCatching {
            started.inputStream.bufferedReader(StandardCharsets.UTF_8).useLines { lines ->
                for (text in lines) {
                    val trimmed = text.trim()
                    if (!trimmed.startsWith("{")) continue
                    val line = runCatching { gson.fromJson(trimmed, Line::class.java) }.getOrNull() ?: continue
                    if (line.error) {
                        // No media session API on this Windows build: stop trying.
                        unsupported = true
                        started.destroy()
                        return
                    }
                    last = line
                    lastAt = System.currentTimeMillis()
                }
            }
        }
    }
}
