import { View, Text, Pressable, Animated, StyleSheet, Image, Dimensions } from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { C } from "../../src/components/Apple";

const { width } = Dimensions.get("window");

const steps = [
  {
    icon: "📸",
    title: "Βγάλε φωτογραφία",
    description: "Φωτογράφισε την απόδειξη σου",
  },
  {
    icon: "🧠",
    title: "Το app διαβάζει",
    description: "Αναγνωρίζει προϊόντα και τιμές",
  },
  {
    icon: "🔔",
    title: "Ειδοποίηση",
    description: "Μάθε όταν πέσει η τιμή",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const goToPage = (next: number) => {
    setPage(next);
    Animated.timing(slideAnim, {
      toValue: -next * width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  const handleStart = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Παράλειψη</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.pagesContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={[styles.page, { width }]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>🧾</Text>
            </View>
          </View>

          <Text style={styles.heading}>Καλώς ήρθες στο receipt-market</Text>
          <Text style={styles.subtitle}>Ξέρεις πού είναι φθηνότερα;</Text>

          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
            }}
            style={styles.image}
            resizeMode="cover"
          />

          <Pressable style={styles.primaryButton} onPress={() => goToPage(1)}>
            <Text style={styles.primaryButtonText}>Προχώρα</Text>
          </Pressable>
        </View>

        <View style={[styles.page, { width }]}>
          <Text style={styles.heading}>Πώς δουλεύει</Text>

          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleStart}>
            <Text style={styles.primaryButtonText}>Ξεκίνα</Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.dotsContainer}>
        {[0, 1].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              page === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: C.sub,
    fontWeight: "500",
  },
  pagesContainer: {
    flex: 1,
    flexDirection: "row",
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,122,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 48,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: C.sub,
    textAlign: "center",
    marginBottom: 32,
  },
  image: {
    width: width - 64,
    height: 220,
    borderRadius: 20,
    marginBottom: 40,
  },
  stepsContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 40,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  stepIcon: {
    fontSize: 32,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    color: C.sub,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: C.tint,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: C.tint,
  },
  dotInactive: {
    backgroundColor: C.ter,
  },
});
