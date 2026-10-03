import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useMessagesStore } from "@/store/messagesStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar, Button, EmptyState, Loading } from "@/components";
import { Plus, Send, Clock, Check, CheckCheck } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    isLoadingMessages,
    error,
    hasMore,
    page,
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
    setActiveConversation,
    addMessage,
  } = useMessagesStore();

  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id, 1);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    setSendingMessage(true);
    try {
      await sendMessage(activeConversation.id, newMessage.trim());
      setNewMessage("");
    } catch (err) {
      // Error handled in store
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewChat = async (participantId: string) => {
    try {
      const conversationId = await createConversation(participantId);
      setActiveConversation(conversations.find(c => c.id === conversationId) || null);
      setShowNewChat(false);
    } catch (err) {
      // Error handled
    }
  };

  if (isLoading && conversations.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {activeConversation ? (
        <ConversationView
          conversation={activeConversation}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendingMessage={sendingMessage}
          onSend={handleSendMessage}
          currentUserId={user?.id}
          messagesEndRef={messagesEndRef}
          isLoadingMessages={isLoadingMessages}
          hasMore={hasMore}
          page={page}
          fetchMessages={fetchMessages}
        />
      ) : (
        <ConversationsList
          conversations={conversations}
          onNewChat={() => setShowNewChat(true)}
          currentUserId={user?.id}
        />
      )}

      {showNewChat && (
        <NewChatModal
          visible={showNewChat}
          onClose={() => setShowNewChat(false)}
          onSelect={handleNewChat}
          currentUserId={user?.id}
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ConversationsList({
  conversations,
  onNewChat,
  currentUserId,
}: { conversations: any[]; onNewChat: () => void; currentUserId?: string }) {
  return (
    <View style={styles.conversationsContainer}>
      <View style={styles.conversationsHeader}>
        <Text style={styles.conversationsTitle}>Messages</Text>
        <Pressable onPress={onNewChat} style={styles.newChatButton}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          style={styles.emptyState}
          icon={<Send size={48} color="#827B8B" />}
          title="No conversations yet"
          description="Start a conversation with a connection"
          actionLabel="New Message"
          onAction={onNewChat}
        />
      ) : (
        <FlatList
          data={conversations}
          renderItem={({ item }) => <ConversationItem conversation={item} currentUserId={currentUserId} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ConversationItem({ conversation, currentUserId }: { conversation: any; currentUserId?: string }) {
  const otherUser = conversation.otherUser;
  const lastMessage = conversation.lastMessage;
  const timeAgo = lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true }) : "";

  return (
    <Pressable
      onPress={() => { /* TODO: navigate to conversation */ }}
      style={styles.conversationItem}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Avatar
        source={otherUser?.avatarUrl ? { uri: otherUser.avatarUrl } : undefined}
        name={otherUser?.fullName}
        size="md"
      />
      <View style={styles.conversationInfo} flex={1}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{otherUser?.fullName}</Text>
          {timeAgo && <Text style={styles.conversationTime}>{timeAgo}</Text>}
        </View>
        <View style={styles.conversationPreview}>
          {lastMessage && (
            <>
              {lastMessage.senderId === currentUserId && (
                <View style={styles.sentIndicator}>
                  <CheckCheck size={12} color="#827B8B" />
                </View>
              )}
              <Text style={styles.conversationLastMessage} numberOfLines={1}>
                {lastMessage.content}
              </Text>
            </>
          )}
        </View>
      </View>
      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

function ConversationView({
  conversation,
  messages,
  newMessage,
  setNewMessage,
  sendingMessage,
  onSend,
  currentUserId,
  messagesEndRef,
  isLoadingMessages,
  hasMore,
  page,
  fetchMessages,
}: any) {
  const otherUser = conversation.otherUser;

  return (
    <View style={styles.conversationContainer}>
      <View style={styles.conversationHeader}>
        <Pressable onPress={() => { /* TODO: go back */ }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.backButton}>
            <View style={styles.backIcon} />
          </View>
        </Pressable>
        <Pressable onPress={() => { /* TODO: view profile */ }} style={styles.otherUserInfo}>
          <Avatar
            source={otherUser?.avatarUrl ? { uri: otherUser.avatarUrl } : undefined}
            name={otherUser?.fullName}
            size="md"
          />
          <View style={styles.otherUserDetails}>
            <Text style={styles.otherUserName}>{otherUser?.fullName}</Text>
            <Text style={styles.otherUserStatus}>Online</Text>
          </View>
        </Pressable>
      </View>

      <FlatList
        ref={messagesEndRef}
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} currentUserId={currentUserId} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasMore && !isLoadingMessages && fetchMessages(conversation.id, page + 1)}
        onEndReachedThreshold={0.5}
        inverted
      />

      {isLoadingMessages && messages.length === 0 && (
        <View style={styles.loadingMessages}>
          <Loading size="small" />
        </View>
      )}

      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={onSend}
          multiline
          maxLength={5000}
          placeholderTextColor="#827B8B"
        />
        <Pressable onPress={onSend} disabled={!newMessage.trim() || sendingMessage} style={styles.sendButton}>
          <Send size={24} color={newMessage.trim() && !sendingMessage ? "#FFFFFF" : "#827B8B"} />
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({ message, currentUserId }: { message: any; currentUserId?: string }) {
  const isOwn = message.senderId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

  return (
    <View style={[styles.messageWrapper, isOwn && styles.messageWrapperOwn]}>
      {!isOwn && (
        <Avatar
          source={message.sender?.avatarUrl ? { uri: message.sender.avatarUrl } : undefined}
          name={message.sender?.fullName}
          size="sm"
        />
      )}
      <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{message.content}</Text>
        <View style={[styles.messageMeta, isOwn && styles.messageMetaOwn]}>
          <Text style={styles.messageTime}>{timeAgo}</Text>
          {isOwn && <CheckCheck size={12} color="#BBA5F5" />}
        </View>
      </View>
      {isOwn && <View style={styles.messageSpacer} />}
    </View>
  );
}

function NewChatModal({
  visible,
  onClose,
  onSelect,
  currentUserId,
}: { visible: boolean; onClose: () => void; onSelect: (id: string) => void; currentUserId?: string }) {
  // This would show a list of connections to start a chat with
  // For now, just a placeholder
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Message</Text>
          <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={24} color="#827B8B" />
          </Pressable>
        </View>
        <Text style={styles.modalText}>Select a connection to message</Text>
        {/* TODO: List connections */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  conversationsContainer: {
    flex: 1,
  },
  conversationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  conversationsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#21172F",
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#7052C8",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 8,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  conversationTime: {
    fontSize: 12,
    color: "#827B8B",
  },
  conversationPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sentIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  conversationLastMessage: {
    fontSize: 13,
    color: "#827B8B",
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#7052C8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    marginTop: 60,
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F3F8",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#7052C8",
    borderRadius: 4,
    transform: [{ rotate: "45deg" }],
  },
  otherUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  otherUserDetails: {
    flex: 1,
    gap: 2,
  },
  otherUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  otherUserStatus: {
    fontSize: 12,
    color: "#10B981",
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  messageWrapper: {
    flexDirection: "row",
    gap: 8,
    maxWidth: "85%",
  },
  messageWrapperOwn: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  messageBubble: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  messageBubbleOwn: {
    backgroundColor: "#7052C8",
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: "#282331",
    lineHeight: 21,
  },
  messageTextOwn: {
    color: "#FFFFFF",
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  messageMetaOwn: {
    flexDirection: "row-reverse",
  },
  messageTime: {
    fontSize: 10,
    color: "#827B8B",
  },
  messageSpacer: {
    width: 40,
  },
  loadingMessages: {
    paddingVertical: 20,
    alignItems: "center",
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E2F0",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#F5F3F8",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#282331",
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7052C8",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 23, 47, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#282331",
  },
  modalText: {
    fontSize: 15,
    color: "#827B8B",
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
});