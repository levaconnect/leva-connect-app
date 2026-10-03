import { View, Text, StyleSheet, FlatList, SegmentedControlIOS } from "react-native";
import { useRouter } from "expo-router";
import { useConnectionsStore } from "@/store/connectionsStore";
import { Avatar, Button, Badge, EmptyState, Loading, ConfirmDialog } from "@/components";
import { UserPlus, UserCheck, UserX, UserMinus, Clock, X } from "lucide-react-native";
import { useState, useEffect } from "react";

export default function ConnectionsScreen() {
  const router = useRouter();
  const {
    connections,
    incomingRequests,
    outgoingRequests,
    isLoading,
    error,
    fetchAll,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeConnection,
  } = useConnectionsStore();

  const [activeTab, setActiveTab] = useState<"connections" | "requests">("connections");
  const [requestTab, setRequestTab] = useState<"incoming" | "outgoing">("incoming");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  if (isLoading && connections.length === 0 && incomingRequests.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connections</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => { setActiveTab("connections"); setRequestTab("incoming"); }}
          style={[styles.tab, activeTab === "connections" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "connections" && styles.tabTextActive]}>
            My Connections ({connections.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("requests")}
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>
            Requests ({incomingRequests.length + outgoingRequests.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === "connections" ? (
        <ConnectionsList
          connections={connections}
          onRemove={handleRemoveConnection}
        />
      ) : (
        <RequestsView
          requestTab={requestTab}
          setRequestTab={setRequestTab}
          incoming={incomingRequests}
          outgoing={outgoingRequests}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onCancel={handleCancelRequest}
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="ghost" size="sm" onPress={fetchAll}>
            Retry
          </Button>
        </View>
      )}

      <ConfirmDialog
        visible={!!showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(null)}
        title="Remove Connection"
        message="Are you sure you want to remove this connection? This action cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (showRemoveConfirm) {
            removeConnection(showRemoveConfirm);
            setShowRemoveConfirm(null);
          }
        }}
        variant="danger"
      />
    </View>
  );
}

