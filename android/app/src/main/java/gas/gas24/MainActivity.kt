package gas.gas24

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updateLayoutParams
import androidx.webkit.WebViewCompat
import java.net.URISyntaxException

/**
 * Hosts the Gazyom web app (BuildConfig.START_URL) in a WebView.
 * Pages on gas24.ir stay in the app; every other link opens in the matching external app.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var offlineView: View
    private var webViewDestroyed = false
    private var mainFrameFailed = false
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooser =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            fileCallback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            )
            fileCallback = null
        }

    // Enabled only while the WebView has history, so the system back gesture closes the app otherwise.
    private val backToPreviousPage = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = webView.goBack()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            // Android < 8.1 cannot draw dark navigation icons, so it gets a dark scrim instead.
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, NAV_BAR_DARK_SCRIM),
        )
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.web_view)
        progress = findViewById(R.id.progress)
        offlineView = findViewById(R.id.offline)
        findViewById<Button>(R.id.retry).setOnClickListener { retry() }
        applyWindowInsets()
        configureWebView()
        onBackPressedDispatcher.addCallback(this, backToPreviousPage)

        val deepLink = intent?.data?.takeIf(::isAppUrl)
        when {
            deepLink != null -> webView.loadUrl(deepLink.toString())
            savedInstanceState != null && webView.restoreState(savedInstanceState) != null -> Unit
            else -> webView.loadUrl(BuildConfig.START_URL)
        }
        if (savedInstanceState == null) warnIfWebViewOutdated()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.takeIf(::isAppUrl)?.let { webView.loadUrl(it.toString()) }
    }

    override fun onResume() {
        super.onResume()
        if (!webViewDestroyed) webView.onResume()
    }

    override fun onPause() {
        if (!webViewDestroyed) webView.onPause()
        // Persist the login cookie right away; the process may be killed in the background.
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (!webViewDestroyed) webView.saveState(outState)
    }

    override fun onDestroy() {
        if (!webViewDestroyed) {
            webViewDestroyed = true
            webView.destroy()
        }
        super.onDestroy()
    }

    /** Keeps content clear of the status bar, navigation bar, display cutout and keyboard. */
    private fun applyWindowInsets() {
        val content = findViewById<View>(R.id.content)
        val navScrim = findViewById<View>(R.id.nav_scrim)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            content.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                topMargin = bars.top
                leftMargin = bars.left
                rightMargin = bars.right
                bottomMargin = maxOf(bars.bottom, keyboard.bottom)
            }
            navScrim.updateLayoutParams { height = bars.bottom }
            WindowInsetsCompat.CONSUMED
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true // the app keeps subscriptions and settings in localStorage
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false) // target=_blank links go through shouldOverrideUrlLoading
            userAgentString = "$userAgentString Gas24Android/${BuildConfig.VERSION_NAME}"
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true) // the login token is stored in a cookie
            setAcceptThirdPartyCookies(webView, true) // embedded support chat widget
        }
        webView.webViewClient = AppWebViewClient()
        webView.webChromeClient = AppChromeClient()
        webView.setDownloadListener { url, _, _, _, _ -> openExternally(Uri.parse(url)) }
    }

    private fun isAppUrl(uri: Uri): Boolean {
        val host = uri.host?.lowercase() ?: return false
        val domain = BuildConfig.APP_DOMAIN
        return uri.scheme == "https" && (host == domain || host.endsWith(".$domain"))
    }

    private fun retry() {
        offlineView.isVisible = false
        if (webView.url.isNullOrEmpty()) webView.loadUrl(BuildConfig.START_URL) else webView.reload()
    }

    /** Hands a link to another app (dialer, mail, market, browser...). */
    private fun openExternally(uri: Uri) {
        if (uri.scheme in BLOCKED_SCHEMES) return
        val intent = if (uri.scheme == "intent") {
            try {
                Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply {
                    // Never let a web page start a specific (possibly non-exported) component.
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
            } catch (e: URISyntaxException) {
                return
            }
        } else {
            Intent(Intent.ACTION_VIEW, uri)
        }
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            val fallback = intent.getStringExtra("browser_fallback_url")?.let(Uri::parse)
            when {
                fallback != null && isAppUrl(fallback) -> webView.loadUrl(fallback.toString())
                fallback != null && fallback.scheme in setOf("http", "https") -> openExternally(fallback)
                else -> Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show()
            }
        }
    }

    /** The web app is built with Tailwind CSS v4 and renders incorrectly on old WebView versions. */
    private fun warnIfWebViewOutdated() {
        val webViewPackage = WebViewCompat.getCurrentWebViewPackage(this) ?: return
        val version = webViewPackage.versionName ?: return
        val major = version.substringBefore('.').toIntOrNull() ?: return
        if (major >= BuildConfig.MIN_WEBVIEW_MAJOR) return
        AlertDialog.Builder(this)
            .setTitle(R.string.webview_outdated_title)
            .setMessage(getString(R.string.webview_outdated_message, version))
            .setPositiveButton(R.string.update) { _, _ ->
                openExternally(Uri.parse("market://details?id=${webViewPackage.packageName}"))
            }
            .setNegativeButton(R.string.continue_anyway, null)
            .show()
    }

    private inner class AppWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (!request.isForMainFrame || isAppUrl(request.url)) return false
            openExternally(request.url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            mainFrameFailed = false
            progress.isVisible = true
        }

        override fun onPageFinished(view: WebView, url: String?) {
            progress.isVisible = false
            offlineView.isVisible = mainFrameFailed
            CookieManager.getInstance().flush()
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            backToPreviousPage.isEnabled = view.canGoBack()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                mainFrameFailed = true
                offlineView.isVisible = true
            }
        }

        // The renderer crashed or was killed to reclaim memory: rebuild the screen instead of crashing.
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            (view.parent as? ViewGroup)?.removeView(view)
            view.destroy()
            webViewDestroyed = true
            recreate()
            return true
        }
    }

    private inner class AppChromeClient : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            progress.progress = newProgress
        }

        override fun onShowFileChooser(
            view: WebView,
            callback: ValueCallback<Array<Uri>>,
            params: FileChooserParams,
        ): Boolean {
            fileCallback?.onReceiveValue(null)
            fileCallback = callback
            return try {
                fileChooser.launch(Intent.createChooser(params.createIntent(), getString(R.string.file_chooser_title)))
                true
            } catch (e: ActivityNotFoundException) {
                fileCallback = null
                false
            }
        }
    }

    private companion object {
        val BLOCKED_SCHEMES = setOf("javascript", "file", "content", "data", "blob", "about")
        val NAV_BAR_DARK_SCRIM = Color.argb(0x80, 0x1B, 0x1B, 0x1B)
    }
}
