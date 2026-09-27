import { View, Text, Pressable, Animated, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { C } from "../../src/components/Apple";

const { width } = Dimensions.get("window");

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

  const isLastPage = page === 2;

  return (
    <View style={[styles.container, isLastPage && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, isLastPage && styles.skipTextDark]}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.pagesContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={[styles.page, { width }]}>
          <Text style={styles.heading}>Real offers. Real people.</Text>
          <Text style={styles.subtitle}>
            Scan products, see the best deals from your area and help others in the community.
          </Text>

          <View style={styles.phoneMockup}>
            <View style={styles.phoneNotch} />
            <View style={styles.phoneContent}>
              <View style={styles.scanFrame}>
                <View style={styles.scanCorner} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </View>
              <View style={styles.scanLine} />
              <Text style={styles.scanLabel}>Scanning...</Text>
            </View>
          </View>
        </View>

        <View style={[styles.page, { width }]}>
          <Text style={styles.heading}>Track your wishlist.</Text>
          <Text style={styles.subtitle}>
            Add products you care about and get notified when they go on offer — wherever you are.
          </Text>

          <View style={styles.wishlistContainer}>
            <View style={styles.wishlistCard}>
              <View style={styles.wishlistItem}>
                <View style={styles.wishlistIcon}>
                  <Text style={styles.wishlistIconText}>🍪</Text>
                </View>
                <View style={styles.wishlistInfo}>
                  <Text style={styles.wishlistName}>Oreo Cookies</Text>
                  <Text style={styles.wishlistStore}>Tesco · 0.3 km</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-40%</Text>
                </View>
              </View>
              <View style={styles.wishlistDivider} />
              <View style={styles.wishlistItem}>
                <View style={styles.wishlistIcon}>
                  <Text style={styles.wishlistIconText}>🫒</Text>
                </View>
                <View style={styles.wishlistInfo}>
                  <Text style={styles.wishlistName}>Olive Oil</Text>
                  <Text style={styles.wishlistStore}>Sainsbury's · 0.5 km</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-25%</Text>
                </View>
              </View>
              <View style={styles.wishlistDivider} />
              <View style={styles.wishlistItem}>
                <View style={styles.wishlistIcon}>
                  <Text style={styles.wishlistIconText}>💪</Text>
                </View>
                <View style={styles.wishlistInfo}>
                  <Text style={styles.wishlistName}>Protein Bar</Text>
                  <Text style={styles.wishlistStore}>Boots · 0.8 km</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-30%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.page, { width }]}>
          <Text style={[styles.heading, styles.headingDark]}>Together we save more.</Text>
          <Text style={[styles.subtitle, styles.subtitleDark]}>
            Join a community that shares the best deals, helps each other and makes smart choices.
          </Text>

          <View style={styles.mapContainer}>
            <View style={styles.mapPin}>
              <Text style={styles.mapPinText}>🏷️</Text>
            </View>
            <View style={[styles.mapPin, styles.mapPin2]}>
              <Text style={styles.mapPinText}>❤️</Text>
            </View>
            <View style={[styles.mapPin, styles.mapPin3]}>
              <Text style={styles.mapPinText}>🏷️</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={[styles.avatar, styles.avatar2]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={[styles.avatar, styles.avatar3]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.dealBadge}>
              <Text style={styles.dealBadgeText}>-35%</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                page === index ? styles.dotActive : styles.dotInactive,
                isLastPage && page !== index && styles.dotInactiveDark,
              ]}
            />
          ))}
        </View>

        {isLastPage ? (
          <Pressable style={styles.getStartedButton} onPress={handleStart}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.arrowButton} onPress={() => goToPage(page + 1)}>
            <Text style={styles.arrowText}>→</Text>
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
  containerDark: {
    backgroundColor: "#1C1C1E",
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
    color: "#8E8E93",
    fontWeight: "500",
  },
  skipTextDark: {
    color: "#8E8E93",
  },
  pagesContainer: {
    flex: 1,
    flexDirection: "row",
  },
  page: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "left",
    marginBottom: 12,
  },
  headingDark: {
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "left",
    lineHeight: 24,
    marginBottom: 40,
  },
  subtitleDark: {
    color: "#8E8E93",
  },
  phoneMockup: {
    width: 220,
    height: 380,
    backgroundColor: "#F2F2F7",
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#1C1C1E",
    alignItems: "center",
    overflow: "hidden",
  },
  phoneNotch: {
    width: 100,
    height: 24,
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 0,
  },
  phoneContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 140,
    height: 140,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#007AFF",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    top: 0,
    left: 0,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    left: "auto",
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  scanCornerBL: {
    bottom: 0,
    top: "auto",
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    width: 120,
    height: 2,
    backgroundColor: "#007AFF",
    marginTop: 16,
  },
  scanLabel: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    marginTop: 12,
  },
  wishlistContainer: {
    width: "100%",
  },
  wishlistCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    padding: 16,
  },
  wishlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  wishlistIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  wishlistIconText: {
    fontSize: 22,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  wishlistStore: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  wishlistDivider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginLeft: 56,
  },
  mapContainer: {
    width: "100%",
    height: 280,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    position: "relative",
    overflow: "hidden",
  },
  mapPin: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
    top: 40,
    left: 40,
  },
  mapPin2: {
    top: 100,
    right: 60,
    left: "auto",
  },
  mapPin3: {
    bottom: 60,
    left: 80,
    top: "auto",
  },
  mapPinText: {
    fontSize: 16,
  },
  avatar: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    top: 160,
    left: 120,
  },
  avatar2: {
    backgroundColor: "#FF9500",
    top: 80,
    left: 200,
  },
  avatar3: {
    backgroundColor: "#FF3B30",
    bottom: 40,
    right: 40,
    top: "auto",
  },
  avatarText: {
    fontSize: 18,
  },
  dealBadge: {
    position: "absolute",
    backgroundColor: "#34C759",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    top: 140,
    right: 40,
  },
  dealBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#007AFF",
  },
  dotInactive: {
    backgroundColor: "#E5E5EA",
  },
  dotInactiveDark: {
    backgroundColor: "#48484A",
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  getStartedButton: {
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
