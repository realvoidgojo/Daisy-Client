package dev.daisy.clientcore.perf

import jdk.jfr.Category
import jdk.jfr.Event
import jdk.jfr.Label
import jdk.jfr.Name
import jdk.jfr.StackTrace
import jdk.jfr.Threshold

/** Opt-in JFR spans. The normal path allocates no events and performs no I/O. */
object RuntimeProfile {
    private val enabled = java.lang.Boolean.getBoolean("daisy.profile")

    @Name("dev.daisy.Section")
    @Label("Daisy section")
    @Category("Daisy")
    @StackTrace(false)
    @Threshold("0 ns")
    class Sample : Event() {
        @JvmField
        @Label("Section")
        var section: String = ""
    }

    fun begin(section: String): Sample? {
        if (!enabled) return null
        val sample = Sample()
        if (!sample.isEnabled) return null
        sample.section = section
        sample.begin()
        return sample
    }

    fun end(sample: Sample?) {
        if (sample == null) return
        sample.end()
        if (sample.shouldCommit()) sample.commit()
    }
}
