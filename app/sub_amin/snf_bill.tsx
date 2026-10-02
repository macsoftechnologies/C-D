import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getProcurementById,
  getProcurementByFarmerId,
  calculateMilkRate,
  calculateSNFFromCLR,
  calculateTotalMilk,
  calculateTotalAmount,
  Farmer,
} from '@/src/services/dairyApi';
import { BillSkeleton } from '@/components/Shimmer';

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
  downloadBtnBg: '#4CAF50',
  danger: '#C62828',
};

export default function SnfCalculationBillScreen() {
  const params = useLocalSearchParams<{
    farmer_id?: string;
    procurement_id?: string;
    date?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [farmer, setFarmer] = useState<Farmer | null>(null);

  // Core Data
  const [procurementRecord, setProcurementRecord] = useState<{
    procurementId: string;
    farmerName: string;
    farmerId: string;
    farmerCode: string;
    mobile: string;
    address: string;
    date: string;
    shift: string;
    animalId: string;
    liters: number;
    morningQty: number;
    eveningQty: number;
    fat: number;
    snf: number;
    rate: number;
    totalAmount: number;
    createdAt: string;
  } | null>(null);

  // Interactive Calculator Mode
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [calcLiters, setCalcLiters] = useState('10.0');
  const [calcFat, setCalcFat] = useState('4.5');
  const [calcClr, setCalcClr] = useState('28.0');
  const [calcSnf, setCalcSnf] = useState('8.5');

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (params.procurement_id) {
        const res = await getProcurementById(params.procurement_id);
        const isOk =
          (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
          Boolean(res.procurement_data);
        if (isOk) {
          const p = res.procurement_data;
          const f = res.farmer_details || null;
          setFarmer(f);

          const l = parseFloat(p.liters) || 0;
          const ft = parseFloat(p.fat) || 4.5;
          const sf = parseFloat(p.snf) || 8.5;
          const rt = parseFloat(p.rate) || 35.0;
          const amt = parseFloat(p.amount) || l * rt;

          setProcurementRecord({
            procurementId: p.procurement_id,
            farmerName: f?.farmer_name || 'Farmer',
            farmerId: String(p.farmer_id || f?.farmer_id || '-'),
            farmerCode: p.code || f?.code || '-',
            mobile: f?.mobile_number || '-',
            address: f?.address || 'Local Village',
            date: p.created_at ? p.created_at.split(' ')[0] : 'Today',
            shift: p.shift,
            animalId: p.animal_id,
            liters: l,
            morningQty: p.shift === 'Morning' ? l : 0,
            eveningQty: p.shift === 'Evening' ? l : 0,
            fat: ft,
            snf: sf,
            rate: rt,
            totalAmount: amt,
            createdAt: p.created_at,
          });

          setCalcLiters(String(l));
          setCalcFat(String(ft));
          setCalcSnf(String(sf));
          return;
        }
      }

      if (params.farmer_id) {
        const res = await getProcurementByFarmerId(params.farmer_id);
        const isOk =
          (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
          Array.isArray(res.procurement_data);
        if (isOk) {
          const f = res.farmer_details || null;
          setFarmer(f);

          const targetDate = params.date
            ? res.procurement_data.find((d) => d.date === params.date)
            : res.procurement_data[0];

          if (targetDate) {
            const mRecords = targetDate.morning_shift?.records || [];
            const eRecords = targetDate.evening_shift?.records || [];
            const all = [...mRecords, ...eRecords];

            const mQty = mRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
            const eQty = eRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
            const totalQty = mQty + eQty;

            const sample = all[0] || mRecords[0] || eRecords[0];
            const ft = parseFloat(sample?.fat || '4.50');
            const sf = parseFloat(sample?.snf || '8.50');
            const rt = parseFloat(sample?.rate || '35.00');
            const amt = all.reduce((sum, r) => sum + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * rt), 0);

            setProcurementRecord({
              procurementId: sample?.procurement_id || '-',
              farmerName: f?.farmer_name || 'Farmer',
              farmerId: String(params.farmer_id),
              farmerCode: f?.code || sample?.code || '-',
              mobile: f?.mobile_number || '-',
              address: f?.address || 'Local Village',
              date: targetDate.date,
              shift: mRecords.length > 0 && eRecords.length > 0 ? 'Morning + Evening' : mRecords.length > 0 ? 'Morning' : 'Evening',
              animalId: sample?.animal_id || '-',
              liters: totalQty,
              morningQty: mQty,
              eveningQty: eQty,
              fat: ft,
              snf: sf,
              rate: rt,
              totalAmount: amt,
              createdAt: sample?.created_at || targetDate.date,
            });

            setCalcLiters(String(totalQty));
            setCalcFat(String(ft));
            setCalcSnf(String(sf));
            return;
          }
        }
      }

      setError('No procurement record found for SNF Calculation report.');
    } catch (err: any) {
      console.log('SNF Bill Fetch Error:', err);
      setError(err?.response?.data?.message || 'Failed to fetch SNF Calculation report.');
    } finally {
      setLoading(false);
    }
  }, [params.farmer_id, params.procurement_id, params.date]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleShare = async () => {
    if (!procurementRecord) return;
    try {
      const message = `CANAN DAIRY - SNF CALCULATION BILL
------------------------------------
Farmer: ${procurementRecord.farmerName} (ID: #${procurementRecord.farmerId})
Animal ID: #${procurementRecord.animalId}
Date: ${procurementRecord.date} | Shift: ${procurementRecord.shift}
------------------------------------
Milk Quantity: ${procurementRecord.liters} L
(Morning: ${procurementRecord.morningQty} L | Evening: ${procurementRecord.eveningQty} L)
Fat Percentage: ${procurementRecord.fat}%
SNF Percentage: ${procurementRecord.snf}%
Applicable Price/Liter: ₹${procurementRecord.rate.toFixed(2)}
------------------------------------
CALCULATED AMOUNT: ₹${procurementRecord.totalAmount.toFixed(2)}
Formula: Total Milk (L) × Price Per Liter
Verified via Canaan Dairy Backend`;

      await Share.share({ message });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  // Re-calculate interactive numbers
  const liveLiters = parseFloat(calcLiters) || 0;
  const liveFat = parseFloat(calcFat) || 0;
  const liveSnf = parseFloat(calcSnf) || 0;
  const liveRate = calculateMilkRate(liveFat, liveSnf);
  const liveTotal = calculateTotalAmount(liveLiters, liveRate);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SNF Calculation Bill</Text>
          <View style={{ width: 22 }} />
        </View>
        <BillSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !procurementRecord) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SNF Calculation Bill</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Report Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRecord}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SNF Calculation Bill</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Farmer Header Info Card */}
        <View style={styles.farmerCard}>
          <View style={styles.farmerTopRow}>
            <View>
              <Text style={styles.farmerName}>{procurementRecord.farmerName}</Text>
              <Text style={styles.farmerSubtitle}>
                Farmer ID: #{procurementRecord.farmerId} • Code: {procurementRecord.farmerCode}
              </Text>
            </View>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>#{procurementRecord.procurementId}</Text>
            </View>
          </View>

          <View style={styles.farmerMetaRow}>
            <View style={styles.farmerMetaItem}>
              <Ionicons name="call-outline" size={13} color={COLORS.brandGreen} />
              <Text style={styles.farmerMetaText}>{procurementRecord.mobile}</Text>
            </View>
            <View style={styles.farmerMetaItem}>
              <Ionicons name="location-outline" size={13} color={COLORS.brandGreen} />
              <Text style={styles.farmerMetaText} numberOfLines={1}>
                {procurementRecord.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Calculation Summary Card */}
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.titleIconRow}>
              <MaterialCommunityIcons name="calculator" size={22} color={COLORS.brandGreen} />
              <Text style={styles.reportTitle}>Milk & SNF Calculation</Text>
            </View>
            <View style={styles.shiftBadge}>
              <Text style={styles.shiftBadgeText}>{procurementRecord.shift}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Core Calculation Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricTileLabel}>Milk Fat</Text>
              <Text style={styles.metricTileValue}>{procurementRecord.fat}%</Text>
              <Text style={styles.metricTileSub}>Fat Contribution</Text>
            </View>

            <View style={styles.metricTile}>
              <Text style={styles.metricTileLabel}>Milk SNF</Text>
              <Text style={styles.metricTileValue}>{procurementRecord.snf}%</Text>
              <Text style={styles.metricTileSub}>Solids Not Fat</Text>
            </View>

            <View style={styles.metricTile}>
              <Text style={styles.metricTileLabel}>Price / Liter</Text>
              <Text style={[styles.metricTileValue, { color: COLORS.brandGreen }]}>
                ₹{procurementRecord.rate.toFixed(2)}
              </Text>
              <Text style={styles.metricTileSub}>Applicable Rate</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Breakdown Items */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Animal ID</Text>
            <Text style={styles.calcValue}>#{procurementRecord.animalId}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Morning Milk Quantity</Text>
            <Text style={styles.calcValue}>{procurementRecord.morningQty} L</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Evening Milk Quantity</Text>
            <Text style={styles.calcValue}>{procurementRecord.eveningQty} L</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { fontWeight: '700', color: COLORS.headline }]}>
              Total Milk Quantity (Morning + Evening)
            </Text>
            <Text style={[styles.calcValue, { fontWeight: '800', color: COLORS.brandGreen }]}>
              {procurementRecord.liters} L
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Fat Pricing Factor (₹4.0 × {procurementRecord.fat})</Text>
            <Text style={styles.calcValue}>₹{(procurementRecord.fat * 4.0).toFixed(2)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>SNF Pricing Factor (₹2.0 × {procurementRecord.snf})</Text>
            <Text style={styles.calcValue}>₹{(procurementRecord.snf * 2.0).toFixed(2)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Applicable Rate Per Liter</Text>
            <Text style={[styles.calcValue, { color: COLORS.brandGreen }]}>
              ₹{procurementRecord.rate.toFixed(2)} / L
            </Text>
          </View>

          {/* Calculation Box */}
          <View style={styles.calculationFormulaBox}>
            <Text style={styles.formulaTitle}>Calculation Breakdown Formula:</Text>
            <Text style={styles.formulaText}>
              Total Amount = Total Milk Quantity ({procurementRecord.liters} L) × Price Per Liter (₹{procurementRecord.rate.toFixed(2)})
            </Text>
            <Text style={styles.formulaResult}>
              = ₹{procurementRecord.totalAmount.toFixed(2)}
            </Text>
          </View>

          {/* Grand Calculated Total */}
          <View style={styles.grandTotalContainer}>
            <Text style={styles.grandTotalLabel}>TOTAL CALCULATED AMOUNT</Text>
            <Text style={styles.grandTotalValue}>₹{procurementRecord.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Interactive Simulator / Verification Toggle */}
        <TouchableOpacity
          style={styles.toggleSimulatorBtn}
          onPress={() => setInteractiveMode(!interactiveMode)}
        >
          <Ionicons
            name={interactiveMode ? 'chevron-up-circle' : 'calculator-outline'}
            size={18}
            color={COLORS.brandGreen}
          />
          <Text style={styles.toggleSimulatorText}>
            {interactiveMode ? 'Hide Interactive Rate Verifier' : 'Verify with Interactive Rate Verifier'}
          </Text>
        </TouchableOpacity>

        {interactiveMode ? (
          <View style={styles.simulatorCard}>
            <Text style={styles.simulatorTitle}>Interactive Rate & SNF Verifier</Text>
            <Text style={styles.simulatorSubhead}>
              Test any Liters, Fat%, or SNF% against Canaan Dairy pricing model:
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.simLabel}>Liters (L)</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={calcLiters}
                  onChangeText={setCalcLiters}
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.simLabel}>Fat (%)</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={calcFat}
                  onChangeText={setCalcFat}
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.simLabel}>SNF (%)</Text>
                <TextInput
                  style={styles.simInput}
                  keyboardType="numeric"
                  value={calcSnf}
                  onChangeText={setCalcSnf}
                />
              </View>
            </View>

            <View style={styles.simResultBox}>
              <View style={styles.simResultCol}>
                <Text style={styles.simResultSub}>Calculated Price/L</Text>
                <Text style={styles.simResultMain}>₹{liveRate.toFixed(2)}</Text>
              </View>
              <View style={styles.simResultDivider} />
              <View style={styles.simResultCol}>
                <Text style={styles.simResultSub}>Total Amount ({liveLiters}L)</Text>
                <Text style={[styles.simResultMain, { color: COLORS.brandGreen }]}>
                  ₹{liveTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* View Milk Bill Button */}
        <TouchableOpacity
          style={styles.viewMilkBillBtn}
          activeOpacity={0.85}
          onPress={() => {
            router.push({
              pathname: '/sub_amin/milk_bill' as any,
              params: {
                farmer_id: procurementRecord.farmerId,
                procurement_id: procurementRecord.procurementId,
                date: procurementRecord.date,
              },
            });
          }}
        >
          <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
          <Text style={styles.viewMilkBillBtnText}>View Full Milk Receipt Bill</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.labelText,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.headline,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13.5,
    color: COLORS.labelText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  farmerCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  farmerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.headline,
  },
  farmerSubtitle: {
    fontSize: 12.5,
    color: COLORS.labelText,
    marginTop: 3,
  },
  idBadge: {
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  farmerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.8,
    borderTopColor: '#F0F0EE',
  },
  farmerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  farmerMetaText: {
    fontSize: 12.5,
    color: COLORS.labelText,
  },
  reportCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.headline,
  },
  shiftBadge: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shiftBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.amber,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F8FAF7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECE6',
  },
  metricTileLabel: {
    fontSize: 11.5,
    color: COLORS.labelText,
    fontWeight: '600',
  },
  metricTileValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.headline,
    marginTop: 4,
  },
  metricTileSub: {
    fontSize: 10,
    color: '#8A8A80',
    marginTop: 2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.6,
    borderBottomColor: '#F2F2EE',
  },
  calcLabel: {
    fontSize: 13,
    color: COLORS.labelText,
  },
  calcValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.valueText,
  },
  calculationFormulaBox: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  formulaTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.amber,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 12,
    color: '#6D4C0E',
    lineHeight: 17,
  },
  formulaResult: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D4C0E',
    marginTop: 4,
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  grandTotalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.brandGreen,
  },
  toggleSimulatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 8,
  },
  toggleSimulatorText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  simulatorCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
    marginBottom: 14,
  },
  simulatorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.headline,
  },
  simulatorSubhead: {
    fontSize: 12,
    color: COLORS.labelText,
    marginTop: 2,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputCol: {
    flex: 1,
  },
  simLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.labelText,
    marginBottom: 4,
  },
  simInput: {
    backgroundColor: '#F5F7F4',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headline,
  },
  simResultBox: {
    flexDirection: 'row',
    backgroundColor: '#F5F7F4',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  simResultCol: {
    flex: 1,
    alignItems: 'center',
  },
  simResultDivider: {
    width: 1,
    backgroundColor: '#E0E0DC',
  },
  simResultSub: {
    fontSize: 11,
    color: COLORS.labelText,
    fontWeight: '600',
  },
  simResultMain: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.headline,
    marginTop: 2,
  },
  viewMilkBillBtn: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewMilkBillBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
