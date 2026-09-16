package com.hmconstructora.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.SafeBrowsingResponse;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.net.URI;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.crypto.Cipher;

public final class MainActivity extends Activity {
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ApiClient apiClient = new ApiClient();

    private BiometricVault vault;
    private ScrollView authScreen;
    private WebView webView;
    private LinearLayout webNavPill;
    private ImageButton webNavBack;
    private ImageButton webNavForward;
    private LinearLayout enrollContent;
    private LinearLayout loginContent;
    private EditText username;
    private EditText password;
    private Button enrollButton;
    private Button loginButton;
    private Button changeAccountButton;
    private TextView statusMessage;
    private boolean promptVisible;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(getColor(R.color.hm_header));
        getWindow().setNavigationBarColor(getColor(R.color.hm_surface));
        boolean darkMode = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        getWindow().getDecorView().setSystemUiVisibility(
            darkMode ? 0 : View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );
        setContentView(R.layout.activity_main);

        vault = new BiometricVault(this);
        bindViews();
        configureWebView();
        enrollButton.setOnClickListener(view -> enrollDevice());
        loginButton.setOnClickListener(view -> authenticateStoredCredential());
        changeAccountButton.setOnClickListener(view -> clearLocalAccount());

        if (!supportsStrongBiometrics()) {
            showEnrollment();
            showError(getString(R.string.no_biometrics));
            enrollButton.setEnabled(false);
        } else if (vault.hasCredential()) {
            showBiometricLogin();
            mainHandler.postDelayed(this::authenticateStoredCredential, 350);
        } else {
            showEnrollment();
        }
    }

    private void bindViews() {
        authScreen = findViewById(R.id.auth_screen);
        webView = findViewById(R.id.web_view);
        webNavPill = findViewById(R.id.web_nav_pill);
        webNavBack = findViewById(R.id.web_nav_back);
        webNavForward = findViewById(R.id.web_nav_forward);
        webNavBack.setOnClickListener(view -> {
            if (webView.canGoBack()) webView.goBack();
        });
        webNavForward.setOnClickListener(view -> {
            if (webView.canGoForward()) webView.goForward();
        });
        enrollContent = findViewById(R.id.enroll_content);
        loginContent = findViewById(R.id.login_content);
        username = findViewById(R.id.username);
        password = findViewById(R.id.password);
        enrollButton = findViewById(R.id.enroll_button);
        loginButton = findViewById(R.id.login_button);
        changeAccountButton = findViewById(R.id.change_account_button);
        statusMessage = findViewById(R.id.status_message);
    }

    private boolean supportsStrongBiometrics() {
        BiometricManager manager = getSystemService(BiometricManager.class);
        return manager != null
            && manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private void enrollDevice() {
        clearError();
        String email = username.getText().toString().trim();
        String enteredPassword = password.getText().toString();
        if (email.isEmpty()) {
            username.setError("Ingresa tu usuario.");
            username.requestFocus();
            return;
        }
        if (enteredPassword.length() < 8) {
            password.setError("Ingresa tu contraseña completa.");
            password.requestFocus();
            return;
        }

        hideKeyboard();
        setEnrollmentLoading(true);
        networkExecutor.execute(() -> {
            try {
                ApiClient.EnrollResult result = apiClient.enroll(
                    email,
                    enteredPassword,
                    vault.installationId()
                );
                mainHandler.post(() -> requestBiometricEnrollment(result.deviceToken));
            } catch (ApiClient.ApiException error) {
                mainHandler.post(() -> {
                    setEnrollmentLoading(false);
                    showError(error.getMessage());
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    setEnrollmentLoading(false);
                    showError(getString(R.string.network_error));
                });
            }
        });
    }

    private void requestBiometricEnrollment(String deviceToken) {
        try {
            Cipher cipher = vault.createEncryptionCipher();
            showBiometricPrompt(
                getString(R.string.fingerprint_enroll_title),
                getString(R.string.fingerprint_enroll_subtitle),
                cipher,
                authenticatedCipher -> {
                    try {
                        vault.storeToken(authenticatedCipher, deviceToken);
                        password.setText("");
                        showBiometricLogin();
                        requestSession(deviceToken);
                    } catch (Exception error) {
                        setEnrollmentLoading(false);
                        showError("No fue posible proteger el acceso en este teléfono.");
                    }
                }
            );
        } catch (Exception error) {
            setEnrollmentLoading(false);
            showError(getString(R.string.no_biometrics));
        }
    }

    private void authenticateStoredCredential() {
        if (promptVisible) return;
        clearError();
        loginButton.setEnabled(false);
        loginButton.setText(R.string.loading);
        try {
            Cipher cipher = vault.createDecryptionCipher();
            showBiometricPrompt(
                getString(R.string.fingerprint_prompt_title),
                getString(R.string.fingerprint_prompt_subtitle),
                cipher,
                authenticatedCipher -> {
                    try {
                        requestSession(vault.readToken(authenticatedCipher));
                    } catch (Exception error) {
                        resetCredential(getString(R.string.biometric_changed));
                    }
                }
            );
        } catch (KeyPermanentlyInvalidatedException error) {
            resetCredential(getString(R.string.biometric_changed));
        } catch (Exception error) {
            resetCredential(getString(R.string.biometric_changed));
        }
    }

    private void requestSession(String deviceToken) {
        networkExecutor.execute(() -> {
            try {
                ApiClient.SessionResult result = apiClient.createSession(deviceToken);
                mainHandler.post(() -> openAuthenticatedWebApp(result));
            } catch (ApiClient.ApiException error) {
                mainHandler.post(() -> {
                    if (error.statusCode == 401) {
                        resetCredential(error.getMessage());
                    } else {
                        resetLoginButton();
                        showError(error.getMessage());
                    }
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    resetLoginButton();
                    showError(getString(R.string.network_error));
                });
            }
        });
    }

    private void showBiometricPrompt(
        String title,
        String subtitle,
        Cipher cipher,
        CipherConsumer onSuccess
    ) {
        promptVisible = true;
        BiometricPrompt prompt = new BiometricPrompt.Builder(this)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButton(getString(R.string.cancel), getMainExecutor(), (dialog, which) -> {
                promptVisible = false;
                setEnrollmentLoading(false);
                resetLoginButton();
            })
            .build();
        prompt.authenticate(
            new BiometricPrompt.CryptoObject(cipher),
            getCancellationSignal(),
            getMainExecutor(),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    promptVisible = false;
                    BiometricPrompt.CryptoObject cryptoObject = result.getCryptoObject();
                    if (cryptoObject == null || cryptoObject.getCipher() == null) {
                        resetLoginButton();
                        showError("Android no confirmó la operación biométrica.");
                        return;
                    }
                    onSuccess.accept(cryptoObject.getCipher());
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errorString) {
                    promptVisible = false;
                    setEnrollmentLoading(false);
                    resetLoginButton();
                    if (errorCode != BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED
                        && errorCode != BiometricPrompt.BIOMETRIC_ERROR_CANCELED) {
                        showError(errorString.toString());
                    }
                }

                @Override
                public void onAuthenticationFailed() {
                    showError("Huella no reconocida. Coloca el dedo nuevamente.");
                }
            }
        );
    }

    private android.os.CancellationSignal getCancellationSignal() {
        return new android.os.CancellationSignal();
    }

    private void openAuthenticatedWebApp(ApiClient.SessionResult result) {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        for (String cookie : result.cookies) {
            cookieManager.setCookie(AppConfig.BASE_URL, cookie);
        }
        cookieManager.flush();
        authScreen.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webNavPill.setVisibility(View.VISIBLE);
        webView.loadUrl(AppConfig.BASE_URL + result.redirectTo);
    }

    // Reflects webView.canGoBack()/canGoForward() onto the pill so a user
    // never taps an arrow that has nothing to do - called after every
    // navigation instead of once, since both flags change on each page.
    private void updateNavPillState() {
        webNavBack.setEnabled(webView.canGoBack());
        webNavBack.setAlpha(webView.canGoBack() ? 1f : 0.35f);
        webNavForward.setEnabled(webView.canGoForward());
        webNavForward.setAlpha(webView.canGoForward() ? 1f : 0.35f);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.getSettings().setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                Uri uri = Uri.parse(url);
                if (sameHost(uri) && uri.getPath() != null && uri.getPath().startsWith("/login")) {
                    view.stopLoading();
                    view.setVisibility(View.GONE);
                    webNavPill.setVisibility(View.GONE);
                    authScreen.setVisibility(View.VISIBLE);
                    showBiometricLogin();
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                updateNavPillState();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (sameHost(uri)) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onSafeBrowsingHit(
                WebView view,
                WebResourceRequest request,
                int threatType,
                SafeBrowsingResponse callback
            ) {
                callback.backToSafety(true);
            }
        });
    }

    private boolean sameHost(Uri uri) {
        try {
            return new URI(AppConfig.BASE_URL).getHost().equalsIgnoreCase(uri.getHost());
        } catch (Exception ignored) {
            return false;
        }
    }

    private void showEnrollment() {
        enrollContent.setVisibility(View.VISIBLE);
        loginContent.setVisibility(View.GONE);
        setEnrollmentLoading(false);
        resetLoginButton();
    }

    private void showBiometricLogin() {
        clearError();
        enrollContent.setVisibility(View.GONE);
        loginContent.setVisibility(View.VISIBLE);
        setEnrollmentLoading(false);
        resetLoginButton();
    }

    private void clearLocalAccount() {
        vault.clearCredential();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        showEnrollment();
        username.requestFocus();
    }

    private void resetCredential(String message) {
        vault.clearCredential();
        showEnrollment();
        showError(message);
    }

    private void setEnrollmentLoading(boolean loading) {
        enrollButton.setEnabled(!loading && supportsStrongBiometrics());
        enrollButton.setText(loading ? R.string.loading : R.string.activate_fingerprint);
        username.setEnabled(!loading);
        password.setEnabled(!loading);
    }

    private void resetLoginButton() {
        loginButton.setEnabled(true);
        loginButton.setText(R.string.login_fingerprint);
    }

    private void showError(String message) {
        statusMessage.setText(message);
        statusMessage.setVisibility(View.VISIBLE);
        statusMessage.announceForAccessibility(message);
    }

    private void clearError() {
        statusMessage.setVisibility(View.GONE);
        statusMessage.setText("");
    }

    private void hideKeyboard() {
        View focused = getCurrentFocus();
        if (focused == null) return;
        InputMethodManager manager = getSystemService(InputMethodManager.class);
        if (manager != null) manager.hideSoftInputFromWindow(focused.getWindowToken(), 0);
    }

    @Override
    public void onBackPressed() {
        if (webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        networkExecutor.shutdownNow();
        super.onDestroy();
    }

    private interface CipherConsumer {
        void accept(Cipher cipher);
    }
}
