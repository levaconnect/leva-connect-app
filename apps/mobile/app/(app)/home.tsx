import { View, Text, StyleSheet, FlatList, RefreshControl, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFeedStore } from "@/store/feedStore";
import { useAuthStore } from "@/store/authStore";
import { Button, Input, Avatar, Card, Badge, EmptyState, Loading } from "@/components";
import { Plus, Heart, MessageCircle, MoreVertical, Flag, Edit, Trash2, Send, User } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    posts,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    page,
    fetchPosts,
    refreshPosts,
    createPost,
    likePost,
    unlikePost,
    deletePost,
    addComment,
  } = useFeedStore();

  const [newPostContent, setNewPostContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setCreatingPost(true);
    try {
      await createPost(newPostContent.trim());
      setNewPostContent("");
    } catch (err) {
      // Error handled in store
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (err) {
      // Error handled in store
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;

    setSubmittingComment({ ...submittingComment, [postId]: true });
    try {
      setCommentTexts({ ...commentTexts, [postId]: "" });
    } catch (err) {
      // Error handled
    } finally {
      setSubmittingComment({ ...submittingComment, [postId]: false });
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      currentUserId={user?.id}
      onLike={handleLike}
      onComment={(id) => setExpandedComments({ ...expandedComments, [id]: !expandedComments[id] })}
      onDelete={handleDelete}
      expandedComments={expandedComments}
      commentTexts={commentTexts}
      setCommentTexts={setCommentTexts}
      submittingComment={submittingComment}
      onCommentSubmit={handleCommentSubmit}
    />
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadMore}>
        <Loading size="small" />
      </View>
    );
  };

  if (isLoading && posts.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.createPost}>
        <Avatar name={user?.email || "User"} size="md" />
        <View style={styles.createPostInput}>
          <Input
            placeholder="What's on your mind?"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
          />
          <View style={styles.createPostActions}>
            <Button variant="ghost" size="sm" onPress={() => { /* TODO: image picker */ }}>
              <ImageIcon size={18} color="#827B8B" />
            </Button>
            <Button variant="primary" size="sm" loading={creatingPost} onPress={handleCreatePost}>
              Post
            </Button>
          </View>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshPosts} colors={["#7052C8"]} />
        }
        ListFooterComponent={renderFooter}
        onEndReached={() => hasMore && !isLoading && fetchPosts(page + 1)}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {posts.length === 0 && !isLoading && (
        <EmptyState
          icon={<Send size={48} color="#827B8B" />}
          title="No posts yet"
          description="Be the first to share something with the community!"
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="ghost" size="sm" onPress={() => refreshPosts()}>
            Retry
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function PostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onDelete,
  expandedComments,
  commentTexts,
  setCommentTexts,
  submittingComment,
  onCommentSubmit,
}: any) {
  const isOwnPost = post.authorId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const showComments = expandedComments[post.id];
  const comments = post.comments || [];

  return (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable onPress={() => { /* TODO: navigate to profile */ }}>
          <Avatar
            source={post.author?.avatarUrl ? { uri: post.author.avatarUrl } : undefined}
            name={post.author?.fullName}
            size="md"
          />
        </Pressable>
        <View style={styles.postAuthorInfo}>
          <Pressable onPress={() => { /* TODO: navigate to profile */ }}>
            <Text style={styles.postAuthorName}>{post.author?.fullName}</Text>
          </Pressable>
          <Text style={styles.postTime}>{timeAgo}</Text>
        </View>
        {isOwnPost && (
          <PostMenu post={post} onDelete={onDelete} />
        )}
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postActions}>
        <ActionButton
          icon={post.isLiked ? <Heart size={20} color="#EF4444" fill="#EF4444" /> : <Heart size={20} color="#827B8B" />}
          label={post.likeCount > 0 ? String(post.likeCount) : ""}
          onPress={() => onLike(post.id, post.isLiked)}
          active={post.isLiked}
        />
        <ActionButton
          icon={<MessageCircle size={20} color="#827B8B" />}
          label={post.commentCount > 0 ? String(post.commentCount) : ""}
          onPress={() => onComment(post.id)}
        />
        <ActionButton
          icon={<Send size={20} color="#827B8B" />}
          label=""
          onPress={() => { /* TODO: share */ }}
        />
      </View>

      {showComments && (
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              Comments ({post.commentCount})
            </Text>
          </View>

          {comments.map((comment: any) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} />
          ))}

          <View style={styles.addComment}>
            <Avatar name={currentUserId || "You"} size="sm" />
            <Input
              placeholder="Write a comment..."
              value={commentTexts[post.id] || ""}
              onChangeText={(text) => setCommentTexts({ ...commentTexts, [post.id]: text })}
              onSubmitEditing={() => onCommentSubmit(post.id)}
              multiline
              numberOfLines={3}
            />
            <Button
              variant="primary"
              size="sm"
              loading={submittingComment[post.id]}
              onPress={() => onCommentSubmit(post.id)}
            >
              Post
            </Button>
          </View>
        </View>
      )}
    </Card>
  );
}

