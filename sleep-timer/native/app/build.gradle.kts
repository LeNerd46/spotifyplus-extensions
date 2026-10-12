plugins { id("com.android.application") }
android {
    namespace = "com.spotifyplus.sleeptimermanager"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.spotifyplus.sleeptimermanager"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}
dependencies { compileOnly(files("$rootDir/lib/spotifyplus-sdk.aar")) }
