package dev.daisy.clientcore.ui.widget

import dev.daisy.clientcore.net.DaisySocial
import java.util.Locale

/** Pure roster projection shared by rendering and keyboard selection. */
object FriendRosterModel {
    class Groups(val inGame: List<DaisySocial.Friend>, val online: List<DaisySocial.Friend>, val offline: List<DaisySocial.Friend>) {
        val all: List<DaisySocial.Friend> get() = inGame + online + offline
    }

    fun groups(friends: List<DaisySocial.Friend>, search: String): Groups {
        val shown = friends.filter { search.isBlank() || it.name.contains(search.trim(), ignoreCase = true) }
        val byName = compareBy<DaisySocial.Friend> { it.name.lowercase(Locale.ROOT) }
        return Groups(
            inGame = shown.filter { it.online && it.server.isNotEmpty() }.sortedWith(byName),
            online = shown.filter { it.online && it.server.isEmpty() }.sortedWith(byName),
            offline = shown.filter { !it.online }.sortedWith(byName)
        )
    }
}