function PostMenu({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.postMenu}>
      <Pressable onPress={() => setShowMenu(!showMenu)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MoreVertical size={24} color="#827B8B" />
      </Pressable>
      {showMenu && (
        <View style={styles.menuDropdown}>
          <Pressable
            onPress={() => { setShowMenu(false); /* TODO: edit */ }}
            style={styles.menuItem}
          >
            <Edit size={18} color="#282331" />
            <Text style={styles.menuItemText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => { setShowMenu(false); onDelete(post.id); }}
            style={styles.menuItemDanger}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text style={styles.menuItemTextDanger}>Delete</Text>
          </Pressable>
          <Pressable
            onPress={() => { setShowMenu(false); /* TODO: report */ }}
            style={styles.menuItemDanger}
          >
            <Flag size={18} color="#EF4444" />
            <Text style={styles.menuItemTextDanger}>Report</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ActionButton({ icon, label, onPress, active }: { icon: React.ReactNode; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={styles.actionButtonContent}>{icon}</View>
      {label && <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>}
    </Pressable>
  );
}

function CommentItem({ comment, currentUserId }: { comment: any; currentUserId?: string }) {
  const isOwn = comment.authorId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  return (
    <View style={styles.comment}>
      <Avatar
        source={comment.author?.avatarUrl ? { uri: comment.author.avatarUrl } : undefined}
        name={comment.author?.fullName}
        size="sm"
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.author?.fullName}</Text>
          <Text style={styles.commentTime}>{timeAgo}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  );
}

function ImageIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderWidth: 2, borderColor: color, borderRadius: 4 }}>
        <View style={{ position: "absolute", top: "25%", left: "25%", width: "50%", height: "50%", backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  createPost: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
  },
  createPostInput: {
    flex: 1,
    gap: 8,
  },
  createPostActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },
  postCard: {
    padding: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  postAuthorInfo: {
    flex: 1,
    gap: 2,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#282331",
  },
  postTime: {
    fontSize: 12,
    color: "#827B8B",
  },
  postContent: {
    fontSize: 15,
    color: "#282331",
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8E2F0",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtonContent: {
    padding: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#827B8B",
  },
  actionLabelActive: {
    color: "#EF4444",
    fontWeight: "600",
  },
  postMenu: {
    position: "relative",
  },
  menuDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    minWidth: 140,
    zIndex: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuItemDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#282331",
  },
  menuItemTextDanger: {
    fontSize: 15,
    fontWeight: "500",
    color: "#EF4444",
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8E2F0",
    gap: 12,
  },
  commentsHeader: {
    paddingHorizontal: 4,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#282331",
  },
  addComment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  comment: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#282331",
  },
  commentTime: {
    fontSize: 11,
    color: "#827B8B",
  },
  commentText: {
    fontSize: 13,
    color: "#282331",
    lineHeight: 18,
  },
  loadMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FEF2F2",
    borderTopWidth: 1,
    borderTopColor: "#FECACA",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
});