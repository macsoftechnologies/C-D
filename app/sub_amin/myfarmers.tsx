import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  TextInput,
  Linking,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getFarmersByAdmin,
  getAllFarmers,
  getAllSubadmins,
  getSubadminById,
  Farmer,
  SubadminItem,
} from '@/src/services/dairyApi';
import { getUserSession } from '@/src/authStorage';
import { FarmerCardSkeleton } from '@/components/Shimmer';

const formatDate = (raw?: string) => {
  if (!raw) return '-';
  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function SubAdminMyFarmers() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ admin_id?: string }>();

  const [adminId, setAdminId] = useState<string>(params.admin_id || '');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [subadmins, setSubadmins] = useState<SubadminItem[]>([]);
  const [subadminTotals, setSubadminTotals] = useState<SubadminItem | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(false);
  const [selectedBoothId, setSelectedBoothId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedFarmerImages, setFailedFarmerImages] = useState<Record<string, boolean>>({});

  const lastFetchTimeRef = React.useRef(0);
  const isFetchingRef = React.useRef(false);

  // Resolve adminId on mount if not in params
  useEffect(() => {
    let isMounted = true;
    async function resolveAdmin() {
      if (!adminId) {
        const session = await getUserSession();
        if (isMounted && session?.admin_id) {
          setAdminId(session.admin_id);
        }
      }
    }
    resolveAdmin();
    return () => {
      isMounted = false;
    };
  }, [adminId]);

  const fetchFarmers = useCallback(
    async (forceRefresh = false) => {
      if (isFetchingRef.current) return;

      const now = Date.now();
      // Skip redundant refetch on rapid focus if data exists and is fresh within 45s
      if (!forceRefresh && farmers.length > 0 && now - lastFetchTimeRef.current < 45000) {
        setLoading(false);
        return;
      }

      try {
        isFetchingRef.current = true;
        setError(false);
        setErrorMessage('');

        const targetAdminId = adminId || (await getUserSession())?.admin_id;

        if (targetAdminId) {
          setTotalsLoading(true);
          // Priority 1: Fast direct fetch for this Sub-Admin's farmers (~200ms) and live API totals
          const directPromise = getFarmersByAdmin(targetAdminId, forceRefresh);
          const subadminsPromise = getAllSubadmins(forceRefresh);
          const totalsPromise = getSubadminById(targetAdminId, forceRefresh);

          const [directFarmers, boothList, totalsData] = await Promise.all([
            directPromise,
            subadminsPromise,
            totalsPromise,
          ]);
          setFarmers(directFarmers);
          setSubadmins(boothList);
          if (totalsData) setSubadminTotals(totalsData);
          setTotalsLoading(false);
          setLoading(false);
          lastFetchTimeRef.current = Date.now();

          // Priority 2: In the background, load complete list if there are multiple booths for filtering
          if (boothList.length > 1) {
            getAllFarmers(forceRefresh)
              .then((allData) => {
                if (allData.length > 0) {
                  setFarmers(allData);
                }
              })
              .catch(() => { });
          }
        } else {
          // General mode without adminId: load all concurrently
          const [farmerData, boothList] = await Promise.all([
            getAllFarmers(forceRefresh),
            getAllSubadmins(forceRefresh),
          ]);

          setFarmers(farmerData);
          setSubadmins(boothList);
          lastFetchTimeRef.current = Date.now();
        }
      } catch (err: any) {
        console.log('Error fetching sub-admin farmers:', err);
        if (adminId) {
          try {
            const fallback = await getFarmersByAdmin(adminId, forceRefresh);
            setFarmers(fallback);
          } catch {
            if (farmers.length === 0) {
              setError(true);
              setErrorMessage(
                err?.response?.data?.message ||
                'Unable to retrieve farmers. Please check your network.'
              );
            }
          }
        } else if (farmers.length === 0) {
          setError(true);
          setErrorMessage(
            err?.response?.data?.message ||
            'Unable to retrieve farmers. Please check your network.'
          );
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [adminId, farmers.length]
  );

  useFocusEffect(
    useCallback(() => {
      fetchFarmers(false);
    }, [fetchFarmers])
  );

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchFarmers(true);
    setRefreshing(false);
  };

  const handleCall = (mobile?: string) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // Map farmer totals from subadmin API response (/subadminbyid)
  const farmerTotalsMap = useMemo(() => {
    const map = new Map<string, { total_liters: number; total_amount: number; total_procurements: number }>();
    if (Array.isArray(subadminTotals?.farmers)) {
      for (const f of subadminTotals.farmers) {
        if (f.farmer_id) {
          map.set(String(f.farmer_id), {
            total_liters: typeof f.total_liters === 'number' ? f.total_liters : parseFloat(f.total_liters) || 0,
            total_amount: typeof f.total_amount === 'number' ? f.total_amount : parseFloat(f.total_amount) || 0,
            total_procurements: typeof f.total_procurements === 'number' ? f.total_procurements : parseInt(f.total_procurements, 10) || 0,
          });
        }
      }
    }
    return map;
  }, [subadminTotals]);

  const handleView = (item: Farmer) => {
    if (!item.farmer_id) return;
    const fTotals = farmerTotalsMap.get(String(item.farmer_id));
    router.push({
      pathname: '/sub_amin/farmer_overview',
      params: {
        farmer_id: String(item.farmer_id),
        admin_id: String(item.admin_id || adminId),
        farmer_name: item.farmer_name || '',
        code: item.code || '',
        mobile_number: item.mobile_number || '',
        aadhar_number: item.aadhar_number || '',
        address: item.address || '',
        status: String(item.status ?? '1'),
        profile: item.profile || '',
        created_at: item.created_at || '',
        total_liters: fTotals?.total_liters !== undefined ? String(fTotals.total_liters) : undefined,
        total_amount: fTotals?.total_amount !== undefined ? String(fTotals.total_amount) : undefined,
        total_procurements: fTotals?.total_procurements !== undefined ? String(fTotals.total_procurements) : undefined,
      },
    });
  };

  const handleRecordMilk = (item: Farmer) => {
    if (!item.farmer_id) return;
    console.log('[SUB ADMIN] Navigating to Record Daily Procurement for Farmer:', {
      farmer_id: item.farmer_id,
      farmer_name: item.farmer_name,
      admin_id: item.admin_id || adminId,
    });
    router.push({
      pathname: '/sub_amin/daily_procurement' as any,
      params: {
        farmer_id: String(item.farmer_id),
        admin_id: String(item.admin_id || adminId || ''),
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

  const handleAddFarmer = () => {
    router.push({
      pathname: '/sub_amin/create_farmer',
      params: { admin_id: adminId },
    });
  };

  const filteredFarmers = useMemo(() => {
    let list = farmers;
    if (selectedBoothId !== 'all') {
      list = list.filter((f) => String(f.admin_id) === String(selectedBoothId));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.farmer_name?.toLowerCase().includes(q) ||
        f.code?.toLowerCase().includes(q) ||
        f.mobile_number?.includes(q) ||
        f.address?.toLowerCase().includes(q) ||
        f.booth_name?.toLowerCase().includes(q)
    );
  }, [farmers, selectedBoothId, searchQuery]);

  const boothCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    farmers.forEach((f) => {
      const id = String(f.admin_id || '');
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [farmers]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>My Farmers</Text>
        <Text style={styles.headerSubtitle}>Farmer Management</Text>
      </View>

      <TouchableOpacity
        style={styles.addFarmerButton}
        activeOpacity={0.85}
        onPress={handleAddFarmer}
      >
        <Ionicons name="add" size={19} color="#FFFFFF" />
        <Text style={styles.addFarmerText}>Add Farmer</Text>
      </TouchableOpacity>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{farmers.length}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Farmer }) => {
    const isActive = String(item.status ?? '') === '1';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            width: width < 600 ? width - 36 : Math.min(390, width - 60),
          },
        ]}
        activeOpacity={0.92}
        onPress={() => handleView(item)}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {item.profile?.trim() && !failedFarmerImages[item.farmer_id] ? (
            <Image
              source={{ uri: item.profile }}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => {
                setFailedFarmerImages((prev) => ({ ...prev, [item.farmer_id]: true }));
              }}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color="#777777" />
            </View>
          )}

          <View style={styles.badgeColumn}>
            <View
              style={[
                styles.statusBadge,
                isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? '#4CAF50' : '#F44336' },
                ]}
              />
              <Text style={styles.statusText}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            {item.booth_name ? (
              <View style={styles.boothBadge}>
                <Ionicons name="business-outline" size={11} color="#1F5E4A" />
                <Text style={styles.boothBadgeText} numberOfLines={1}>
                  {item.booth_name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.cardName} numberOfLines={1}>
          {item.farmer_name || 'Farmer'}
        </Text>

        <View style={styles.codeContainer}>
          <Ionicons name="qr-code-outline" size={14} color="#4CAF50" />
          <Text style={styles.codeText}>Farmer Code: {item.code || '-'}</Text>
        </View>

        {/* Details Container */}
        <View style={styles.detailsContainer}>
          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons name="call-outline" size={16} color="#4CAF50" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Mobile Number</Text>
              <Text style={styles.rowText}>{item.mobile_number || '-'}</Text>
            </View>
            {item.mobile_number ? (
              <TouchableOpacity
                onPress={() => handleCall(item.mobile_number)}
                style={styles.quickCallBtn}
              >
                <Ionicons name="call" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons name="card-outline" size={16} color="#4CAF50" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Aadhaar Number</Text>
              <Text style={styles.rowText}>{item.aadhar_number || '-'}</Text>
            </View>
          </View>

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons name="location-outline" size={16} color="#4CAF50" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Address</Text>
              <Text style={styles.rowText} numberOfLines={2}>
                {item.address || '-'}
              </Text>
            </View>
          </View>

          {item.booth_name ? (
            <View style={styles.rowLine}>
              <View style={styles.iconBox}>
                <Ionicons name="business-outline" size={16} color="#4CAF50" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Booth / Center</Text>
                <Text style={styles.rowText}>{item.booth_name}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.rowLine}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar-outline" size={16} color="#999999" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Added On</Text>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Live Procurement Totals snippet from API */}
        {farmerTotalsMap.has(String(item.farmer_id)) ? (
          <View style={styles.cardTotalsRow}>
            <View style={styles.cardTotalItem}>
              <Text style={styles.cardTotalLabel}>Total Milk</Text>
              <Text style={styles.cardTotalVal}>
                {farmerTotalsMap.get(String(item.farmer_id))!.total_liters.toFixed(1)} L
              </Text>
            </View>
            <View style={styles.cardTotalItem}>
              <Text style={styles.cardTotalLabel}>Total Paid</Text>
              <Text style={[styles.cardTotalVal, { color: '#2E7D32' }]}>
                ₹{farmerTotalsMap.get(String(item.farmer_id))!.total_amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.cardTotalItem}>
              <Text style={styles.cardTotalLabel}>Entries</Text>
              <Text style={styles.cardTotalVal}>
                {farmerTotalsMap.get(String(item.farmer_id))!.total_procurements}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Actions Row: Record Milk & View More */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.recordMilkButton}
            activeOpacity={0.85}
            onPress={() => handleRecordMilk(item)}
          >
            <MaterialCommunityIcons name="water-plus" size={18} color="#FFFFFF" />
            <Text style={styles.recordMilkText}>Record Milk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewMoreButton}
            activeOpacity={0.85}
            onPress={() => handleView(item)}
          >
            <Text style={styles.viewMoreText}>View More</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#161616" />
      {renderHeader()}

      {/* Sub-Admin Live Collection & Revenue Totals Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryHeaderRow}>
          <View style={styles.summaryTitleWithIcon}>
            <MaterialCommunityIcons name="chart-box-outline" size={16} color="#4CAF50" />
            <Text style={styles.summaryBarTitle}>Collection & Revenue Totals</Text>
          </View>
          {totalsLoading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.summaryLiveBadge}>LIVE API</Text>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryItemLabel}>Total Milk</Text>
            <Text style={styles.summaryItemValue}>
              {subadminTotals?.total_liters !== undefined
                ? `${Number(subadminTotals.total_liters).toFixed(1)} L`
                : '0.0 L'}
            </Text>
          </View>

          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryItemLabel}>Total Paid</Text>
            <Text style={[styles.summaryItemValue, { color: '#2E7D32' }]}>
              ₹{subadminTotals?.total_amount !== undefined
                ? Number(subadminTotals.total_amount).toFixed(2)
                : '0.00'}
            </Text>
          </View>

          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryItemLabel}>Collections</Text>
            <Text style={styles.summaryItemValue}>
              {subadminTotals?.total_procurements ?? 0}
            </Text>
          </View>

          <View style={styles.summaryGridItem}>
            <Text style={styles.summaryItemLabel}>Today's Milk</Text>
            <Text style={[styles.summaryItemValue, { color: '#4CAF50' }]}>
              {subadminTotals?.today_liters !== undefined
                ? `${Number(subadminTotals.today_liters).toFixed(1)} L`
                : '0.0 L'}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, code, phone, booth..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Booth Filters (Horizontal Scroll) */}
      {!loading && subadmins.length > 0 && (
        <View style={styles.boothFilterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.boothFilterContent}
          >
            <TouchableOpacity
              style={[
                styles.boothChip,
                selectedBoothId === 'all' && styles.boothChipActive,
              ]}
              onPress={() => setSelectedBoothId('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.boothChipText,
                  selectedBoothId === 'all' && styles.boothChipTextActive,
                ]}
              >
                All Booths ({farmers.length})
              </Text>
            </TouchableOpacity>

            {subadmins.map((sub) => {
              const count = boothCounts[String(sub.admin_id)] || 0;
              const isSelected = String(selectedBoothId) === String(sub.admin_id);
              const label = sub.admin_name || `Booth #${sub.admin_id}`;
              return (
                <TouchableOpacity
                  key={String(sub.admin_id)}
                  style={[
                    styles.boothChip,
                    isSelected && styles.boothChipActive,
                  ]}
                  onPress={() => setSelectedBoothId(String(sub.admin_id))}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.boothChipText,
                      isSelected && styles.boothChipTextActive,
                    ]}
                  >
                    {label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading && farmers.length === 0 ? (
        <FarmerCardSkeleton count={5} />
      ) : error && farmers.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={42} color="#F44336" />
          <Text style={styles.errorTitle}>Failed to load farmers</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchFarmers(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFarmers}
          keyExtractor={(item) => String(item.farmer_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#888" />
              <Text style={styles.emptyTitle}>No Farmers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No farmers match your search criteria.'
                  : 'No farmers are assigned to this account yet.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleAddFarmer}
              >
                <Text style={styles.emptyAddBtnText}>+ Add First Farmer</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
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
    marginLeft: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  addFarmerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addFarmerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#161616',
  },
  listContent: {
    padding: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333333',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#161616',
    marginBottom: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  detailsContainer: {
    backgroundColor: '#F9FBF8',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: '#777777',
    fontWeight: '600',
  },
  rowText: {
    fontSize: 13.5,
    color: '#222222',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '600',
  },
  quickCallBtn: {
    backgroundColor: '#2E7D32',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  recordMilkButton: {
    flex: 1,
    backgroundColor: '#1F5E4A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#1F5E4A',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  recordMilkText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  viewMoreButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  viewMoreText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  errorText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#1F5E4A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  emptyAddBtn: {
    backgroundColor: '#1F5E4A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyAddBtnText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  boothBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: 160,
  },
  boothBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F5E4A',
  },
  boothFilterWrapper: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  boothFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  boothChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  boothChipActive: {
    backgroundColor: '#1F5E4A',
    borderColor: '#1F5E4A',
  },
  boothChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#666666',
  },
  boothChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBar: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E6DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 0.8,
    borderBottomColor: '#EEF0EC',
  },
  summaryTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161616',
  },
  summaryLiveBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: '#6B6B60',
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#161616',
  },
  cardTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6F2',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 10,
    justifyContent: 'space-around',
    borderWidth: 0.6,
    borderColor: '#E2E8DE',
  },
  cardTotalItem: {
    alignItems: 'center',
  },
  cardTotalLabel: {
    fontSize: 10,
    color: '#6B6B60',
    fontWeight: '500',
  },
  cardTotalVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161616',
    marginTop: 1,
  },
});
