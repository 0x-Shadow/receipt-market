import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signUp, signInWithGoogle } from "../../src/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, name);
      if (needsEmailConfirmation) {
        setLoading(false);
        Alert.alert(
          "Έλεγξε το email σου",
          "Στείλαμε σύνδεσμο επιβεβαίωσης στο " + email + ". Επιβεβαίωσε τον λογαριασμό και μετά συνδέσου."
        );
        router.replace("/login");
        return;
      }
      router.replace("/onboarding");
    } catch (error: any) {
      setError(error.message || "Η εγγραφή απέτυχε");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || "Η εγγραφή με Google απέτυχε");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#1A2233" />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.logo}>
            <Ionicons name="receipt-outline" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Δημιουργία λογαριασμού</Text>
          <Text style={styles.subtitle}>
            Εγγράφου στην κοινότητά μας και ξεκίνα να εξοικονομείς.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#8E8E93"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Ονοματεπώνυμο"
                placeholderTextColor="#8E8E93"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#8E8E93"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8E8E93"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Κωδικός"
                placeholderTextColor="#8E8E93"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#8E8E93"
                />
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#FF3B30"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Εγγραφή</Text>
              )}
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ή</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={styles.googleButton}
              onPress={handleGoogleSignup}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Συνέχεια με Google</Text>
            </Pressable>
          </View>

          <Text style={styles.loginText}>
            Έχεις ήδη λογαριασμό;{" "}
            <Text style={styles.loginLink} onPress={() => router.push("/login")}>
              Συνδέσου
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E8EAED",
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#1A2233",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    color: "#1A2233",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 21,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EAED",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#1A2233",
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#FF3B30",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#1A2233",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
    shadowColor: "#1A2233",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8EAED",
  },
  dividerText: {
    marginHorizontal: 14,
    color: "#8E8E93",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EAED",
    paddingVertical: 16,
    width: "100%",
    gap: 12,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    color: "#1A2233",
    fontSize: 16,
    fontWeight: "500",
  },
  loginText: {
    color: "#8E8E93",
    fontSize: 15,
    textAlign: "center",
    marginTop: 28,
  },
  loginLink: {
    color: "#0A84FF",
    fontWeight: "600",
  },
});
