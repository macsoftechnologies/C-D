import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';

interface SubAdmin {
  admin_id: string;
  admin_name: string;
  mobile_number: string;
  email: string;
  address: string;
  photo: string;
  role_id: string;
  status: string;
  created_at: string;
}

const GET_SUBADMINS_URL =
  'http://macsof.in/milkmanagement/api/getallsubadmins';

const formatDate = (raw: string) => {
  const date = new Date(raw.replace(' ', 'T'));

  if (isNaN(date.getTime())) return raw;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function SuperAdminDashboard() {
  const { width } = useWindowDimensions();

  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Responsive card width
  const horizontalPadding = width < 600 ? 18 : 30;
  const cardGap = width < 600 ? 12 : 18;

  const cardWidth =
    width < 600
      ? width - horizontalPadding * 2
      : Math.min(360, width - horizontalPadding * 2);


      const getProfileImageUrl = (photo?: string) => {
  if (!photo) return null;

  const cleanUrl = photo.trim();

  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('http://')) {
    return cleanUrl.replace('http://', 'https://');
  }

  return cleanUrl;
};

  const fetchSubAdmins = useCallback(async () => {
    try {
      const response = await axios.get(GET_SUBADMINS_URL, {
        headers: {
          'Auth-Key': 'canandairyApi',
          'Content-Type': 'application/json',
        },
      });

      if (response.data.status === 200) {
        setSubAdmins(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    fetchSubAdmins().finally(() => {
      setLoading(false);
    });
  }, [fetchSubAdmins]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await fetchSubAdmins();

    setRefreshing(false);
  }, [fetchSubAdmins]);

  const handleLogout = () => {
    router.replace('/registration/login');
  };

  const handleAddPress = () => {
    router.push('/super_admin/createsub_admin');
  };

  const handleView = (item: SubAdmin) => {
    router.push({
      pathname: '/super_admin/admin_overview',
      params: {
        admin_id: item.admin_id,
      },
    });
  };

  const handleUpdate = (item: SubAdmin) => {
    router.push({
      pathname: '/super_admin/update_admin',
      params: {
        admin_id: item.admin_id,
      },
    });
  };

  const renderItem = ({ item }: { item: SubAdmin }) => {
    const isActive = item.status === '1';

    return (
      <View
        style={[
          styles.card,
          {
            width: cardWidth,
            marginRight: width >= 600 ? cardGap : 0,
          },
        ]}
      >
        {/* Profile Section */}
      <View style={styles.profileSection}>
  {getProfileImageUrl(item.photo) ? (
    <Image
      source={{
        uri: getProfileImageUrl(item.photo)!,
      }}
      style={styles.avatar}
      resizeMode="cover"
      onLoad={() => {
        console.log(
          'Profile image loaded:',
          getProfileImageUrl(item.photo)
        );
      }}
      onError={(error) => {
        console.log(
          'Profile image failed:',
          getProfileImageUrl(item.photo),
          error.nativeEvent
        );
      }}
    />
  ) : (
    <View style={styles.avatarFallback}>
      <Ionicons
        name="person"
        size={48}
        color="#777"
      />
    </View>
  )}

  <View
    style={[
      styles.statusBadge,
      isActive
        ? styles.statusActive
        : styles.statusInactive,
    ]}
  >
    <View
      style={[
        styles.statusDot,
        {
          backgroundColor: isActive
            ? '#4CAF50'
            : '#F44336',
        },
      ]}
    />

    <Text style={styles.statusText}>
      {isActive ? 'Active' : 'Inactive'}
    </Text>
  </View>
</View>

        {/* Admin Name */}
        <Text
          style={styles.cardName}
          numberOfLines={1}
        >
          {item.admin_name}
        </Text>

        {/* Role */}
        <Text style={styles.roleText}>
          Sub Administrator
        </Text>

        {/* Details */}
        <View style={styles.detailsContainer}>
          {/* Mobile */}
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="call-outline"
                size={15}
                color="#4CAF50"
              />
            </View>

            <Text
              style={styles.rowText}
              numberOfLines={1}
            >
              {item.mobile_number}
            </Text>
          </View>

          {/* Email */}
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="mail-outline"
                size={15}
                color="#4CAF50"
              />
            </View>

            <Text
              style={styles.rowText}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>

          {/* Address */}
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="location-outline"
                size={15}
                color="#4CAF50"
              />
            </View>

            <Text
              style={styles.rowText}
              numberOfLines={2}
            >
              {item.address}
            </Text>
          </View>

          {/* Created Date */}
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#999"
              />
            </View>

            <Text style={styles.dateText}>
              Added {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.8}
            onPress={() => handleView(item)}
          >
            <Ionicons
              name="eye-outline"
              size={17}
              color="#ffff"
            />

            <Text style={styles.viewButtonText}>
              View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.8}
            onPress={() =>   router.push({
              pathname: '/super_admin/myfarmers',
              params: {
                admin_id: item.admin_id,
              },
            })}
          >
            <Ionicons
              name="create-outline"
              size={17}
              color="#fff"
            />

            <Text style={styles.updateButtonText}>
              My Farmers
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Welcome, Super Admin
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your sub administrators
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#fff"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Header */}
      <View style={styles.addBar}>
        <View>
          <Text style={styles.sectionTitle}>
            Sub Admins
          </Text>

          <Text style={styles.sectionSubtitle}>
            {subAdmins.length} administrators
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add"
            size={18}
            color="#fff"
          />

          <Text style={styles.addBtnText}>
            Add SubAdmin
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && subAdmins.length === 0 ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color="#4CAF50"
          size="large"
        />
      ) : (
        <FlatList
          data={subAdmins}
          keyExtractor={(item) => item.admin_id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No sub admins added yet.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },

  /* Header */
  header: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#AFAFAF',
    fontSize: 11,
    marginTop: 3,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },

  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Section */
  addBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#161616',
  },

  sectionSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },

  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  /* List */
  listContent: {
    paddingBottom: 30,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },

  /* Portrait Card */
  card: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,

    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  /* Profile */
  profileSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EDEDED',
    borderWidth: 3,
    borderColor: '#F0F0F0',
  },

  /* Default Black & White Profile */
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEEEEE',
    borderWidth: 3,
    borderColor: '#DADADA',

    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Status */
  statusBadge: {
    position: 'absolute',
    bottom: -3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    gap: 5,
  },

  statusActive: {
    backgroundColor: '#E8F5E9',
  },

  statusInactive: {
    backgroundColor: '#FBE9E7',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },

  /* Name */
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#161616',
    textAlign: 'center',
    marginTop: 4,
  },

  roleText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 15,
  },

  /* Details */
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 13,
    marginBottom: 15,
  },

  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F1F8F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  rowText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },

  dateText: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },

  /* Buttons */
  buttonContainer: {
    flexDirection: 'row',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
  },

  viewButton: {
    flex: 1,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  viewButtonText: {
    color: '#ffff',
    fontSize: 12,
    fontWeight: '700',
  },

  updateButton: {
    flex: 1.4,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
     color : '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  updateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});