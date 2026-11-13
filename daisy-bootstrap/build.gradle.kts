plugins {
    kotlin("jvm") version "2.3.21"
    application
}

group = "dev.daisy"
/*
  Set here rather than inherited from the root. Under Stonecutter the root builds once
  per Minecraft version, so rootProject.version resolved to "unspecified" for this
  subproject and the jar came out as daisy-bootstrap.jar - which the launcher's
  daisy-bootstrap-<version>.jar pattern does not match, so it silently found nothing.

  The bootstrap agent is the same for every Minecraft version, so it deliberately
  carries no +<mc> suffix.
*/
version = "1.0.0-beta.1"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }

    withSourcesJar()
}

kotlin {
    jvmToolchain(21)
}

application {
    mainClass.set("dev.daisy.bootstrap.MainKt")
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(21)
}

tasks.jar {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
    from(rootProject.file("LICENSE")) { into("META-INF") }
    from(rootProject.file("THIRD_PARTY_NOTICES.md")) { into("META-INF") }
    from(rootProject.file("licenses")) { into("META-INF/licenses") }
    archiveBaseName.set("daisy-bootstrap")
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    manifest {
        // Main-Class keeps the legacy wrapper launch working; Premain-Class makes this jar usable
        // as a -javaagent that injects Daisy's mixins without Daisy being a Fabric mod.
        attributes["Main-Class"] = "dev.daisy.bootstrap.MainKt"
        attributes["Premain-Class"] = "dev.daisy.bootstrap.Agent"
        attributes["Agent-Class"] = "dev.daisy.bootstrap.Agent"
        attributes["Can-Retransform-Classes"] = "false"
        attributes["Can-Redefine-Classes"] = "false"
    }
    from(
        configurations.runtimeClasspath.get().map { dependency ->
            if (dependency.isDirectory) dependency else zipTree(dependency)
        }
    )
}
