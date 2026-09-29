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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const COLORS = {
  bg: "#FFFFFF",
  statusBarBg: "#161616",
  headline: "#161616",
  subtitle: "#6B6B60",
  brandGreen: "#4CAF50",
  fieldBg: "#F2F2EC",
  fieldPlaceholder: "#9A9A90",
  textDark: "#161616",
  border: "#DCDCD2",
  danger: "#C0392B",
};

export interface RegisterFormData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}

interface RegisterScreenProps {
  onCreateAccount?: (data: RegisterFormData) => void;
  onSignIn?: () => void;
}

export default function RegisterScreen({
  onCreateAccount,
  onSignIn,
}: RegisterScreenProps) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!fullName.trim()) next.fullName = "Enter your full name";
    if (!/^\d{10}$/.test(mobile.trim()))
      next.mobile = "Enter a valid 10-digit mobile number";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      next.email = "Enter a valid email address";
    if (password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (!agreed) next.agreed = "You must agree to the Terms and Privacy Policy";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateAccount = () => {
    if (!validate()) return;
    onCreateAccount?.({ fullName, mobile, email, password });
    router.push("/registration/login");
  };

  const handleSignIn = () => {
    onSignIn?.();
    router.push("/registration/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Set up your collection profile in minutes</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={COLORS.fieldPlaceholder}
          style={styles.input}
        />
        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.mobileFieldRow}>
          <Text style={styles.mobilePrefix}>+91</Text>
          <TextInput
            value={mobile}
            onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ""))}
            placeholder="Enter mobile number"
            placeholderTextColor={COLORS.fieldPlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.mobileInput}
          />
        </View>
        {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Optional"
          placeholderTextColor={COLORS.fieldPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <Text style={styles.label}>Create password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 8 characters"
          placeholderTextColor={COLORS.fieldPlaceholder}
          secureTextEntry
          style={styles.input}
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => setAgreed((prev) => !prev)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to Terms & Privacy Policy
          </Text>
        </TouchableOpacity>
        {errors.agreed ? <Text style={styles.errorText}>{errors.agreed}</Text> : null}

        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={handleCreateAccount}
        >
          <Text style={styles.createButtonText}>Create account</Text>
        </TouchableOpacity>

        <View style={styles.signInRow}>
          <Text style={styles.signInPrompt}>Already registered? </Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.headline,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: COLORS.subtitle,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 14.5,
    color: COLORS.textDark,
    marginBottom: 14,
  },
  mobileFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },
  mobilePrefix: {
    fontSize: 14.5,
    color: COLORS.textDark,
    fontWeight: "500",
    marginRight: 8,
  },
  mobileInput: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.textDark,
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: -8,
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandGreen,
    borderColor: COLORS.brandGreen,
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  createButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signInPrompt: {
    fontSize: 13.5,
    color: COLORS.brandGreen,
    fontWeight: "500",
  },
  signInLink: {
    fontSize: 13.5,
    color: COLORS.brandGreen,
    fontWeight: "700",
  },
});