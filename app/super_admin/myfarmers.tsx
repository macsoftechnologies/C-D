import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getFarmersByAdmin,
  getAllFarmers,
  Farmer,
} from '@/src/services/dairyApi';
import { FarmerCardSkeleton } from '@/components/Shimmer';

const formatDate = (raw?: string) => {
  if (!raw) {
    return '-';
  }

  const normalized = raw.includes(' ')
    ? raw.replace(' ', 'T')
    : raw;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function MyFarmers() {
  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{
    admin_id?: string | string[];
  }>();

  const adminId = Array.isArray(params.admin_id)
    ? params.admin_id[0]
    : params.admin_id;

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedFarmerImages, setFailedFarmerImages] = useState<Record<string, boolean>>({});

  /**
   * Fetch farmers assigned to admin/sub-admin with caching and parallel fetch.
   */
  const fetchFarmersByAdmin = useCallback(async (force = false) => {
    try {
      setError(false);
      setErrorMessage('');

      let farmerData: Farmer[] = [];

      if (adminId) {
        farmerData = await getFarmersByAdmin(adminId, force);
      } else {
        farmerData = await getAllFarmers(force);
      }

      setFarmers(farmerData);
      setError(false);
      setErrorMessage('');
    } catch (error: any) {
      console.log('[SUPER ADMIN MY FARMERS ERROR]:', error);
      if (error?.response?.status === 404) {
        setFarmers([]);
        setError(false);
      } else {
        setFarmers((prev) => {
          if (prev.length > 0) {
            return prev;
          }
          setError(true);
          setErrorMessage(
            error?.response?.data?.message || error?.message || 'Unable to retrieve farmers.'
          );
          return [];
        });
      }
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useFocusEffect(
    useCallback(() => {
      fetchFarmersByAdmin(false);
    }, [fetchFarmersByAdmin])
  );

  const onRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await fetchFarmersByAdmin(true);
    setRefreshing(false);
  };

  const handleView = (item: Farmer) => {
    if (!item.farmer_id) {
      console.log(
        '[VIEW FARMER] Farmer ID missing',
      );
      return;
    }

    router.push({
      pathname: '/super_admin/farmer_overview',
      params: {
        farmer_id: String(item.farmer_id),
        admin_id: String(item.admin_id ?? adminId ?? ''),
        farmer_name: item.farmer_name || '',
        code: item.code || '',
        mobile_number: item.mobile_number || '',
        aadhar_number: item.aadhar_number || '',
        address: item.address || '',
        status: String(item.status ?? '1'),
        profile: item.profile || '',
        created_at: item.created_at || '',
      },
    });
  };

  const handleRecordMilk = (item: Farmer) => {
    if (!item.farmer_id) {
      console.log('[RECORD MILK] Farmer ID missing');
      return;
    }

    console.log('[SUPER ADMIN] Navigating to Record Daily Procurement for Farmer:', {
      farmer_id: item.farmer_id,
      farmer_name: item.farmer_name,
      admin_id: item.admin_id ?? adminId,
    });

    router.push({
      pathname: '/sub_amin/daily_procurement' as any,
      params: {
        farmer_id: String(item.farmer_id),
        admin_id: String(item.admin_id ?? adminId ?? ''),
        farmer_name: item.farmer_name || '',
        code: item.code || '',
        mobile_number: item.mobile_number || '',
        aadhar_number: item.aadhar_number || '',
        address: item.address || '',
        status: String(item.status ?? '1'),
        profile: item.profile || '',
        created_at: item.created_at || '',
        open_record: 'true',
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddFarmer = () => {
    /**
     * Change this route if your actual create farmer
     * file is located somewhere else.
     */
    router.push({
      pathname: '/sub_amin/create_farmer' as any,
      params: {
        admin_id: String(adminId ?? ''),
      },
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>
          My Farmers
        </Text>

        <Text style={styles.headerSubtitle}>
          Farmer Management
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addFarmerButton}
        activeOpacity={0.85}
        onPress={handleAddFarmer}
      >
        <Ionicons
          name="add"
          size={19}
          color="#FFFFFF"
        />

        <Text style={styles.addFarmerText}>
          Add Farmer
        </Text>
      </TouchableOpacity>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {farmers.length}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({
    item,
  }: {
    item: Farmer;
  }) => {
    const isActive =
      String(item.status ?? '') === '1';

    return (
      <View
        style={[
          styles.card,
          {
            width:
              width < 600
                ? width - 36
                : Math.min(390, width - 60),
          },
        ]}
      >
        <View style={styles.profileSection}>
          {item.profile?.trim() && !failedFarmerImages[item.farmer_id] ? (
            <Image
              source={{
                uri: item.profile,
              }}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => {
                setFailedFarmerImages((prev) => ({ ...prev, [item.farmer_id]: true }));
              }}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons
                name="person"
                size={48}
                color="#777777"
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
              {isActive
                ? 'Active'
                : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text
          style={styles.cardName}
          numberOfLines={1}
        >
          {item.farmer_name || 'Farmer'}
        </Text>

        <View style={styles.codeContainer}>
          <Ionicons
            name="qr-code-outline"
            size={14}
            color="#4CAF50"
          />

          <Text style={styles.codeText}>
            Farmer Code: {item.code || '-'}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="call-outline"
                size={16}
                color="#4CAF50"
              />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>
                Mobile Number
              </Text>

              <Text style={styles.rowText}>
                {item.mobile_number || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="card-outline"
                size={16}
                color="#4CAF50"
              />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>
                Aadhaar Number
              </Text>

              <Text style={styles.rowText}>
                {item.aadhar_number || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="location-outline"
                size={16}
                color="#4CAF50"
              />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>
                Address
              </Text>

              <Text
                style={styles.rowText}
                numberOfLines={2}
              >
                {item.address || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="#999999"
              />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>
                Added On
              </Text>

              <Text style={styles.dateText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.recordMilkButton}
            activeOpacity={0.85}
            onPress={() => handleRecordMilk(item)}
          >
            <MaterialCommunityIcons
              name="water-plus"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.recordMilkText}>
              Record Milk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewMoreButton}
            activeOpacity={0.85}
            onPress={() => handleView(item)}
          >
            <Text style={styles.viewMoreText}>
              View More
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && farmers.length === 0) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#161616"
        />

        {renderHeader()}

        <FarmerCardSkeleton count={5} />
      </SafeAreaView>
    );
  }

  if (error && farmers.length === 0) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#161616"
        />

        {renderHeader()}

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color="#F44336"
            />
          </View>

          <Text style={styles.errorTitle}>
            Unable to load farmers
          </Text>

          <Text style={styles.errorText}>
            {errorMessage ||
              'Something went wrong while retrieving the farmer list.'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchFarmersByAdmin(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#161616"
      />

      {renderHeader()}

      <FlatList
        data={farmers}
        keyExtractor={(item, index) =>
          String(
            item.farmer_id ?? index,
          )
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal:
              width < 600 ? 18 : 30,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              Farmers
            </Text>

            <Text style={styles.sectionSubtitle}>
              Farmers assigned to this admin
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={38}
                color="#999999"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Farmers Found
            </Text>

            <Text style={styles.emptyText}>
              No farmers are currently assigned
              to this admin.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },

  header: {
    minHeight: 70,
    backgroundColor: '#161616',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#292929',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 35,
    height: 35,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  addFarmerButton: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    gap: 4,
  },

  addFarmerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: {
    paddingTop: 5,
    paddingBottom: 30,
  },

  listHeader: {
    paddingTop: 14,
    paddingBottom: 12,
  },

  sectionTitle: {
    color: '#161616',
    fontSize: 17,
    fontWeight: '700',
  },

  sectionSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 3,
  },

  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  profileSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 13,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EDEDED',
    borderWidth: 3,
    borderColor: '#F0F0F0',
  },

  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEEEEE',
    borderWidth: 3,
    borderColor: '#D8D8D8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusBadge: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    color: '#333333',
  },

  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161616',
    textAlign: 'center',
    marginTop: 4,
  },

  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    gap: 5,
  },

  codeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },

  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
    marginTop: 14,
    marginBottom: 15,
  },

  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1F8F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  rowContent: {
    flex: 1,
  },

  rowLabel: {
    fontSize: 9,
    color: '#999999',
    marginBottom: 2,
  },

  rowText: {
    fontSize: 12,
    color: '#444444',
    fontWeight: '500',
  },

  dateText: {
    fontSize: 11,
    color: '#999999',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },

  recordMilkButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1F5E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1F5E4A',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  recordMilkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  viewMoreButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  viewMoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#777777',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBE9E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  errorTitle: {
    color: '#161616',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorText: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 20,
    lineHeight: 19,
  },

  retryButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#EDEDED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyText: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});