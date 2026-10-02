import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getUserSession, StoredUserData } from '@/src/authStorage';
import {
  getFarmersByAdmin,
  getProcurementByFarmerId,
  getAnimalsByFarmerId,
  getFarmerById,
  createDailyProcurement,
  calculateMilkRate,
  calculateTotalMilk,
  calculateTotalAmount,
  Farmer,
  Animal,
  DailyProcurementDateGroup,
  ProcurementRecordItem,
  CreateProcurementPayload,
  batchAllSettled,
} from '@/src/services/dairyApi';
import { DailyProcurementSkeleton } from '@/components/Shimmer';

const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  headline: '#161616',
  brandGreen: '#4CAF50',
  brandGreenLight: '#E8F5E9',
  brandGreenBorder: '#C8E6C9',
  amber: '#B8791E',
  amberLight: '#FFF8E1',
  amberBorder: '#FFE082',
  cardBorder: '#E2E6DF',
  labelText: '#6B6B60',
  valueText: '#161616',
  danger: '#C62828',
};

interface FarmerProcurementSummary {
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  date: string;
  morningQty: number;
  eveningQty: number;
  totalQty: number;
  fat: string;
  snf: string;
  rate: string;
  totalAmount: string;
  procurementId?: string;
}

export default function DailyProcurementScreen() {
  const params = useLocalSearchParams<{
    farmer_id?: string;
    farmer_name?: string;
    code?: string;
    mobile_number?: string;
    aadhar_number?: string;
    address?: string;
    admin_id?: string;
    open_record?: string;
  }>();
  const [session, setSession] = useState<StoredUserData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [procurementItems, setProcurementItems] = useState<FarmerProcurementSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Procurement Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(params.farmer_id || '');
  const [farmerAnimals, setFarmerAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'Morning' | 'Evening'>('Morning');
  const [litersInput, setLitersInput] = useState('');
  const [fatInput, setFatInput] = useState('4.5');
  const [snfInput, setSnfInput] = useState('8.5');
  const [rateInput, setRateInput] = useState('35.00');
  const [savingProcurement, setSavingProcurement] = useState(false);

  // 1. Load Session (supports both Super Admin and Sub Admin)
  useEffect(() => {
    async function loadAuth() {
      const stored = await getUserSession();
      if (stored) {
        setSession(stored);
      } else {
        // Fallback session if opened directly or from Super Admin
        const fallback: StoredUserData = {
          role: 'super_admin',
          role_id: '1',
          admin_id: String(params.admin_id || '1'),
          admin_name: 'Admin',
          email: '',
        };
        setSession(fallback);
      }
    }
    loadAuth();
  }, [params.admin_id]);

  // Open modal automatically if open_record param is passed
  useEffect(() => {
    if (params.farmer_id) {
      setSelectedFarmerId(String(params.farmer_id));
      if (params.open_record === 'true') {
        setAddModalVisible(true);
      }
    }
  }, [params.farmer_id, params.open_record]);

  const isLoadingRef = React.useRef(false);

  // 2. Fetch All Procurement Data
  const loadData = useCallback(async (force = false) => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);

      const targetFarmerId = params.farmer_id ? String(params.farmer_id) : null;

      if (targetFarmerId) {
        console.log('====================================');
        console.log('[PROCUREMENT SCREEN] Loading details for targeted Farmer ID:', targetFarmerId);
        console.log('====================================');

        // Parallel fetch for target farmer: details, animals, and procurement list
        const [farmerRes, animalsRes, procRes] = await Promise.allSettled([
          getFarmerById(targetFarmerId),
          getAnimalsByFarmerId(targetFarmerId, force),
          getProcurementByFarmerId(targetFarmerId, force),
        ]);

        let resolvedFarmer: Farmer | null = null;
        if (farmerRes.status === 'fulfilled' && farmerRes.value) {
          resolvedFarmer = farmerRes.value;
          console.log('[PROCUREMENT SCREEN] Loaded farmer details:', resolvedFarmer.farmer_name);
        } else if (procRes.status === 'fulfilled' && procRes.value?.farmer_details) {
          resolvedFarmer = procRes.value.farmer_details;
        }

        const effectiveFarmer: Farmer = resolvedFarmer || {
          farmer_id: targetFarmerId,
          farmer_name: params.farmer_name || `Farmer #${targetFarmerId}`,
          code: params.code || `F-${targetFarmerId}`,
          mobile_number: params.mobile_number || '',
          aadhar_number: params.aadhar_number || '',
          address: params.address || '',
          admin_id: String(params.admin_id || session?.admin_id || ''),
          status: '1',
          profile: '',
          created_at: '',
          updated_at: '',
        };

        setFarmers([effectiveFarmer]);
        setSelectedFarmerId(targetFarmerId);

        if (animalsRes.status === 'fulfilled' && Array.isArray(animalsRes.value)) {
          console.log('[PROCUREMENT SCREEN] Loaded animals count:', animalsRes.value.length);
          setFarmerAnimals(animalsRes.value);
          if (animalsRes.value.length > 0) {
            setSelectedAnimalId(String(animalsRes.value[0].animal_id));
            const calculatedRate = calculateMilkRate(
              parseFloat(fatInput) || 4.5,
              parseFloat(snfInput) || 8.5,
              animalsRes.value[0].animal_type
            );
            setRateInput(calculatedRate.toFixed(2));
          }
        }

        const items: FarmerProcurementSummary[] = [];

        if (procRes.status === 'fulfilled' && procRes.value) {
          const rawProc = procRes.value;
          console.log('[PROCUREMENT SCREEN] Procurement response status:', rawProc.status);

          const dataList: any[] = Array.isArray(rawProc.procurement_data)
            ? rawProc.procurement_data
            : Array.isArray((rawProc as any).data)
              ? (rawProc as any).data
              : [];

          const farmerName = effectiveFarmer.farmer_name || 'Farmer';
          const farmerCode = effectiveFarmer.code || `F-${targetFarmerId}`;

          dataList.forEach((group: any) => {
            if (group.morning_shift || group.evening_shift) {
              const mRecords: ProcurementRecordItem[] = group.morning_shift?.records || [];
              const eRecords: ProcurementRecordItem[] = group.evening_shift?.records || [];
              const all = [...mRecords, ...eRecords];

              if (all.length > 0) {
                const mQty = mRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const eQty = eRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const totalLiters = calculateTotalMilk(mQty, eQty);

                const sample = all[0];
                const rateVal = parseFloat(sample.rate) || 35.0;

                const totalAmt = all.reduce(
                  (sum, r) =>
                    sum + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * (parseFloat(r.rate) || rateVal)),
                  0
                );

                items.push({
                  farmerId: targetFarmerId,
                  farmerName,
                  farmerCode,
                  date: group.date || new Date().toISOString().split('T')[0],
                  morningQty: Number(mQty.toFixed(2)),
                  eveningQty: Number(eQty.toFixed(2)),
                  totalQty: Number(totalLiters.toFixed(2)),
                  fat: sample.fat || '4.50',
                  snf: sample.snf || '8.50',
                  rate: rateVal.toFixed(2),
                  totalAmount: totalAmt.toFixed(2),
                  procurementId: sample.procurement_id,
                });
              }
            } else if (group.liters !== undefined || group.fat !== undefined) {
              const liters = parseFloat(group.liters) || 0;
              const rateVal = parseFloat(group.rate) || 35.0;
              const totalAmt = parseFloat(group.amount) || liters * rateVal;
              const isMorning = group.shift === 'Morning';

              items.push({
                farmerId: targetFarmerId,
                farmerName,
                farmerCode,
                date: group.created_at ? group.created_at.split(' ')[0] : group.date || new Date().toISOString().split('T')[0],
                morningQty: isMorning ? Number(liters.toFixed(2)) : 0,
                eveningQty: !isMorning ? Number(liters.toFixed(2)) : 0,
                totalQty: Number(liters.toFixed(2)),
                fat: String(group.fat || '4.50'),
                snf: String(group.snf || '8.50'),
                rate: rateVal.toFixed(2),
                totalAmount: totalAmt.toFixed(2),
                procurementId: group.procurement_id,
              });
            }
          });
        }

        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setProcurementItems(items);
      } else {
        // Mode 2: General Admin Procurement View (when no specific farmer_id passed)
        const adminIdToUse = session?.admin_id || params.admin_id || '1';
        console.log('[PROCUREMENT SCREEN] Fetching general farmer list for admin_id:', adminIdToUse);

        const farmerList = await getFarmersByAdmin(adminIdToUse, force);
        setFarmers(farmerList);

        const items: FarmerProcurementSummary[] = [];

        const settledResults = await batchAllSettled(
          farmerList,
          async (farmer) => {
            const res = await getProcurementByFarmerId(farmer.farmer_id, force);
            return { farmer, res };
          },
          6
        );

        for (const itemResult of settledResults) {
          if (itemResult.status !== 'fulfilled') continue;
          const { farmer, res } = itemResult.value;

          const isOk =
            (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
            Array.isArray(res.procurement_data);
          if (isOk) {
            res.procurement_data.forEach((group: DailyProcurementDateGroup) => {
              const mRecords = group.morning_shift?.records || [];
              const eRecords = group.evening_shift?.records || [];
              const all = [...mRecords, ...eRecords];

              if (all.length > 0) {
                const mQty = mRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const eQty = eRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const totalLiters = calculateTotalMilk(mQty, eQty);

                const sample = all[0];
                const rateVal = parseFloat(sample.rate) || 35.0;

                const totalAmt = all.reduce(
                  (sum, r) =>
                    sum + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * (parseFloat(r.rate) || rateVal)),
                  0
                );

                items.push({
                  farmerId: String(farmer.farmer_id),
                  farmerName: farmer.farmer_name || res.farmer_details?.farmer_name || 'Farmer',
                  farmerCode: farmer.code || res.farmer_details?.code || `F-${farmer.farmer_id}`,
                  date: group.date,
                  morningQty: Number(mQty.toFixed(2)),
                  eveningQty: Number(eQty.toFixed(2)),
                  totalQty: Number(totalLiters.toFixed(2)),
                  fat: sample.fat || '4.50',
                  snf: sample.snf || '8.50',
                  rate: rateVal.toFixed(2),
                  totalAmount: totalAmt.toFixed(2),
                  procurementId: sample.procurement_id,
                });
              }
            });
          }
        }

        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setProcurementItems(items);
      }
    } catch (err) {
      console.log('[PROCUREMENT SCREEN ERROR]:', err);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [session?.admin_id, params.farmer_id, params.farmer_name, params.code, params.admin_id, fatInput, snfInput]);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // When farmer is selected in Add Procurement Modal, fetch their animals
  useEffect(() => {
    if (selectedFarmerId) {
      getAnimalsByFarmerId(selectedFarmerId).then((animals) => {
        setFarmerAnimals(animals);
        if (animals.length > 0) {
          setSelectedAnimalId(animals[0].animal_id);
          // auto update default rate
          const rate = calculateMilkRate(parseFloat(fatInput) || 4.5, parseFloat(snfInput) || 8.5, animals[0].animal_type);
          setRateInput(rate.toFixed(2));
        } else {
          setSelectedAnimalId('');
        }
      });
    }
  }, [selectedFarmerId]);

  // Recalculate rate automatically when Fat or SNF changes
  const handleFatChange = (val: string) => {
    setFatInput(val);
    const f = parseFloat(val) || 0;
    const s = parseFloat(snfInput) || 0;
    if (f > 0 && s > 0) {
      const currentAnimal = farmerAnimals.find((a) => a.animal_id === selectedAnimalId);
      const r = calculateMilkRate(f, s, currentAnimal?.animal_type);
      setRateInput(r.toFixed(2));
    }
  };

  const handleSnfChange = (val: string) => {
    setSnfInput(val);
    const f = parseFloat(fatInput) || 0;
    const s = parseFloat(val) || 0;
    if (f > 0 && s > 0) {
      const currentAnimal = farmerAnimals.find((a) => a.animal_id === selectedAnimalId);
      const r = calculateMilkRate(f, s, currentAnimal?.animal_type);
      setRateInput(r.toFixed(2));
    }
  };

  // Submit Daily Procurement (Matches Postman POST /api/createdailyprocurement)
  const handleSaveProcurement = async () => {
    if (!selectedFarmerId) {
      Alert.alert('Validation Error', 'Please select a farmer.');
      return;
    }

    const liters = parseFloat(litersInput);
    if (!liters || liters <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid milk quantity (liters).');
      return;
    }

    const fat = parseFloat(fatInput) || 4.5;
    const snf = parseFloat(snfInput) || 8.5;
    const rate = parseFloat(rateInput) || 35.0;

    setSavingProcurement(true);
    try {
      const payload: CreateProcurementPayload = {
        farmer_id: Number(selectedFarmerId),
        shift: selectedShift,
        procurements: [
          {
            animal_id: Number(selectedAnimalId) || 1,
            fat: Number(fat.toFixed(2)),
            snf: Number(snf.toFixed(2)),
            liters: Number(liters.toFixed(2)),
            rate: Number(rate.toFixed(2)),
          },
        ],
      };

      console.log('====================================');
      console.log('[RECORD PROCUREMENT] Submitting Daily Procurement:');
      console.log('Endpoint: POST /api/createdailyprocurement');
      console.log('Headers: { "Auth-Key": "canandairyApi" }');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('====================================');

      const res = await createDailyProcurement(payload);
      console.log('[RECORD PROCUREMENT] Response:', res);

      const isSuccess =
        res.status === 200 ||
        (res as any).status === '200' ||
        (res as any).status === true;

      if (isSuccess) {
        Alert.alert(
          'Success',
          res.message || 'Milk procurement recorded successfully!',
          [
            {
              text: 'View Milk Bill',
              onPress: () => {
                setAddModalVisible(false);
                router.push({
                  pathname: '/sub_amin/milk_bill' as any,
                  params: {
                    farmer_id: selectedFarmerId,
                  },
                });
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setAddModalVisible(false);
                loadData(true);
              },
            },
          ]
        );

        setLitersInput('');
      } else {
        Alert.alert('Failed', res.message || 'Unable to record daily procurement.');
      }
    } catch (err: any) {
      console.log('[RECORD PROCUREMENT ERROR]:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Network error while recording procurement.';
      Alert.alert('Error', errMsg);
    } finally {
      setSavingProcurement(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return procurementItems;
    return procurementItems.filter(
      (item) =>
        item.farmerName.toLowerCase().includes(q) ||
        item.farmerCode.toLowerCase().includes(q) ||
        item.farmerId.includes(q) ||
        item.date.includes(q)
    );
  }, [procurementItems, searchQuery]);

  // Totals summary
  const totalSupplyLiters = useMemo(
    () => filteredList.reduce((acc, cur) => acc + cur.totalQty, 0),
    [filteredList]
  );

  const totalSupplyAmount = useMemo(
    () => filteredList.reduce((acc, cur) => acc + parseFloat(cur.totalAmount || '0'), 0),
    [filteredList]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Daily Milk Procurement</Text>
          <Text style={styles.headerSubtitle}>
            {params.farmer_name
              ? `${params.farmer_name} (#${params.farmer_id})`
              : params.farmer_id
                ? `Farmer #${params.farmer_id}`
                : `Sub-Admin #${session?.admin_id || '-'}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addProcBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (params.farmer_id) setSelectedFarmerId(params.farmer_id);
            setAddModalVisible(true);
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addProcBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      {/* Highlights Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Supply</Text>
          <Text style={styles.metricValue}>{totalSupplyLiters.toFixed(1)} L</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Amount</Text>
          <Text style={[styles.metricValue, { color: COLORS.brandGreen }]}>
            ₹{totalSupplyAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Entries</Text>
          <Text style={styles.metricValue}>{filteredList.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={COLORS.labelText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search farmer name, code, date..."
          placeholderTextColor={COLORS.labelText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={17} color={COLORS.labelText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content List */}
      {loading && procurementItems.length === 0 ? (
        <DailyProcurementSkeleton />
      ) : filteredList.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="water-outline" size={48} color={COLORS.labelText} />
          <Text style={styles.emptyTitle}>No Milk Procurement Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {params.farmer_id
              ? 'No milk supplies recorded yet for this farmer.'
              : 'No milk procurement entries registered for your assigned farmers.'}
          </Text>
          <TouchableOpacity
            style={styles.recordFirstBtn}
            onPress={() => {
              if (params.farmer_id) setSelectedFarmerId(params.farmer_id);
              setAddModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.recordFirstBtnText}>Record Daily Milk</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item, idx) => `${item.farmerId}_${item.date}_${idx}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.brandGreen]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardFarmerName}>{item.farmerName}</Text>
                  <Text style={styles.cardFarmerMeta}>
                    Farmer ID: #{item.farmerId} • Code: {item.farmerCode}
                  </Text>
                </View>
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.brandGreen} />
                  <Text style={styles.dateBadgeText}>{item.date}</Text>
                </View>
              </View>

              {/* Quantities Row */}
              <View style={styles.shiftQuantitiesRow}>
                <View style={styles.shiftCol}>
                  <Text style={styles.shiftLabel}>Morning Qty</Text>
                  <Text style={styles.shiftVal}>{item.morningQty} L</Text>
                </View>

                <View style={styles.shiftCol}>
                  <Text style={styles.shiftLabel}>Evening Qty</Text>
                  <Text style={styles.shiftVal}>{item.eveningQty} L</Text>
                </View>

                <View style={styles.shiftColHighlight}>
                  <Text style={styles.shiftLabelHighlight}>Total Milk</Text>
                  <Text style={styles.shiftValHighlight}>{item.totalQty} L</Text>
                </View>
              </View>

              {/* Quality & Rate Grid */}
              <View style={styles.qualityGrid}>
                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>Fat</Text>
                  <Text style={styles.qualityValue}>{item.fat}%</Text>
                </View>

                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>SNF</Text>
                  <Text style={styles.qualityValue}>{item.snf}%</Text>
                </View>

                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>Rate / L</Text>
                  <Text style={[styles.qualityValue, { color: COLORS.brandGreen }]}>
                    ₹{item.rate}
                  </Text>
                </View>

                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>Total Amount</Text>
                  <Text style={[styles.qualityValue, { color: COLORS.brandGreen, fontWeight: '900' }]}>
                    ₹{item.totalAmount}
                  </Text>
                </View>
              </View>

              {/* Bill Navigation Actions */}
              <View style={styles.cardFooterActions}>
                <TouchableOpacity
                  style={styles.viewBillBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/sub_amin/milk_bill' as any,
                      params: {
                        farmer_id: item.farmerId,
                        procurement_id: item.procurementId,
                        date: item.date,
                      },
                    });
                  }}
                >
                  <Ionicons name="receipt-outline" size={15} color={COLORS.brandGreen} />
                  <Text style={styles.viewBillBtnText}>Milk Bill</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewSnfBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/sub_amin/snf_bill' as any,
                      params: {
                        farmer_id: item.farmerId,
                        procurement_id: item.procurementId,
                        date: item.date,
                      },
                    });
                  }}
                >
                  <MaterialCommunityIcons name="calculator" size={15} color={COLORS.amber} />
                  <Text style={styles.viewSnfBtnText}>SNF Calculation Bill</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL: RECORD DAILY MILK PROCUREMENT                 */}
      {/* ==================================================== */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="water" size={22} color={COLORS.brandGreen} />
                <Text style={styles.modalTitle}>Record Milk Procurement</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.headline} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Farmer Selector */}
              <Text style={styles.modalFieldLabel}>Select Farmer *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {farmers.map((f) => {
                  const isSelected = String(f.farmer_id) === String(selectedFarmerId);
                  return (
                    <TouchableOpacity
                      key={f.farmer_id}
                      style={[styles.farmerChip, isSelected && styles.farmerChipActive]}
                      onPress={() => setSelectedFarmerId(String(f.farmer_id))}
                    >
                      <Text style={[styles.farmerChipText, isSelected && styles.farmerChipTextActive]}>
                        #{f.farmer_id} - {f.farmer_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Shift Selector */}
              <Text style={styles.modalFieldLabel}>Shift *</Text>
              <View style={styles.shiftSelectorRow}>
                {(['Morning', 'Evening'] as const).map((shift) => {
                  const isSelected = selectedShift === shift;
                  return (
                    <TouchableOpacity
                      key={shift}
                      style={[styles.shiftBtn, isSelected && styles.shiftBtnActive]}
                      onPress={() => setSelectedShift(shift)}
                    >
                      <Ionicons
                        name={shift === 'Morning' ? 'sunny-outline' : 'moon-outline'}
                        size={16}
                        color={isSelected ? '#FFFFFF' : COLORS.labelText}
                      />
                      <Text style={[styles.shiftBtnText, isSelected && styles.shiftBtnTextActive]}>
                        {shift} Shift
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Animal Selector */}
              <Text style={styles.modalFieldLabel}>Select Animal *</Text>
              {farmerAnimals.length === 0 ? (
                <View style={styles.noAnimalsWarning}>
                  <Text style={styles.noAnimalsText}>
                    No animals found for Farmer #{selectedFarmerId}. You can still proceed with Animal #1.
                  </Text>
                </View>
              ) : (
                <View style={styles.animalChipRow}>
                  {farmerAnimals.map((a) => {
                    const isSelected = a.animal_id === selectedAnimalId;
                    return (
                      <TouchableOpacity
                        key={a.animal_id}
                        style={[styles.animalChip, isSelected && styles.animalChipActive]}
                        onPress={() => setSelectedAnimalId(a.animal_id)}
                      >
                        <MaterialCommunityIcons
                          name={a.animal_type?.toLowerCase().includes('cow') ? 'cow' : 'pig'}
                          size={15}
                          color={isSelected ? '#fff' : COLORS.brandGreen}
                        />
                        <Text style={[styles.animalChipText, isSelected && styles.animalChipTextActive]}>
                          #{a.animal_id} ({a.animal_type})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Quantity, Fat, SNF Inputs */}
              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.modalFieldLabel}>Milk Quantity (L) *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 12.5"
                    keyboardType="numeric"
                    value={litersInput}
                    onChangeText={setLitersInput}
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.modalFieldLabel}>Fat % *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="4.5"
                    keyboardType="numeric"
                    value={fatInput}
                    onChangeText={handleFatChange}
                  />
                </View>
              </View>

              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.modalFieldLabel}>SNF % *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="8.5"
                    keyboardType="numeric"
                    value={snfInput}
                    onChangeText={handleSnfChange}
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.modalFieldLabel}>Price / Liter (₹) *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="35.00"
                    keyboardType="numeric"
                    value={rateInput}
                    onChangeText={setRateInput}
                  />
                </View>
              </View>

              {/* Live Preview Box */}
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Live Calculation Preview:</Text>
                <Text style={styles.previewFormula}>
                  {parseFloat(litersInput) || 0} Liters × ₹{parseFloat(rateInput) || 0} / L
                </Text>
                <Text style={styles.previewTotal}>
                  = ₹{calculateTotalAmount(parseFloat(litersInput) || 0, parseFloat(rateInput) || 0).toFixed(2)}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.saveBtn, savingProcurement && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleSaveProcurement}
                disabled={savingProcurement}
              >
                {savingProcurement ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Procurement Record</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#999999',
    fontSize: 12,
    marginTop: 1,
  },
  addProcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addProcBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.cardBorder,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.labelText,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.headline,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.headline,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: COLORS.labelText,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.headline,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.labelText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  recordFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  recordFirstBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardFarmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.headline,
  },
  cardFarmerMeta: {
    fontSize: 12,
    color: COLORS.labelText,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  shiftQuantitiesRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F9F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  shiftCol: {
    flex: 1,
    alignItems: 'center',
  },
  shiftColHighlight: {
    flex: 1.2,
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    borderRadius: 8,
    paddingVertical: 4,
  },
  shiftLabel: {
    fontSize: 11,
    color: COLORS.labelText,
  },
  shiftVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.headline,
    marginTop: 2,
  },
  shiftLabelHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  shiftValHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.brandGreen,
    marginTop: 1,
  },
  qualityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.8,
    borderTopColor: '#ECECE8',
    paddingTop: 10,
    marginBottom: 12,
  },
  qualityItem: {
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: 11,
    color: COLORS.labelText,
  },
  qualityValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.headline,
    marginTop: 2,
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 0.8,
    borderTopColor: '#ECECE8',
    paddingTop: 10,
  },
  viewBillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  viewBillBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  viewSnfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  viewSnfBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.amber,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.headline,
  },
  modalFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.headline,
    marginBottom: 6,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  farmerChip: {
    backgroundColor: '#F0F2EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  farmerChipActive: {
    backgroundColor: COLORS.brandGreen,
  },
  farmerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.headline,
  },
  farmerChipTextActive: {
    color: '#fff',
  },
  shiftSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2EE',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  shiftBtnActive: {
    backgroundColor: COLORS.brandGreen,
  },
  shiftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.headline,
  },
  shiftBtnTextActive: {
    color: '#fff',
  },
  noAnimalsWarning: {
    backgroundColor: COLORS.amberLight,
    padding: 8,
    borderRadius: 8,
  },
  noAnimalsText: {
    fontSize: 12,
    color: COLORS.amber,
  },
  animalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2EE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  animalChipActive: {
    backgroundColor: COLORS.brandGreen,
  },
  animalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.headline,
  },
  animalChipTextActive: {
    color: '#fff',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  inputCol: {
    flex: 1,
  },
  modalTextInput: {
    backgroundColor: '#F5F7F4',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headline,
  },
  previewBox: {
    backgroundColor: COLORS.brandGreenLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
  },
  previewTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  previewFormula: {
    fontSize: 12.5,
    color: COLORS.headline,
    marginTop: 2,
  },
  previewTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.brandGreen,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 10,
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