function ConnectionsList({ connections, onRemove }: { connections: any[]; onRemove: (userId: string) => void }) {
  if (connections.length === 0) {
    return (
      <EmptyState
        style={styles.emptyState}
        icon={<UserCheck size={48} color="#827B8B" />}
        title="No connections yet"
        description="Connect with community members to start building your network"
        actionLabel="Discover Members"
        onAction={() => { /* TODO: navigate to discover */ }}
      />
    );
  }

  return (
    <FlatList
      data={connections}
      renderItem={({ item }) => (
        <ConnectionItem connection={item} onRemove={onRemove} />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

function ConnectionItem({ connection, onRemove }: { connection: any; onRemove: (userId: string) => void }) {
  const otherUser = connection.otherUser;

  return (
    <View style={styles.connectionItem}>
      <Pressable onPress={() => { /* TODO: navigate to profile */ }} style={styles.connectionMain}>
        <Avatar
          source={otherUser?.avatarUrl ? { uri: otherUser.avatarUrl } : undefined}
          name={otherUser?.fullName}
          size="md"
        />
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>{otherUser?.fullName}</Text>
          {otherUser?.city && (
            <Text style={styles.connectionLocation}>{otherUser.city}</Text>
          )}
        </View>
        <View style={styles.connectionActions}>
          <Pressable onPress={() => onRemove(otherUser?.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <UserMinus size={20} color="#827B8B" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

function RequestsView({
  requestTab,
  setRequestTab,
  incoming,
  outgoing,
  onAccept,
  onReject,
  onCancel,
}: {
  requestTab: "incoming" | "outgoing";
  setRequestTab: (tab: "incoming" | "outgoing") => void;
  incoming: any[];
  outgoing: any[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const requests = requestTab === "incoming" ? incoming : outgoing;

  return (
    <View style={styles.requestsContainer}>
      <View style={styles.requestTabs}>
        <Pressable
          onPress={() => setRequestTab("incoming")}
          style={[styles.requestTab, requestTab === "incoming" && styles.requestTabActive]}
        >
          <Text style={[styles.requestTabText, requestTab === "incoming" && styles.requestTabTextActive]}>
            Received ({incoming.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setRequestTab("outgoing")}
          style={[styles.requestTab, requestTab === "outgoing" && styles.requestTabActive]}
        >
          <Text style={[styles.requestTabText, requestTab === "outgoing" && styles.requestTabTextActive]}>
            Sent ({outgoing.length})
          </Text>
        </Pressable>
      </View>

      {requests.length === 0 ? (
        <EmptyState
          style={styles.emptyState}
          icon={requestTab === "incoming" ? <UserPlus size={48} color="#827B8B" /> : <Clock size={48} color="#827B8B" />}
          title={requestTab === "incoming" ? "No incoming requests" : "No pending requests"}
          description={requestTab === "incoming"
            ? "When someone wants to connect, their request will appear here"
            : "Your sent connection requests will appear here"}
        />
      ) : (
        <FlatList
          data={requests}
          renderItem={({ item }) => (
            <RequestItem
              request={item}
              type={requestTab}
              onAccept={onAccept}
              onReject={onReject}
              onCancel={onCancel}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function RequestItem({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
}: {
  request: any;
  type: "incoming" | "outgoing";
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const otherUser = type === "incoming" ? request.sender : request.receiver;

  if (type === "incoming") {
    return (
      <View style={styles.requestItem}>
        <View style={styles.requestMain}>
          <Avatar
            source={otherUser?.avatarUrl ? { uri: otherUser.avatarUrl } : undefined}
            name={otherUser?.fullName}
            size="md"
          />
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{otherUser?.fullName}</Text>
            {otherUser?.city && <Text style={styles.requestLocation}>{otherUser.city}</Text>}
            <Text style={styles.requestMeta}>Wants to connect</Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <Button variant="outline" size="sm" onPress={() => onReject(request.id)}>
            <UserX size={16} color="#EF4444" />
            Decline
          </Button>
          <Button variant="primary" size="sm" onPress={() => onAccept(request.id)}>
            <UserCheck size={16} color="#FFFFFF" />
            Accept
          </Button>
        </View>
      </View>
    );
  } else {
    return (
      <View style={styles.requestItem}>
        <View style={styles.requestMain}>
          <Avatar
            source={otherUser?.avatarUrl ? { uri: otherUser.avatarUrl } : undefined}
            name={otherUser?.fullName}
            size="md"
          />
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{otherUser?.fullName}</Text>
            {otherUser?.city && <Text style={styles.requestLocation}>{otherUser.city}</Text>}
            <Text style={styles.requestMetaPending}>Request sent</Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <Button variant="outline" size="sm" onPress={() => onCancel(request.id)}>
            <X size={16} color="#827B8B" />
            Cancel
          </Button>
        </View>
      </View>
    );
  }
}

const handleRemoveConnection = (userId: string) => {
  // This would be passed from parent
};

const handleAcceptRequest = (id: string) => {
  // This would be passed from parent
};

const handleRejectRequest = (id: string) => {
  // This would be passed from parent
};

const handleCancelRequest = (id: string) => {
  // This would be passed from parent
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#21172F",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#7052C8",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#827B8B",
  },
  tabTextActive: {
    color: "#7052C8",
  },
  requestsContainer: {
    flex: 1,
  },
  requestTabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
  },
  requestTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  requestTabActive: {
    borderBottomColor: "#7052C8",
  },
  requestTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#827B8B",
  },
  requestTabTextActive: {
    color: "#7052C8",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 12,
  },
  connectionItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  connectionMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  connectionLocation: {
    fontSize: 13,
    color: "#827B8B",
  },
  connectionActions: {
    paddingLeft: 12,
  },
  requestItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  requestMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  requestLocation: {
    fontSize: 13,
    color: "#7052C8",
    fontWeight: "500",
  },
  requestMeta: {
    fontSize: 13,
    color: "#827B8B",
  },
  requestMetaPending: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "500",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  emptyState: {
    flex: 1,
    marginTop: 40,
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