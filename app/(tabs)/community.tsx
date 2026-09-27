import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase, useAuth } from "../../src/lib/supabase";
import { C, AppleCard, Group, EmojiTile, Skeleton, EmptyState } from "../../src/components/Apple";

interface Post {
  id: string;
  user_id: string;
  content: string;
  store: string | null;
  created_at: string;
  likes: number;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "τώρα";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} λ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ω`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} η`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} εβδ`;
  return new Date(dateStr).toLocaleDateString("el-GR", { day: "numeric", month: "short" });
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newStore, setNewStore] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("community_posts")
      .select("id,user_id,content,store,created_at,likes")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    if (!supabase) return;
    const ch = supabase
      .channel("community-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        setPosts((prev) => [payload.new as Post, ...prev]);
      })
      .subscribe();
    return () => {
      if (supabase) supabase.removeChannel(ch);
    };
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLike = useCallback(
    async (post: Post) => {
      if (!supabase) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: p.likes + 1 } : p)));
      const { error } = await supabase
        .from("community_posts")
        .update({ likes: post.likes + 1 })
        .eq("id", post.id);
      if (error) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: post.likes } : p)));
      }
    },
    []
  );

  const handlePost = useCallback(async () => {
    if (!supabase || !user || !newContent.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      store: newStore.trim() || null,
      likes: 0,
    });
    setPosting(false);
    if (!error) {
      setNewContent("");
      setNewStore("");
      setModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [supabase, user, newContent, newStore]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <AppleCard style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <EmojiTile emoji="👤" size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>Χρήστης</Text>
            <Text style={{ fontSize: 12, color: C.sub }}>{timeAgo(item.created_at)}</Text>
          </View>
          {item.store ? (
            <View style={{ backgroundColor: "#F2F2F7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: C.sub, fontWeight: "500" }}>{item.store}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 15, lineHeight: 21 }}>{item.content}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <Pressable
            onPress={() => handleLike(item)}
            hitSlop={8}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 5, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="heart" size={18} color={C.red} />
            <Text style={{ fontSize: 14, color: C.sub, fontWeight: "500" }}>{item.likes}</Text>
          </Pressable>
        </View>
      </AppleCard>
    ),
    [handleLike]
  );

  const renderSkeleton = useCallback(
    () => (
      <View>
        {[0, 1, 2].map((i) => (
          <AppleCard key={i} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton style={{ width: 80, height: 12 }} />
                <Skeleton style={{ width: 50, height: 10 }} />
              </View>
            </View>
            <Skeleton style={{ width: "100%", height: 14, marginBottom: 6 }} />
            <Skeleton style={{ width: "75%", height: 14 }} />
          </AppleCard>
        ))}
      </View>
    ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Κοινότητα</Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>{renderSkeleton()}</View>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="chatbubble-outline"
          title="Δεν υπάρχουν δημοσιεύσεις"
          subtitle="Γίνε ο πρώτος που μοιράζεται μια ευκαιρία ή συμβουλή!"
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
        />
      )}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setModalVisible(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 6 }}>Νέα δημοσίευση</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.2, marginBottom: 16 }}>Νέα δημοσίευση</Text>
            <TextInput
              value={newStore}
              onChangeText={setNewStore}
              placeholder="Κατάστημα (προαιρετικό)"
              placeholderTextColor={C.sub}
              style={styles.input}
            />
            <View style={{ height: 10 }} />
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="Γράψε κάτι χρήσιμο…"
              placeholderTextColor={C.sub}
              multiline
              numberOfLines={4}
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            />
            <View style={{ height: 16 }} />
            <Pressable
              onPress={handlePost}
              disabled={!newContent.trim() || posting}
              style={({ pressed }) => [
                styles.postBtn,
                { opacity: !newContent.trim() || posting ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                {posting ? "Δημοσίευση…" : "Δημοσίευση"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.tint,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.ter,
    alignSelf: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  postBtn: {
    backgroundColor: C.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
