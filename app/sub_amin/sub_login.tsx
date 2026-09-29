import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import Toast from "react-native-toast-message";
import { resolveRole, saveUserSession } from "../../src/authStorage"; // adjust this path to match your project structure

const COLORS = {
  bg: "#FFFFFF",
  statusBarBg: "#161616",
  headline: "#161616",
  subtitle: "#6B6B60",
  brandGreen: "#4CAF50",
  brandGreenDark: "#1F5E4A",
  amber: "#B8791E",
  fieldBg: "#F2F2EC",
  fieldPlaceholder: "#9A9A90",
  textDark: "#161616",
  border: "#DCDCD2",
  error: "#C62828",
};

export default function SubAdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter email and password");

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: "Please enter email and password",
        position: "top",
        visibilityTime: 2500,
      });

      return;
    }

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // Exact Postman Request specification:
      // POST http://macsof.in/milkmanagement/api/login
      // Headers: { "Auth-Key": "canandairyApi", "Content-Type": "application/json" }
      // Body: JSON string { "email": "...", "password": "..." }
      const requestBody = JSON.stringify({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const response = await axios.post(
        "http://macsof.in/milkmanagement/api/login",
        requestBody,
        {
          headers: {
            "Auth-Key": "canandairyApi",
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
          },
          timeout: 20000,
        }
      );

      console.log("Sub Admin login response:", response.data);

      const isSuccess =
        response.data?.status === 200 ||
        response.data?.status === "200" ||
        response.data?.status === true;

      if (isSuccess) {
        const userdata = response.data?.userdata || {};
        const rawAdminCode =
          response.data?.admincode ??
          userdata?.admincode ??
          userdata?.role_id ??
          response.data?.role_id ??
          "2";

        const checkAdminCode = Number(rawAdminCode);
        const role = resolveRole(rawAdminCode);

        await saveUserSession({
          role,
          role_id: String(rawAdminCode),
          admin_id: String(userdata?.admin_id ?? (checkAdminCode === 1 ? "1" : "2")),
          admin_name: userdata?.admin_name ?? (checkAdminCode === 1 ? "Super Admin" : "Sub Admin"),
          email: userdata?.email ?? trimmedEmail,
          mobile_number: userdata?.mobile_number ?? (/^\d+$/.test(trimmedEmail) ? trimmedEmail : ""),
          photo: userdata?.photo ?? "",
          address: userdata?.address ?? "",
          status: String(userdata?.status ?? "1"),
        });

        Toast.show({
          type: "success",
          text1: "Login Successful",
          text2: `Welcome back, ${userdata?.admin_name || (checkAdminCode === 1 ? "Super Admin" : "Sub Admin")}!`,
          position: "top",
          visibilityTime: 2000,
        });

        if (checkAdminCode === 1) {
          router.replace("/super_admin/super");
        } else {
          router.replace("/sub_amin/admin_dashboard");
        }
      } else {
        const message =
          response.data?.message ||
          response.data?.error ||
          "Invalid Details, Please enter proper details";
        setError(message);
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: message,
          position: "top",
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      console.log("Sub Admin login error:", err);

      let errorMessage = "Something went wrong. Please try again.";

      if (err?.response) {
        console.log("API status:", err.response.status);
        console.log("API response:", err.response.data);

        errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error (${err.response.status})`;
      } else if (err?.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: errorMessage,
        position: "top",
        visibilityTime: 3500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("../../src/splash_screens/assets/images/canann.jpeg")}
                  style={styles.brandImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.brandName}>CANAN Dairy</Text>

              <Text style={styles.brandTagline}>
                SUB ADMIN <Text style={styles.dot}>•</Text> Portal
              </Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>

              <View style={styles.mobileFieldRow}>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError("");
                  }}
                  placeholder="Enter email"
                  placeholderTextColor={COLORS.fieldPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={100}
                  returnKeyType="next"
                  editable={!isLoading}
                  style={styles.mobileInput}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>

              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.fieldPlaceholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
                style={styles.passwordInput}
              />
            </View>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.signInButtonText}>Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.signInButtonText}>Login to Sub-Admin</Text>
              )}
            </TouchableOpacity>

            {/* Link back to Super Admin */}
            <View style={styles.superAdminLinkRow}>
              <Text style={styles.superAdminPrompt}>Need Super Admin access?</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => router.push("/registration/login")}
              >
                <Text style={styles.superAdminLinkText}>Super Admin Login →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  keyboardContainer: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 50 },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoWrapper: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    backgroundColor: "#F5F7F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  brandImage: { width: 90, height: 90 },
  brandName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.headline,
    letterSpacing: 0.4,
    marginBottom: 5,
    textAlign: "center",
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.amber,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  dot: { color: COLORS.amber },
  inputGroup: { marginBottom: 17 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textDark, marginBottom: 8 },
  mobileFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.fieldBg,
    borderRadius: 13,
    height: 52,
    paddingHorizontal: 15,
  },
  mobileInput: { flex: 1, height: 52, fontSize: 14.5, color: COLORS.textDark },
  passwordInput: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 13,
    paddingHorizontal: 15,
    height: 52,
    fontSize: 14.5,
    color: COLORS.textDark,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: "600", marginTop: -5, marginBottom: 12 },
  signInButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 13,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 22,
    elevation: 3,
  },
  signInButtonDisabled: { opacity: 0.75 },
  loadingContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  signInButtonText: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "800" },
  superAdminLinkRow: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.fieldBg,
    alignItems: "center",
  },
  superAdminPrompt: {
    fontSize: 12.5,
    color: COLORS.subtitle,
    fontWeight: "500",
    marginBottom: 6,
  },
  superAdminLinkText: {
    fontSize: 13,
    color: COLORS.brandGreen,
    fontWeight: "700",
  },
});