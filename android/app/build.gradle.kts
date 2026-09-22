import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Release signing comes from android/keystore.properties (not committed) or GAS24_* env vars.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
fun signingValue(key: String, env: String): String? =
    keystoreProperties.getProperty(key) ?: System.getenv(env)?.takeIf { it.isNotBlank() }

android {
    namespace = "gas.gas24"
    compileSdk = 35

    defaultConfig {
        // Same package as src/.well-known/assetlinks.json so App Links verify with the release key.
        applicationId = "gas.gas24"
        minSdk = 24
        targetSdk = 35
        versionCode = (findProperty("gas24.versionCode") as String?)?.toInt() ?: 1
        versionName = (findProperty("gas24.versionName") as String?) ?: "1.0.0"

        val startUrl = (findProperty("gas24.startUrl") as String?) ?: "https://my.gas24.ir/app/"
        buildConfigField("String", "START_URL", "\"$startUrl\"")
        // Navigations to this domain (and its subdomains) stay inside the app.
        buildConfigField("String", "APP_DOMAIN", "\"gas24.ir\"")
        // The web app uses Tailwind CSS v4, which needs Chromium 111+.
        buildConfigField("int", "MIN_WEBVIEW_MAJOR", "111")
    }

    signingConfigs {
        signingValue("storeFile", "GAS24_KEYSTORE_FILE")?.let { path ->
            create("release") {
                storeFile = file(path)
                storePassword = signingValue("storePassword", "GAS24_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "GAS24_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "GAS24_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            // Installs next to the store version instead of conflicting with its signature.
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.webkit:webkit:1.13.0")
}
