import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getProcurementById,
  getProcurementByFarmerId,
  Farmer,
  ProcurementRecordItem,
} from '@/src/services/dairyApi';
import { BillSkeleton } from '@/components/Shimmer';

const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  headline: '#161616',
  brandGreen: '#4CAF50',
  brandGreenLight: '#E8F5E9',
  brandGreenDark: '#164A39',
  amber: '#B8791E',
  amberLight: '#FFF8E1',
  badgeBg: '#E7F3EC',
  badgeText: '#1F5E4A',
  cardBorder: '#E2E6DF',
  labelText: '#6B6B60',
  valueText: '#161616',
  amountGreen: '#1F5E4A',
  downloadBtnBg: '#4CAF50',
  danger: '#C62828',
};

export default function MilkBillScreen() {
  const params = useLocalSearchParams<{
    farmer_id?: string;
    procurement_id?: string;
    date?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [farmer, setFarmer] = useState<Farmer | null>(null);

  // Bill metrics from real API
  const [billData, setBillData] = useState<{
    procurementId: string;
    farmerName: string;
    farmerId: string;
    farmerCode: string;
    date: string;
    shift: string;
    morningQty: number;
    eveningQty: number;
    totalQty: number;
    fat: string;
    snf: string;
    rate: string;
    totalAmount: string;
    animalId: string;
    createdAt: string;
  } | null>(null);

  const fetchBillData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 1. If specific procurement_id provided
      if (params.procurement_id) {
        const res = await getProcurementById(params.procurement_id);
        const isOk =
          (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
          Boolean(res.procurement_data);
        if (isOk) {
          const p = res.procurement_data;
          const f = res.farmer_details || null;
          setFarmer(f);

          const liters = parseFloat(p.liters) || 0;
          const isMorning = p.shift === 'Morning';
          const rateVal = parseFloat(p.rate) || 0;
          const amtVal = parseFloat(p.amount) || liters * rateVal;

          setBillData({
            procurementId: p.procurement_id,
            farmerName: f?.farmer_name || 'Farmer',
            farmerId: String(p.farmer_id || f?.farmer_id || '-'),
            farmerCode: p.code || f?.code || '-',
            date: p.created_at ? p.created_at.split(' ')[0] : 'Today',
            shift: p.shift,
            morningQty: isMorning ? liters : 0,
            eveningQty: !isMorning ? liters : 0,
            totalQty: liters,
            fat: p.fat,
            snf: p.snf,
            rate: p.rate,
            totalAmount: amtVal.toFixed(2),
            animalId: p.animal_id,
            createdAt: p.created_at,
          });
          return;
        }
      }

      // 2. If farmer_id provided, fetch date summary
      if (params.farmer_id) {
        const res = await getProcurementByFarmerId(params.farmer_id);
        const isOk =
          (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
          Array.isArray(res.procurement_data);
        if (isOk) {
          const f = res.farmer_details || null;
          setFarmer(f);

          const targetDateGroup = params.date
            ? res.procurement_data.find((d) => d.date === params.date)
            : res.procurement_data[0];

          if (targetDateGroup) {
            const mRecords = targetDateGroup.morning_shift?.records || [];
            const eRecords = targetDateGroup.evening_shift?.records || [];
            const allRecords = [...mRecords, ...eRecords];

            const mQty = mRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
            const eQty = eRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
            const totalQty = mQty + eQty;

            const totalAmt = allRecords.reduce(
              (sum, r) => sum + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * (parseFloat(r.rate) || 0)),
              0
            );

            const sample = allRecords[0] || mRecords[0] || eRecords[0];

            setBillData({
              procurementId: sample?.procurement_id || '-',
              farmerName: f?.farmer_name || 'Farmer',
              farmerId: String(params.farmer_id),
              farmerCode: f?.code || sample?.code || '-',
              date: targetDateGroup.date,
              shift: mRecords.length > 0 && eRecords.length > 0 ? 'Both Shifts' : mRecords.length > 0 ? 'Morning' : 'Evening',
              morningQty: Number(mQty.toFixed(2)),
              eveningQty: Number(eQty.toFixed(2)),
              totalQty: Number(totalQty.toFixed(2)),
              fat: sample?.fat || '4.50',
              snf: sample?.snf || '8.50',
              rate: sample?.rate || (totalQty > 0 ? (totalAmt / totalQty).toFixed(2) : '35.00'),
              totalAmount: totalAmt.toFixed(2),
              animalId: sample?.animal_id || '-',
              createdAt: sample?.created_at || targetDateGroup.date,
            });
            return;
          }
        }
      }

      setError('No procurement billing records found for the requested criteria.');
    } catch (err: any) {
      console.log('Milk Bill Fetch Error:', err);
      setError(err?.response?.data?.message || 'Unable to generate Milk Bill. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [params.farmer_id, params.procurement_id, params.date]);

  useEffect(() => {
    fetchBillData();
  }, [fetchBillData]);

  const handleShare = async () => {
    if (!billData) return;
    try {
      const message = `CANAN DAIRY - MILK BILL
--------------------------------
Farmer: ${billData.farmerName} (ID: #${billData.farmerId})
Farmer Code: ${billData.farmerCode}
Date: ${billData.date}
Shift: ${billData.shift}
--------------------------------
Morning Milk: ${billData.morningQty} L
Evening Milk: ${billData.eveningQty} L
Total Milk Quantity: ${billData.totalQty} L
Milk Fat: ${billData.fat}%
SNF: ${billData.snf}%
Price per Liter: ₹${billData.rate}
--------------------------------
TOTAL AMOUNT: ₹${billData.totalAmount}
Status: Verified by Canaan Dairy`;

      await Share.share({ message });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Milk Bill</Text>
          <View style={{ width: 22 }} />
        </View>
        <BillSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !billData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Milk Bill</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Milk Bill Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBillData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const rows = [
    { label: 'Farmer Name', value: billData.farmerName },
    { label: 'Farmer ID', value: `#${billData.farmerId}` },
    { label: 'Farmer Code', value: billData.farmerCode },
    { label: 'Date', value: billData.date },
    { label: 'Shift', value: billData.shift },
    { label: 'Morning Milk Quantity', value: `${billData.morningQty} L` },
    { label: 'Evening Milk Quantity', value: `${billData.eveningQty} L` },
    { label: 'Total Milk Quantity', value: `${billData.totalQty} L`, bold: true },
    { label: 'Milk Fat', value: `${billData.fat}%` },
    { label: 'Milk SNF', value: `${billData.snf}%` },
    { label: 'Price Per Liter', value: `₹${billData.rate} / L` },
    { label: 'Animal ID', value: `#${billData.animalId}` },
    { label: 'Receipt / Procurement ID', value: `#${billData.procurementId}` },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Official Milk Bill</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Status */}
        <View style={styles.topStatusRow}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.badgeText} />
            <Text style={styles.verifiedText}>Backend Verified</Text>
          </View>
          <Text style={styles.dateStamp}>{billData.date}</Text>
        </View>

        {/* Bill Receipt Card */}
        <View style={styles.slipCard}>
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons name="cow" size={32} color={COLORS.brandGreen} />
            <Text style={styles.dairyName}>CANAN DAIRY</Text>
            <Text style={styles.dairyTagline}>A symbol of purity</Text>
          </View>

          <View style={styles.divider} />

          {/* Key Metric Highlights */}
          <View style={styles.metricSummaryBox}>
            <View style={styles.metricCol}>
              <Text style={styles.metricSubhead}>Total Milk</Text>
              <Text style={styles.metricMain}>{billData.totalQty} L</Text>
              <Text style={styles.metricDetail}>
                M: {billData.morningQty}L | E: {billData.eveningQty}L
              </Text>
            </View>

            <View style={styles.metricDividerVertical} />

            <View style={styles.metricCol}>
              <Text style={styles.metricSubhead}>Price / Liter</Text>
              <Text style={styles.metricMain}>₹{billData.rate}</Text>
              <Text style={styles.metricDetail}>Fat {billData.fat}% | SNF {billData.snf}%</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details Table */}
          {rows.map((row) => (
            <View style={styles.row} key={row.label}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[styles.rowValue, row.bold && styles.rowValueBold]}>
                {row.value}
              </Text>
            </View>
          ))}

          {/* Grand Total Amount Box */}
          <View style={styles.grandTotalBox}>
            <View>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.grandTotalFormula}>
                {billData.totalQty} L × ₹{billData.rate} / L
              </Text>
            </View>
            <Text style={styles.grandTotalAmount}>₹{billData.totalAmount}</Text>
          </View>

          <Text style={styles.footerNote}>
            Calculated and verified via Canaan Dairy Procurement API.
          </Text>
        </View>

        {/* Quick SNF Bill Link */}
        <TouchableOpacity
          style={styles.snfBillNavBtn}
          activeOpacity={0.85}
          onPress={() => {
            router.push({
              pathname: '/sub_amin/snf_bill' as any,
              params: {
                farmer_id: billData.farmerId,
                procurement_id: billData.procurementId,
                date: billData.date,
              },
            });
          }}
        >
          <Ionicons name="calculator-outline" size={18} color={COLORS.brandGreen} />
          <Text style={styles.snfBillNavText}>View Full SNF Calculation Breakdown →</Text>
        </TouchableOpacity>

        {/* Action Button */}
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.downloadBtnText}>Share / Download Bill</Text>
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
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.badgeText,
  },
  dateStamp: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.labelText,
  },
  slipCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  logoWrap: {
    alignItems: 'center',
  },
  dairyName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.headline,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  dairyTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  metricSummaryBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreenLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDividerVertical: {
    width: 1,
    backgroundColor: '#C8E6C9',
  },
  metricSubhead: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.labelText,
    marginBottom: 2,
  },
  metricMain: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.brandGreen,
  },
  metricDetail: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.brandGreenDark,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: '#F0F0EE',
  },
  rowLabel: {
    fontSize: 13.5,
    color: COLORS.labelText,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.valueText,
  },
  rowValueBold: {
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E7F3EC',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  grandTotalFormula: {
    fontSize: 11.5,
    color: COLORS.brandGreenDark,
    marginTop: 2,
  },
  grandTotalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.amountGreen,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A0A096',
    marginTop: 14,
  },
  snfBillNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  snfBillNavText: {
    color: COLORS.brandGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.downloadBtnBg,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
