import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useDiscoverStore } from "@/store/discoverStore";
import { useConnectionsStore } from "@/store/connectionsStore";
import { Avatar, Button, Badge, EmptyState, Loading } from "@/components";
import { Search, Filter, UserPlus, Clock, X, MapPin } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";

export default function DiscoverScreen() {
  const router = useRouter();
  const { members, isLoading, error, hasMore, page, filters, fetchDiscover, search, filterByCity, clearFilters } = useDiscoverStore();
  const { sendRequest } = useConnectionsStore();

  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [cityQuery, setCityQuery] = useState(filters.city || "");
  const [showCityFilter, setShowCityFilter] = useState(false);

  useEffect(() => {
    fetchDiscover(1);
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce search
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      search(text);
    }, 300);
  };

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleFilterCity = (city: string) => {
    setCityQuery(city);
    filterByCity(city);
    setShowCityFilter(false);
  };

  const renderMember = ({ item }: { item: any }) => (
    <MemberCard
      member={item}
      onConnect={() => handleConnect(item.id)}
      connectionStatus={item.connectionStatus}
    />
  );

  const handleConnect = async (memberId: string) => {
    try {
      await sendRequest(memberId);
      // Refresh discover to update connection status
      fetchDiscover(page);
    } catch (err) {
      // Error handled in store
    }
  };

  if (isLoading && members.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={20} color="#827B8B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
            placeholderTextColor="#827B8B"
            autoCapitalize="words"
          />
        </View>
        <Pressable onPress={() => setShowCityFilter(!showCityFilter)} style={styles.filterButton}>
          <Filter size={20} color="#7052C8" />
        </Pressable>
      </View>

      {(filters.search || filters.city) && (
        <View style={styles.activeFilters}>
          {filters.search && (
            <Badge variant="primary" size="sm">
              {filters.search}
              <Pressable onPress={() => { search(""); setSearchQuery(""); }} style={styles.removeFilter}>
                <X size={12} color="#7052C8" />
              </Pressable>
            </Badge>
          )}
          {filters.city && (
            <Badge variant="primary" size="sm">
              <MapPin size={12} color="#7052C8" />
              {filters.city}
              <Pressable onPress={() => { filterByCity(""); setCityQuery(""); }} style={styles.removeFilter}>
                <X size={12} color="#7052C8" />
              </Pressable>
            </Badge>
          )}
        </View>
      )}

      {showCityFilter && (
        <View style={styles.cityFilterInput}>
          <TextInput
            placeholder="Filter by city..."
            value={cityQuery}
            onChangeText={setCityQuery}
            onSubmitEditing={() => handleFilterCity(cityQuery)}
            style={styles.cityInput}
            placeholderTextColor="#827B8B"
            autoCapitalize="words"
          />
        </View>
      )}

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMore}>
              <Loading size="small" />
            </View>
          ) : members.length > 0 ? (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>You've seen everyone!</Text>
            </View>
          ) : null
        }
        onEndReached={() => hasMore && !isLoading && fetchDiscover(page + 1)}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {members.length === 0 && !isLoading && (
        <EmptyState
          icon={<UserPlus size={48} color="#827B8B" />}
          title={filters.search || filters.city ? "No members found" : "No members to discover"}
          description={filters.search || filters.city
            ? "Try adjusting your search or filters"
            : "All available members will appear here once approved"}
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="ghost" size="sm" onPress={() => fetchDiscover(page)}>
            Retry
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function MemberCard({ member, onConnect, connectionStatus }: { member: any; onConnect: () => void; connectionStatus: string }) {
  const isPending = connectionStatus === "pending_sent";
  const isConnected = connectionStatus === "connected";

  return (
    <View style={styles.memberCard}>
      <Pressable onPress={() => { /* TODO: navigate to profile */ }}>
        <View style={styles.memberHeader}>
          <Avatar
            source={member.avatarUrl ? { uri: member.avatarUrl } : undefined}
            name={member.fullName}
            size="lg"
          />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.fullName}</Text>
            {member.city && (
              <View style={styles.memberLocation}>
                <MapPin size={12} color="#827B8B" />
                <Text style={styles.memberLocationText}>{member.city}</Text>
              </View>
            )}
            {member.profession && (
              <Text style={styles.memberProfession}>{member.profession}</Text>
            )}
            {member.bio && (
              <Text style={styles.memberBio} numberOfLines={2}>{member.bio}</Text>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.memberActions}>
        {isConnected ? (
          <Badge variant="success" size="sm">Connected</Badge>
        ) : isPending ? (
          <Badge variant="warning" size="sm">Pending</Badge>
        ) : (
          <Button variant="primary" size="sm" onPress={onConnect}>
            <UserPlus size={16} color="#FFFFFF" />
            Connect
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F3F8",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#282331",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EDE8F9",
    justifyContent: "center",
    alignItems: "center",
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  removeFilter: {
    marginLeft: 4,
    padding: 2,
  },
  cityFilterInput: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cityInput: {
    backgroundColor: "#F5F3F8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#282331",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 12,
  },
  memberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 16,
  },
  memberHeader: {
    flexDirection: "row",
    gap: 16,
  },
  memberInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  memberLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberLocationText: {
    fontSize: 13,
    color: "#827B8B",
  },
  memberProfession: {
    fontSize: 13,
    color: "#7052C8",
    fontWeight: "500",
  },
  memberBio: {
    fontSize: 13,
    color: "#827B8B",
    lineHeight: 18,
  },
  memberActions: {
    alignItems: "flex-end",
    paddingTop: 4,
  },
  loadMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfList: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    fontSize: 14,
    color: "#827B8B",
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