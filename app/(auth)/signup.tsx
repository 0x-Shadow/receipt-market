import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { signUp } from "../../src/lib/supabase";
import { C } from "../../src/components/Apple";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signUp(email, password);
    } catch (error: any) {
      Alert.alert("Σφάλμα", error.message || "Η εγγραφή απέτυχε");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Δημιουργία λογαριασμού</Text>
        <Text style={styles.subtitle}>Εγγράφησε για να ξεκινήσεις</Text>

        <TextInput
          style={styles.input}
          placeholder="Όνομα"
          placeholderTextColor={C.sub}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={C.sub}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Κωδικός"
          placeholderTextColor={C.sub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Δημιουργία λογαριασμού</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Έχεις ήδη λογαριασμό; Συνδέσου</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: C.sub,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: C.bg,
  },
  button: {
    backgroundColor: C.tint,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: C.tint,
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
});
