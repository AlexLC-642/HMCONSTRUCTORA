package com.hmconstructora.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class BiometricVault {
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "hm_mobile_device_credential_v1";
    private static final String PREFS = "hm_secure_device";
    private static final String CIPHERTEXT = "credential_ciphertext";
    private static final String IV = "credential_iv";
    private static final String INSTALLATION_ID = "installation_id";

    private final SharedPreferences preferences;

    BiometricVault(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean hasCredential() {
        return preferences.contains(CIPHERTEXT) && preferences.contains(IV);
    }

    String installationId() {
        String existing = preferences.getString(INSTALLATION_ID, null);
        if (existing != null) return existing;
        String generated = java.util.UUID.randomUUID().toString();
        preferences.edit().putString(INSTALLATION_ID, generated).apply();
        return generated;
    }

    Cipher createEncryptionCipher() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
            .setInvalidatedByBiometricEnrollment(true)
            .build());
        SecretKey key = generator.generateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        return cipher;
    }

    Cipher createDecryptionCipher() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);
        SecretKey key = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        if (key == null) throw new KeyPermanentlyInvalidatedException();

        byte[] iv = Base64.decode(preferences.getString(IV, ""), Base64.NO_WRAP);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        return cipher;
    }

    void storeToken(Cipher authenticatedCipher, String deviceToken) throws Exception {
        byte[] ciphertext = authenticatedCipher.doFinal(deviceToken.getBytes(StandardCharsets.UTF_8));
        preferences.edit()
            .putString(CIPHERTEXT, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .putString(IV, Base64.encodeToString(authenticatedCipher.getIV(), Base64.NO_WRAP))
            .apply();
    }

    String readToken(Cipher authenticatedCipher) throws Exception {
        byte[] ciphertext = Base64.decode(
            preferences.getString(CIPHERTEXT, ""),
            Base64.NO_WRAP
        );
        return new String(authenticatedCipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    void clearCredential() {
        preferences.edit().remove(CIPHERTEXT).remove(IV).apply();
        try {
            KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);
        } catch (Exception ignored) {
            // The encrypted token is already gone. A stale hardware key is harmless.
        }
    }
}
