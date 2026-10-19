plugins { id("com.android.application") }
android {
    namespace = "com.lenerd.animatedartwork.nativeui"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.lenerd.animatedartwork.nativeui"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}
dependencies {
    compileOnly(files("$rootDir/lib/spotifyplus-sdk.aar"))

    // Spotify's own ExoPlayer is obfuscated, so the plugin bundles its own copy
    implementation("androidx.media3:media3-exoplayer:1.8.0")
    implementation("androidx.media3:media3-exoplayer-hls:1.8.0")
}
