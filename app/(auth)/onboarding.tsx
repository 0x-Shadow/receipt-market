import { View, Text, Pressable, Animated, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function Onboarding() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const goToPage = (next: number) => {
    setPage(next);
    Animated.spring(slideAnim, {
      toValue: -next * width,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  };

  const handleStart = () => router.replace("/(tabs)");

  return (
    <View style={styles.container}>
      <Pressable onPress={handleStart} style={styles.skipButton} hitSlop={12}>
        <Text style={styles.skipText}>Παράλειψη</Text>
      </Pressable>

      <Animated.View style={[styles.pagesContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.heading}>Πραγματικές προσφορές.{"\n"}Πραγματικοί άνθρωποι.</Text>
          <Text style={styles.subtitle}>
            Βγάλε φωτογραφία τις τιμές, δες τις καλύτερες προσφορές κοντά σου και βοήθησε τους άλλους.
          </Text>

          <View style={styles.heroCard}>
            <View style={styles.heroGradient}>
              <View style={styles.heroLogo}>
                <Ionicons name="receipt-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>receipt-market</Text>
              <Text style={styles.heroTagline}>Σκάνε. Μοιράσου. Εξοικονόμησε.</Text>
            </View>
          </View>

          <View style={styles.stepsCard}>
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="camera-outline" size={20} color="#0A84FF" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Σκάνε την απόδειξη</Text>
                <Text style={styles.stepDesc}>Μία φωτογραφία, όλα τα προϊόντα και οι τιμές.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="notifications-outline" size={20} color="#0A84FF" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Μάθε πότε πέφτει τιμή</Text>
                <Text style={styles.stepDesc}>Ειδοποίηση όταν ένα προϊόν πέσει αλλού.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="heart-outline" size={20} color="#0A84FF" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Πρόσθεσε στη λίστα σου</Text>
                <Text style={styles.stepDesc}>Παρακολούθησε τα αγαπημένα σου προϊόντα.</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <ScrollView style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.heading}>Παρακολούθησε{"\n"}τη λίστα σου.</Text>
          <Text style={styles.subtitle}>
            Πρόσθεσε τα προϊόντα που σε ενδιαφέρουν και ειδοποιήσου όταν πέσουν σε προσφορά.
          </Text>

          <View style={styles.wishlistCard}>
            <View style={styles.wishlistHeader}>
              <Text style={styles.wishlistHeaderTitle}>Η λίστα μου</Text>
              <View style={styles.bellWrap}>
                <Ionicons name="notifications-outline" size={15} color="#8E8E93" />
              </View>
            </View>

            <View style={styles.wlItem}>
              <View style={styles.wlThumb}>
                <Text style={styles.wlThumbEmoji}>🧀</Text>
              </View>
              <View style={styles.wlInfo}>
                <Text style={styles.wlName}>Φέτα ΠΟΠ 400g</Text>
                <View style={styles.wlMeta}>
                  <View style={styles.wlDot} />
                  <Text style={styles.wlMetaText}>Lidl · 2,4 km</Text>
                </View>
              </View>
              <View style={styles.dropBadge}>
                <Text style={styles.dropText}>-35%</Text>
              </View>
            </View>

            <View style={styles.wlDivider} />

            <View style={styles.wlItem}>
              <View style={styles.wlThumb}>
                <Text style={styles.wlThumbEmoji}>🥛</Text>
              </View>
              <View style={styles.wlInfo}>
                <Text style={styles.wlName}>Γάλα Νωπό 1L</Text>
                <View style={styles.wlMeta}>
                  <View style={styles.wlDot} />
                  <Text style={styles.wlMetaText}>Μασούτης · 1,1 km</Text>
                </View>
              </View>
              <View style={styles.dropBadge}>
                <Text style={styles.dropText}>-12%</Text>
              </View>
            </View>

            <View style={styles.wlDivider} />

            <View style={styles.wlItem}>
              <View style={styles.wlThumb}>
                <Text style={styles.wlThumbEmoji}>🍌</Text>
              </View>
              <View style={styles.wlInfo}>
                <Text style={styles.wlName}>Μπανάνες 1kg</Text>
                <View style={styles.wlMeta}>
                  <View style={styles.wlDot} />
                  <Text style={styles.wlMetaText}>Σκλαβενίτης · 3,7 km</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.notifPreview}>
            <View style={styles.notifIcon}>
              <Ionicons name="arrow-down" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.notifBodyWrap}>
              <Text style={styles.notifTitle}>Φέτα ΠΟΠ: 2,19€ στο Lidl</Text>
              <Text style={styles.notifBody}>Ήταν 2,49€ · μόλις τώρα</Text>
            </View>
          </View>
        </ScrollView>

        <ScrollView style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.heading}>Μαζί{"\n"}εξοικονομούμε περισσότερα.</Text>
          <Text style={styles.subtitle}>
            Γίνε μέλος μιας κοινότητας που μοιράζεται ευκαιρίες, βοηθάει ο ένας τον άλλο και κάνει σοφές επιλογές.
          </Text>

          <View style={styles.communityCard}>
            <View style={styles.post}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <View style={styles.postInfo}>
                <Text style={styles.postAuthor}>Μαρία Α.</Text>
                <Text style={styles.postTime}>πριν 2 ώρες</Text>
              </View>
              <View style={styles.postBadge}>
                <Text style={styles.postBadgeText}>-40%</Text>
              </View>
            </View>
            <Text style={styles.postBody}>Μακαρόνια στο Lidl Χαλάνδρι, μισά. Να πάτε σήμερα.</Text>

            <View style={styles.postDivider} />

            <View style={styles.post}>
              <View style={[styles.avatarWrap, { backgroundColor: "#E8F4FD" }]}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <View style={styles.postInfo}>
                <Text style={styles.postAuthor}>Νίκος Π.</Text>
                <Text style={styles.postTime}>πριν 5 ώρες</Text>
              </View>
              <View style={styles.postBadge}>
                <Text style={styles.postBadgeText}>-25%</Text>
              </View>
            </View>
            <Text style={styles.postBody}>Ελαιόλαδο στον ΑΒ Γλυφάδα, από 6,99€.</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>1,2k</Text>
              <Text style={styles.statLabel}>άνθρωποι μοιράζονται ευκαιρίες</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>18€</Text>
              <Text style={styles.statLabel}>μέση εξοικονόμηση</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                page === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {page === 2 ? (
          <Pressable style={styles.getStartedButton} onPress={handleStart}>
            <Text style={styles.getStartedText}>Ξεκίνα τώρα</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={styles.arrowButton}
            onPress={() => goToPage(page + 1)}
          >
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 6,
  },
  skipText: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "500",
  },
  pagesContainer: {
    flex: 1,
    flexDirection: "row",
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A2233",
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 23,
    marginBottom: 32,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#1A2233",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroGradient: {
    backgroundColor: "#1A2233",
    padding: 24,
    height: 180,
    justifyContent: "space-between",
  },
  heroLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  stepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EAED",
    paddingHorizontal: 18,
    paddingVertical: 6,
    shadowColor: "#0B1220",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(10,132,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2233",
  },
  stepDesc: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginLeft: 54,
  },
  wishlistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EAED",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  wishlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  wishlistHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A2233",
    letterSpacing: -0.2,
  },
  bellWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  wlItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
  },
  wlThumb: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  wlThumbEmoji: {
    fontSize: 24,
  },
  wlInfo: {
    flex: 1,
  },
  wlName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2233",
  },
  wlMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  wlDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#0A84FF",
  },
  wlMetaText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  dropBadge: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dropText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F8A4C",
  },
  wlDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginLeft: 62,
  },
  notifPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EAED",
    padding: 16,
    marginTop: 16,
    shadowColor: "#0B1220",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBodyWrap: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A2233",
  },
  notifBody: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  communityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EAED",
    padding: 18,
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  post: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3ECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 17,
  },
  postInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A2233",
  },
  postTime: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 1,
  },
  postBadge: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  postBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F8A4C",
  },
  postBody: {
    fontSize: 14,
    color: "#3A4354",
    lineHeight: 21,
    marginBottom: 6,
  },
  postDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A2233",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
    lineHeight: 17,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 12,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#0A84FF",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#D1D5DB",
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A2233",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingHorizontal: 30,
    borderRadius: 28,
    backgroundColor: "#0A84FF",
    shadowColor: "#0A84FF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
