package com.hmconstructora.mobile;

import android.os.Build;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class ApiClient {
    static final class EnrollResult {
        final String deviceToken;

        EnrollResult(String deviceToken) {
            this.deviceToken = deviceToken;
        }
    }

    static final class SessionResult {
        final String redirectTo;
        final List<String> cookies;

        SessionResult(String redirectTo, List<String> cookies) {
            this.redirectTo = redirectTo;
            this.cookies = cookies;
        }
    }

    static final class ApiException extends Exception {
        final int statusCode;

        ApiException(int statusCode, String message) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    EnrollResult enroll(String email, String password, String installationId) throws Exception {
        JSONObject body = new JSONObject()
            .put("email", email)
            .put("password", password)
            .put("installationId", installationId)
            .put("deviceName", Build.MANUFACTURER + " " + Build.MODEL);
        Response response = post("/api/mobile/auth/enroll", body.toString(), null);
        return new EnrollResult(new JSONObject(response.body).getString("deviceToken"));
    }

    SessionResult createSession(String deviceToken) throws Exception {
        Response response = post("/api/mobile/auth/session", "{}", deviceToken);
        JSONObject json = new JSONObject(response.body);
        return new SessionResult(json.optString("redirectTo", "/dashboard"), response.cookies);
    }

    void revoke(String deviceToken) throws Exception {
        post("/api/mobile/auth/revoke", "{}", deviceToken);
    }

    private Response post(String path, String json, String bearerToken) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(AppConfig.BASE_URL + path).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(20_000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "HMConstructora-Android/" + AppConfig.VERSION_NAME);
        if (bearerToken != null) connection.setRequestProperty("Authorization", "Bearer " + bearerToken);

        try (OutputStream output = connection.getOutputStream()) {
            output.write(json.getBytes(StandardCharsets.UTF_8));
        }

        int status = connection.getResponseCode();
        String body = readBody(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
        if (status < 200 || status >= 300) {
            throw new ApiException(status, errorMessage(body));
        }

        List<String> cookies = new ArrayList<>();
        for (Map.Entry<String, List<String>> header : connection.getHeaderFields().entrySet()) {
            if (header.getKey() != null && header.getKey().equalsIgnoreCase("Set-Cookie")) {
                cookies.addAll(header.getValue());
            }
        }
        connection.disconnect();
        return new Response(body, cookies);
    }

    private static String errorMessage(String body) {
        try {
            return new JSONObject(body).optString("error", "No se pudo completar la solicitud.");
        } catch (JSONException ignored) {
            return "No se pudo completar la solicitud.";
        }
    }

    private static String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }

    private static final class Response {
        final String body;
        final List<String> cookies;

        Response(String body, List<String> cookies) {
            this.body = body;
            this.cookies = cookies;
        }
    }
}
