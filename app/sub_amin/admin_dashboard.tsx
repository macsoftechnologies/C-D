import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getUserSession,
  clearUserSession,
  StoredUserData,
} from '@/src/authStorage';
import { getFarmersByAdmin, getAnimalsByFarmerId, batchAllSettled } from '@/src/services/dairyApi';
import { FarmerCardSkeleton } from '@/components/Shimmer';

const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  brandDark: '#161616',
  brandGreen: '#4CAF50',
  brandGreenLight: '#E8F5E9',
  brandGreenBorder: '#C8E6C9',
  amber: '#B8791E',
  amberLight: '#FFF8E1',
  amberBorder: '#FFE082',
  headline: '#161616',
  subtitle: '#6B6B60',
  textDark: '#161616',
  textMuted: '#8A8A80',
  border: '#E2E6DF',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  blue: '#1976D2',
  blueLight: '#E3F2FD',
};

export interface Farmer {
  farmer_id: string;
  farmer_name: string;
  mobile_number: string;
  profile: string;
  aadhar_number: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_id: string;
  code: string;
}

export interface DashboardAnimal {
  animal_id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_code: string;
  animal_type: string;
  vaccination_proof: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_id?: string;
  breed?: string;
  age?: string;
}

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

export default function SubAdminDashboard() {
  const [session, setSession] = useState<StoredUserData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Active Tab: 'farmers' | 'animals'
  const [activeTab, setActiveTab] = useState<'farmers' | 'animals'>('farmers');

  // Farmers State
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState('');

  // Animals State (Real API Data)
  const [animalsList, setAnimalsList] = useState<DashboardAnimal[]>([]);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [animalSearch, setAnimalSearch] = useState('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState<'ALL' | 'Cow' | 'Buffalo'>('ALL');
  const [selectedAnimal, setSelectedAnimal] = useState<DashboardAnimal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Verify Sub-Admin Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const stored = await getUserSession();
        if (!isMounted) return;

        if (!stored || stored.role !== 'sub_admin') {
          Alert.alert(
            'Session Expired',
            'Please log in with a Sub-Admin account to access this dashboard.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/registration/login'),
              },
            ]
          );
          return;
        }

        setSession(stored);
      } catch (err) {
        console.log('Auth check error:', err);
        router.replace('/registration/login');
      } finally {
        if (isMounted) setSessionLoading(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Farmers for the logged-in Sub-Admin (fast & cached, does not block on animals)
  const fetchFarmers = useCallback(async (currentSession: StoredUserData, force = false) => {
    if (!currentSession?.admin_id) return;

    try {
      setFarmersLoading(true);
      const farmerData = await getFarmersByAdmin(currentSession.admin_id, force);
      setFarmers(farmerData);
    } catch (err) {
      console.log('Error fetching sub-admin farmers:', err);
      setFarmers([]);
    } finally {
      setFarmersLoading(false);
    }
  }, []);

  // 3. Lazy background loader for animals (non-blocking with batching)
  const fetchAnimalsLazily = useCallback(async (farmerList: Farmer[], force = false) => {
    if (!farmerList.length) return;
    try {
      setAnimalsLoading(true);
      const settled = await batchAllSettled(
        farmerList,
        async (f) => {
          const res = await getAnimalsByFarmerId(f.farmer_id, force);
          return res.map((a) => ({
            ...a,
            farmer_name: f.farmer_name || 'Farmer',
            farmer_code: f.code || `F-${f.farmer_id}`,
          }));
        },
        6
      );

      const allAnimals: DashboardAnimal[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allAnimals.push(...r.value);
        }
      }
      setAnimalsList(allAnimals);
    } catch (err) {
      console.log('Error fetching dashboard animals:', err);
    } finally {
      setAnimalsLoading(false);
    }
  }, []);

  // Auto-refresh farmers on focus without redundant heavy animal calls
  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchFarmers(session, false);
      }
    }, [session, fetchFarmers])
  );

  const animalsLoadedRef = React.useRef(false);

  // Lazily load animals only when Animals tab is opened or explicitly refreshed
  useEffect(() => {
    if (farmers.length > 0 && activeTab === 'animals' && !animalsLoadedRef.current) {
      animalsLoadedRef.current = true;
      fetchAnimalsLazily(farmers, false);
    }
  }, [farmers, activeTab, fetchAnimalsLazily]);

  // Pull to refresh handler
  const handleRefresh = async () => {
    if (!session) return;
    setRefreshing(true);
    animalsLoadedRef.current = false;
    await fetchFarmers(session, true);
    if (activeTab === 'animals' && farmers.length > 0) {
      await fetchAnimalsLazily(farmers, true);
    }
    setRefreshing(false);
  };

  // Logout action
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the Sub-Admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearUserSession();
          router.replace('/registration/login');
        },
      },
    ]);
  };

  // Filtered Farmers
  const filteredFarmers = useMemo(() => {
    const q = farmerSearch.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter(
      (f) =>
        f.farmer_name?.toLowerCase().includes(q) ||
        f.code?.toLowerCase().includes(q) ||
        f.mobile_number?.includes(q) ||
        f.address?.toLowerCase().includes(q)
    );
  }, [farmers, farmerSearch]);

  // Filtered Animals (Real Animals from API)
  const filteredAnimals = useMemo(() => {
    return animalsList.filter((a) => {
      const isCow = a.animal_type?.toLowerCase().includes('cow');
      const matchesType =
        animalTypeFilter === 'ALL' ||
        (animalTypeFilter === 'Cow' && isCow) ||
        (animalTypeFilter === 'Buffalo' && !isCow);
      const q = animalSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        a.animal_id.includes(q) ||
        a.farmer_id.includes(q) ||
        a.farmer_name.toLowerCase().includes(q) ||
        a.farmer_code.toLowerCase().includes(q) ||
        a.animal_type.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [animalsList, animalTypeFilter, animalSearch]);

  // Metric counts based on real animals
  const totalCows = useMemo(
    () => animalsList.filter((a) => a.animal_type?.toLowerCase().includes('cow')).length,
    [animalsList]
  );
  const totalBuffaloes = useMemo(
    () => animalsList.filter((a) => a.animal_type?.toLowerCase().includes('buffalo')).length,
    [animalsList]
  );

  // Quick Call farmer
  const handleCall = (mobile: string) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // View Farmer Profile - passes all available data to eliminate loading latency on overview
  const handleViewFarmer = (farmer: Farmer) => {
    router.push({
      pathname: '/sub_amin/farmer_overview',
      params: {
        farmer_id: String(farmer.farmer_id),
        admin_id: String(farmer.admin_id || session?.admin_id || ''),
        farmer_name: farmer.farmer_name || '',
        code: farmer.code || '',
        mobile_number: farmer.mobile_number || '',
        aadhar_number: farmer.aadhar_number || '',
        address: farmer.address || '',
        status: String(farmer.status ?? '1'),
        profile: farmer.profile || '',
        created_at: farmer.created_at || '',
      },
    });
  };

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.loadingScreenText}>Loading Sub-Admin Portal...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>SUB-ADMIN</Text>
            </View>
            <Text style={styles.adminIdText}>ID: #{session?.admin_id || '-'}</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session?.admin_name || 'Sub-Administrator'}
          </Text>
          <Text style={styles.headerSubtitle}>Canaan Dairy Portal</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Highlights Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="people" size={18} color="#2E7D32" />
          </View>
          <Text style={styles.metricValue}>{farmers.length}</Text>
          <Text style={styles.metricLabel}>Farmers</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#FFF8E1' }]}>
            <MaterialCommunityIcons name="cow" size={20} color="#B8791E" />
          </View>
          <Text style={styles.metricValue}>{animalsList.length}</Text>
          <Text style={styles.metricLabel}>Total Animals</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="water" size={18} color="#1976D2" />
          </View>
          <Text style={styles.metricValue}>{totalCows}C / {totalBuffaloes}B</Text>
          <Text style={styles.metricLabel}>Cow / Buffalo</Text>
        </View>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'farmers' && styles.tabButtonActive]}
          activeOpacity={0.85}
          onPress={() => setActiveTab('farmers')}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={activeTab === 'farmers' ? '#FFFFFF' : COLORS.subtitle}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'farmers' && styles.tabTextActive,
            ]}
          >
            Farmers ({farmers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'animals' && styles.tabButtonActive]}
          activeOpacity={0.85}
          onPress={() => setActiveTab('animals')}
        >
          <MaterialCommunityIcons
            name="cow"
            size={18}
            color={activeTab === 'animals' ? '#FFFFFF' : COLORS.subtitle}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'animals' && styles.tabTextActive,
            ]}
          >
            Animal Overview ({animalsList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      {activeTab === 'farmers' ? (
        /* ================= FARMERS TAB ================= */
        <View style={styles.contentWrap}>
          {/* Farmers Action Bar */}
          <View style={styles.farmersActionBar}>
            <View>
              <Text style={styles.farmersActionTitle}>Assigned Farmers</Text>
              <Text style={styles.farmersActionSubtitle}>{farmers.length} registered</Text>
            </View>

            <View style={styles.headerActionBtnsRow}>
              <TouchableOpacity
                style={styles.myFarmersNavBtn}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/sub_amin/myfarmers' as any,
                    params: { admin_id: session?.admin_id },
                  })
                }
              >
                <Ionicons name="people" size={15} color="#FFFFFF" />
                <Text style={styles.myFarmersNavBtnText}>My Farmers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dailyProcurementNavBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/sub_amin/daily_procurement' as any)}
              >
                <MaterialCommunityIcons name="water" size={16} color="#FFFFFF" />
                <Text style={styles.dailyProcurementNavBtnText}>Daily Milk</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addFarmerButton}
                activeOpacity={0.85}
                onPress={() => router.push('/sub_amin/create_farmer')}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={styles.addFarmerButtonText}>Add Farmer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search farmer name, code, phone..."
              placeholderTextColor={COLORS.textMuted}
              value={farmerSearch}
              onChangeText={setFarmerSearch}
            />
            {farmerSearch ? (
              <TouchableOpacity onPress={() => setFarmerSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {farmersLoading && farmers.length === 0 ? (
            <FarmerCardSkeleton count={4} />
          ) : (
            <FlatList
              data={filteredFarmers}
              keyExtractor={(item) => String(item.farmer_id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.brandGreen]}
                />
              }
              renderItem={({ item, index }) => {
                const isActive = item.status === '1';
                // Real animals count for this farmer
                const farmerAnimalsCount = animalsList.filter(
                  (a) => String(a.farmer_id) === String(item.farmer_id)
                ).length;

                return (
                  <TouchableOpacity
                    style={styles.farmerCard}
                    activeOpacity={0.92}
                    onPress={() => handleViewFarmer(item)}
                  >
                    <View style={styles.farmerTopRow}>
                      <View style={styles.codeBadge}>
                        <Ionicons name="qr-code-outline" size={12} color={COLORS.brandGreen} />
                        <Text style={styles.codeBadgeText}>{item.code || `F-${index + 1}`}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          isActive ? styles.statusPillActive : styles.statusPillInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: isActive ? '#4CAF50' : '#E53935' },
                          ]}
                        />
                        <Text style={styles.statusPillText}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Identity row with Profile Avatar */}
                    <View style={styles.farmerIdentityRow}>
                      {item.profile?.trim() ? (
                        <Image
                          source={{ uri: item.profile }}
                          style={styles.farmerAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.farmerAvatarFallback}>
                          <Ionicons name="person" size={24} color={COLORS.brandGreen} />
                        </View>
                      )}
                      <View style={styles.farmerNameWrap}>
                        <Text style={styles.farmerName} numberOfLines={1}>
                          {item.farmer_name || 'Farmer'}
                        </Text>
                        <Text style={styles.farmerSubtitle}>
                          Farmer ID: #{item.farmer_id}
                        </Text>
                      </View>
                    </View>

                    {/* Details row */}
                    <View style={styles.farmerInfoGrid}>
                      <View style={styles.farmerInfoRow}>
                        <Ionicons name="call-outline" size={14} color={COLORS.brandGreen} />
                        <Text style={styles.farmerInfoText}>{item.mobile_number || '-'}</Text>
                      </View>

                      <View style={styles.farmerInfoRow}>
                        <Ionicons name="card-outline" size={14} color={COLORS.brandGreen} />
                        <Text style={styles.farmerInfoText}>Aadhaar: {item.aadhar_number || '-'}</Text>
                      </View>

                      <View style={styles.farmerInfoRow}>
                        <Ionicons name="location-outline" size={14} color={COLORS.brandGreen} />
                        <Text style={styles.farmerInfoText} numberOfLines={1}>
                          {item.address || 'Local Village'}
                        </Text>
                      </View>

                      <View style={styles.farmerInfoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#8A8A80" />
                        <Text style={[styles.farmerInfoText, { color: '#8A8A80' }]}>
                          Added: {formatDate(item.created_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Footer Row */}
                    <View style={styles.farmerCardFooter}>
                      <View style={styles.livestockTag}>
                        <MaterialCommunityIcons name="cow" size={15} color={COLORS.amber} />
                        <Text style={styles.livestockTagText}>
                          {farmerAnimalsCount} Cattle Registered
                        </Text>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.callIconBtn}
                          onPress={() => handleCall(item.mobile_number)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={15} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.farmerProcurementBtn}
                          onPress={() =>
                            router.push({
                              pathname: '/sub_amin/daily_procurement' as any,
                              params: { farmer_id: item.farmer_id },
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="water" size={14} color="#FFFFFF" />
                          <Text style={styles.farmerProcurementBtnText}>Milk</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.detailsBtn}
                          onPress={() => handleViewFarmer(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.detailsBtnText}>Overview</Text>
                          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={42} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No Farmers Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {farmerSearch
                      ? 'No farmers matching your search.'
                      : 'No farmers are currently assigned to your Sub-Admin account.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        /* ================= ANIMAL OVERVIEW / DETAILS TAB ================= */
        <View style={styles.contentWrap}>
          {/* Animal Type Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['ALL', 'Cow', 'Buffalo'] as const).map((type) => {
              const isSelected = animalTypeFilter === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  onPress={() => setAnimalTypeFilter(type)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextSelected,
                    ]}
                  >
                    {type === 'ALL' ? 'All Livestock' : `${type}s`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Tag ID, farmer, or breed..."
              placeholderTextColor={COLORS.textMuted}
              value={animalSearch}
              onChangeText={setAnimalSearch}
            />
            {animalSearch ? (
              <TouchableOpacity onPress={() => setAnimalSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {animalsLoading && animalsList.length === 0 ? (
            <FarmerCardSkeleton count={4} />
          ) : (
            <FlatList
              data={filteredAnimals}
              keyExtractor={(item) => String(item.animal_id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isCow = item.animal_type?.toLowerCase().includes('cow');

              return (
                <TouchableOpacity
                  style={styles.animalCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedAnimal(item);
                    setModalVisible(true);
                  }}
                >
                  {/* Top Bar */}
                  <View style={styles.animalTopBar}>
                    <View style={styles.tagBadge}>
                      <MaterialCommunityIcons
                        name="tag-outline"
                        size={14}
                        color={COLORS.brandGreen}
                      />
                      <Text style={styles.tagBadgeText}>ID: #{item.animal_id}</Text>
                    </View>

                    <View
                      style={[
                        styles.animalTypeBadge,
                        isCow ? styles.cowBadge : styles.buffaloBadge,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="cow"
                        size={14}
                        color={isCow ? '#1F5E4A' : '#455A64'}
                      />
                      <Text
                        style={[
                          styles.animalTypeText,
                          { color: isCow ? '#1F5E4A' : '#455A64' },
                        ]}
                      >
                        {item.animal_type}
                      </Text>
                    </View>
                  </View>

                  {/* Animal Info */}
                  <View style={styles.animalMainRow}>
                    <View style={styles.animalInfoBlock}>
                      <Text style={styles.animalOwnerLabel}>Owner / Farmer</Text>
                      <Text style={styles.animalOwnerName} numberOfLines={1}>
                        {item.farmer_name} (ID: #{item.farmer_id})
                      </Text>
                    </View>

                    <View style={styles.yieldBlock}>
                      <Text style={styles.yieldValue}>{item.status === '1' ? 'Active' : 'Inactive'}</Text>
                      <Text style={styles.yieldLabel}>Status</Text>
                    </View>
                  </View>

                  {/* Badges / Metrics Row */}
                  <View style={styles.animalMetaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#2E7D32" />
                      <Text style={styles.metaChipText}>
                        {item.vaccination_proof ? 'Vaccinated' : 'No Proof'}
                      </Text>
                    </View>

                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.amber} />
                      <Text style={styles.metaChipText}>{item.created_at ? item.created_at.split(' ')[0] : 'Registered'}</Text>
                    </View>

                    <View style={styles.viewAnimalDetailsAction}>
                      <Text style={styles.viewAnimalDetailsText}>Details</Text>
                      <Ionicons name="chevron-forward" size={12} color={COLORS.brandGreen} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="cow-off"
                  size={42}
                  color={COLORS.textMuted}
                />
                <Text style={styles.emptyTitle}>No Animals Found</Text>
                <Text style={styles.emptySubtitle}>
                  {animalSearch
                    ? 'No cattle matches your search criteria.'
                    : 'No livestock currently registered under your farmers.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
      )}

      {/* ================= ANIMAL DETAILS MODAL ================= */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>
                    Animal ID: #{selectedAnimal?.animal_id || 'Livestock Details'}
                  </Text>
                </View>
                <Text style={styles.modalTitle}>
                  {selectedAnimal?.animal_type}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.headline} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Farmer Info Section */}
              <Text style={styles.modalSectionTitle}>Owner Farmer Information</Text>
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Farmer Name</Text>
                  <Text style={styles.modalInfoValue}>{selectedAnimal?.farmer_name}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Farmer ID</Text>
                  <Text style={styles.modalInfoValue}>#{selectedAnimal?.farmer_id}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Farmer Code</Text>
                  <Text style={styles.modalInfoValue}>{selectedAnimal?.farmer_code}</Text>
                </View>
              </View>

              {/* Animal Info Section */}
              <Text style={styles.modalSectionTitle}>Livestock Details</Text>
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Animal ID</Text>
                  <Text style={styles.modalInfoValue}>#{selectedAnimal?.animal_id}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Animal Type</Text>
                  <Text style={styles.modalInfoValue}>{selectedAnimal?.animal_type}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Status</Text>
                  <Text style={[styles.modalInfoValue, { color: selectedAnimal?.status === '1' ? '#2E7D32' : COLORS.danger, fontWeight: '700' }]}>
                    {selectedAnimal?.status === '1' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Registered On</Text>
                  <Text style={styles.modalInfoValue}>{selectedAnimal?.created_at || '-'}</Text>
                </View>
              </View>

              {/* Action Button: View Farmer Profile */}
              <TouchableOpacity
                style={styles.modalFarmerOverviewBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setModalVisible(false);
                  if (selectedAnimal?.farmer_id) {
                    router.push({
                      pathname: '/sub_amin/farmer_overview' as any,
                      params: {
                        farmer_id: selectedAnimal.farmer_id,
                      },
                    });
                  }
                }}
              >
                <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalFarmerOverviewBtnText}>Go to Farmer Overview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDoneButton}
                activeOpacity={0.85}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalDoneButtonText}>Close Overview</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingScreenText: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Header */
  header: {
    backgroundColor: '#161616',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminIdText: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#AFAFAF',
    fontSize: 11.5,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* Metrics Highlights Bar */
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.headline,
  },
  metricLabel: {
    fontSize: 10.5,
    color: COLORS.subtitle,
    fontWeight: '600',
    marginTop: 1,
  },

  /* Tabs Switcher */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F3EE',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.brandGreen,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.subtitle,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  contentWrap: {
    flex: 1,
  },

  /* Farmers Action Bar */
  farmersActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  farmersActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.headline,
  },
  farmersActionSubtitle: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  addFarmerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    gap: 6,
    elevation: 2,
    shadowColor: COLORS.brandGreen,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  addFarmerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.headline,
  },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  tabLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLoadingText: {
    marginTop: 12,
    color: COLORS.subtitle,
    fontSize: 13,
  },

  /* Farmer Card */
  farmerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  farmerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusPillActive: {
    backgroundColor: '#E8F5E9',
  },
  statusPillInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333333',
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.headline,
    marginBottom: 8,
  },
  farmerInfoGrid: {
    gap: 5,
    marginBottom: 12,
  },
  farmerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  farmerInfoText: {
    fontSize: 12.5,
    color: '#4A4A45',
    flex: 1,
  },
  farmerCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F2EC',
    paddingTop: 10,
  },
  livestockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
  },
  livestockTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.amber,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Animal Overview / Details Tab */
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E7ECE4',
  },
  filterPillSelected: {
    backgroundColor: COLORS.brandGreen,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.subtitle,
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
  },

  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  animalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tagBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  animalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  cowBadge: {
    backgroundColor: '#E8F5E9',
  },
  buffaloBadge: {
    backgroundColor: '#ECEFF1',
  },
  animalTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  animalMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  animalInfoBlock: {
    flex: 1,
    marginRight: 10,
  },
  animalOwnerLabel: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  animalOwnerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.headline,
    marginTop: 1,
  },
  yieldBlock: {
    backgroundColor: '#F1F8F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  yieldValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  yieldLabel: {
    fontSize: 9.5,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  animalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F2EC',
    paddingTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  metaChipText: {
    fontSize: 10.5,
    color: '#424242',
    fontWeight: '600',
  },
  viewAnimalDetailsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAnimalDetailsText: {
    fontSize: 11,
    color: COLORS.brandGreen,
    fontWeight: '700',
  },

  /* Empty Component */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.headline,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.subtitle,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
    lineHeight: 18,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.headline,
    marginTop: 4,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBanner: {
    flexDirection: 'row',
    backgroundColor: '#F1F8F2',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  bannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 10.5,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  bannerVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandGreen,
    marginTop: 2,
  },
  bannerDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#C8E6C9',
    alignSelf: 'center',
  },
  modalSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.headline,
    marginBottom: 8,
    marginTop: 4,
  },
  modalInfoBox: {
    backgroundColor: '#F9FAF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 12,
    color: COLORS.subtitle,
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 13,
    color: COLORS.headline,
    fontWeight: '600',
  },
  modalDoneButton: {
    backgroundColor: '#F0F2EC',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  modalDoneButtonText: {
    color: COLORS.headline,
    fontSize: 14,
    fontWeight: '700',
  },
  modalFarmerOverviewBtn: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  modalFarmerOverviewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  headerActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyProcurementNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  dailyProcurementNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  farmerProcurementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 4,
  },
  farmerProcurementBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  myFarmersNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  myFarmersNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  farmerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  farmerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
  },
  farmerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerNameWrap: {
    flex: 1,
  },
  farmerSubtitle: {
    fontSize: 12,
    color: COLORS.subtitle,
    fontWeight: '500',
    marginTop: 2,
  },
});