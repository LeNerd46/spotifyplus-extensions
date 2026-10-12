plugins { id("com.android.application") }
android {
    namespace = "com.lenerd.bringbacklikes.nativeui"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.lenerd.bringbacklikes.nativeui"
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
dependencies { compileOnly(files("$rootDir/lib/spotifyplus-sdk.aar")) }
