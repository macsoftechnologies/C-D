import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { resolveRole, saveUserSession } from "../../src/authStorage";
import { loginAdmin, sendOtp, resetPassword } from "@/src/services/dairyApi";

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

  // Forgot Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotAdminId, setForgotAdminId] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

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

      const response = await loginAdmin(trimmedEmail, trimmedPassword);

      console.log("Sub Admin login response:", response);

      const isSuccess =
        response?.status === 200 ||
        (response?.status as any) === "200" ||
        (response?.status as any) === true;

      if (isSuccess) {
        const userdata: any = response?.userdata || {};
        const rawAdminCode =
          (response as any)?.admincode ??
          (userdata as any)?.admincode ??
          userdata?.role_id ??
          (response as any)?.role_id ??
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
          response?.message ||
          "Invalid login credentials. Please enter proper details.";
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
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to connect to the server. Please check your internet connection.";

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

  // Handle Send OTP for Forgot Password
  const handleSendOtp = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await sendOtp(forgotEmail.trim());
      const isOk =
        res?.status === 200 ||
        (res?.status as any) === "200" ||
        (res?.status as any) === true;

      if (isOk) {
        setForgotAdminId(String(res?.admin_id || ""));
        setForgotStep(2);
        Alert.alert("OTP Sent", res?.message || "OTP has been sent to your email.");
      } else {
        setForgotError(res?.message || "Email address not registered.");
      }
    } catch (err: any) {
      setForgotError(err?.message || "Failed to send OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Reset Password with OTP
  const handleResetPassword = async () => {
    if (!forgotOtp.trim()) {
      setForgotError("Please enter the 6-digit OTP received on your email.");
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await resetPassword(
        forgotAdminId,
        forgotOtp.trim(),
        forgotNewPassword.trim()
      );

      const isOk =
        res?.status === 200 ||
        (res?.status as any) === "200" ||
        (res?.status as any) === true;

      if (isOk) {
        Alert.alert(
          "Password Reset",
          res?.message || "Your password has been reset successfully. Please log in.",
          [
            {
              text: "Log In",
              onPress: () => {
                setEmail(forgotEmail.trim());
                setPassword(forgotNewPassword.trim());
                setForgotModalVisible(false);
              },
            },
          ]
        );
      } else {
        setForgotError(res?.message || "Invalid OTP provided.");
      }
    } catch (err: any) {
      setForgotError(err?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
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

            {/* Forgot Password Link */}
            <View style={{ alignItems: "flex-end", marginTop: -6, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  setForgotModalVisible(true);
                  setForgotStep(1);
                  setForgotEmail(email.trim());
                  setForgotError("");
                }}
                disabled={isLoading}
              >
                <Text style={{ color: COLORS.brandGreen, fontSize: 13, fontWeight: "600" }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
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

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {forgotStep === 1 ? "Reset Password" : "Enter Verification OTP"}
              </Text>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <View>
                <Text style={styles.modalSubtitle}>
                  Enter your registered email address. We will send a 6-digit OTP to reset your password.
                </Text>

                <Text style={styles.label}>Registered Email</Text>
                <TextInput
                  value={forgotEmail}
                  onChangeText={(t) => {
                    setForgotEmail(t);
                    setForgotError("");
                  }}
                  placeholder="e.g. subadmin@gmail.com"
                  placeholderTextColor={COLORS.fieldPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.modalInput}
                />

                {forgotError ? <Text style={styles.modalErrorText}>{forgotError}</Text> : null}

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Send Verification OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.modalSubtitle}>
                  Enter the 6-digit OTP sent to {forgotEmail} and choose your new password.
                </Text>

                <Text style={styles.label}>6-Digit OTP</Text>
                <TextInput
                  value={forgotOtp}
                  onChangeText={(t) => {
                    setForgotOtp(t);
                    setForgotError("");
                  }}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor={COLORS.fieldPlaceholder}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.modalInput}
                />

                <Text style={[styles.label, { marginTop: 12 }]}>New Password</Text>
                <TextInput
                  value={forgotNewPassword}
                  onChangeText={(t) => {
                    setForgotNewPassword(t);
                    setForgotError("");
                  }}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={COLORS.fieldPlaceholder}
                  secureTextEntry
                  style={styles.modalInput}
                />

                {forgotError ? <Text style={styles.modalErrorText}>{forgotError}</Text> : null}

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.7 }]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: "center", marginTop: 14 }}
                  onPress={() => setForgotStep(1)}
                  disabled={forgotLoading}
                >
                  <Text style={{ color: COLORS.brandGreen, fontSize: 13, fontWeight: "600" }}>
                    ← Change Email or Resend OTP
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.headline,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: COLORS.subtitle,
    lineHeight: 19,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 14.5,
    color: COLORS.textDark,
    marginBottom: 14,
  },
  modalErrorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});