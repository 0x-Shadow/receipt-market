import { View, Text, Pressable, Animated, StyleSheet, Dimensions, ImageBackground, ScrollView } from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const HERO_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80";

export default function Onboarding() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const goToPage = (next: number) => {
    setPage(next);
    Animated.timing(slideAnim, {
      toValue: -next * width,
      duration: 320,
      useNativeDriver: true,
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
            <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageRadius} resizeMode="cover">
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroLogo}>
                  <Text style={styles.heroLogoEmoji}>🧾</Text>
                </View>
                <Text style={styles.heroTitle}>receipt-market</Text>
                <Text style={styles.heroTagline}>Σκάνε. Οχτώ. Εξοικονόμησε.</Text>
              </View>
            </ImageBackground>
          </View>

          <View style={styles.stepsCard}>
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="camera-outline" size={19} color="#1A2233" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Σκάνε την απόδειξη</Text>
                <Text style={styles.stepDesc}>Μία φωτογραφία, όλα τα προϊόντα και οι τιμές.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="notifications-outline" size={19} color="#1A2233" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Μάθε πότε πέφτει τιμή</Text>
                <Text style={styles.stepDesc}>Ειδοποίηση όταν ένα προϊόν πέσει αλλού.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name="heart-outline" size={19} color="#1A2233" />
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
                <Ionicons name="notifications-outline" size={15} color="#6B7280" />
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
            <View key={index} style={[styles.dot, page === index ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        {page === 2 ? (
          <Pressable style={styles.getStartedButton} onPress={handleStart}>
            <Text style={styles.getStartedText}>Ξεκίνα τώρα</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable style={styles.arrowButton} onPress={() => goToPage(page + 1)}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    top: 58,
    right: 20,
    zIndex: 10,
    padding: 6,
  },
  skipText: {
    fontSize: 15,
    color: "#6B7280",
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
    fontSize: 30,
    fontWeight: "700",
    color: "#1A2233",
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 26,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#0B1220",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroImage: {
    height: 210,
    width: "100%",
    justifyContent: "space-between",
  },
  heroImageRadius: {
    borderRadius: 24,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,18,32,0.34)",
  },
  heroContent: {
    padding: 20,
  },
  heroLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroLogoEmoji: {
    fontSize: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    marginTop: 2,
  },
  stepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDF0F4",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 14,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F4F8",
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
    fontSize: 12.5,
    color: "#8A93A2",
    marginTop: 2,
    lineHeight: 17,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginLeft: 51,
  },
  wishlistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EDF0F4",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    shadowColor: "#0B1220",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  wishlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  wishlistHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2233",
    letterSpacing: -0.2,
  },
  bellWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  wlItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  wlThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  wlThumbEmoji: {
    fontSize: 22,
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
    gap: 5,
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
    color: "#8A93A2",
  },
  dropBadge: {
    backgroundColor: "#E8F9EE",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dropText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F8A4C",
  },
  wlDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginLeft: 58,
  },
  notifPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDF0F4",
    padding: 14,
    marginTop: 14,
    shadowColor: "#0B1220",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  notifIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#1F8A4C",
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
    color: "#8A93A2",
    marginTop: 2,
  },
  communityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EDF0F4",
    padding: 16,
    shadowColor: "#0B1220",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  post: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 8,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3ECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 16,
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
    fontSize: 11.5,
    color: "#A0A8B5",
    marginTop: 1,
  },
  postBadge: {
    backgroundColor: "#E8F9EE",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  postBadgeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F8A4C",
  },
  postBody: {
    fontSize: 14,
    color: "#3A4354",
    lineHeight: 20,
    marginBottom: 4,
  },
  postDivider: {
    height: 1,
    backgroundColor: "#F1F4F8",
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A2233",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: "#8A93A2",
    marginTop: 3,
    lineHeight: 16,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingBottom: 42,
    paddingTop: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#0A84FF",
    width: 20,
  },
  dotInactive: {
    backgroundColor: "#DCE1E8",
  },
  arrowButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 26,
    borderRadius: 26,
    backgroundColor: "#0A84FF",
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
