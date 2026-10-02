import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getProcurementById, getProcurementByFarmerId } from '@/src/services/dairyApi';
import { BillSkeleton } from '@/components/Shimmer';

const COLORS = {
  statusBarBg: '#161616',
  headline: '#161616',
  amber: '#B8791E',
  green: '#4CAF50',
  badgeBg: '#E8F5E9',
  badgeText: '#2E7D32',
  cardBorder: '#E2E6DF',
  labelText: '#6B6B60',
  valueText: '#161616',
  amountGreen: '#2E7D32',
  downloadBtnBg: '#4CAF50',
};

export default function MilkSlipScreen() {
  const params = useLocalSearchParams<{
    procurement_id?: string;
    farmer_id?: string;
    date?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [slip, setSlip] = useState({
    code: '0004',
    date: '25-09-2026',
    shift: 'Morning',
    srNo: '1',
    farmerName: 'Farmer',
    farmerId: '4',
    milk: 'Cow',
    liter: '10.00',
    fat: '4.50',
    snf: '8.50',
    rate: '35.00',
    amount: '350.00',
    time: '10:48:39',
  });

  useEffect(() => {
    async function loadData() {
      if (!params.procurement_id && !params.farmer_id) return;

      try {
        setLoading(true);
        if (params.procurement_id) {
          const res = await getProcurementById(params.procurement_id);
          const isOk =
            (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
            Boolean(res.procurement_data);
          if (isOk) {
            const p = res.procurement_data;
            const f = res.farmer_details;
            setSlip({
              code: p.code || f?.code || '-',
              date: p.created_at ? p.created_at.split(' ')[0] : 'Today',
              shift: p.shift,
              srNo: p.procurement_id,
              farmerName: f?.farmer_name || 'Farmer',
              farmerId: String(p.farmer_id || f?.farmer_id || '-'),
              milk: 'Cow',
              liter: p.liters,
              fat: p.fat,
              snf: p.snf,
              rate: p.rate,
              amount: p.amount || (parseFloat(p.liters) * parseFloat(p.rate)).toFixed(2),
              time: p.created_at ? p.created_at.split(' ')[1] || '10:00:00' : '10:00:00',
            });
            return;
          }
        }

        if (params.farmer_id) {
          const res = await getProcurementByFarmerId(params.farmer_id);
          const isOk =
            (res.status === 200 || (res.status as any) === '200' || (res.status as any) === true) &&
            Array.isArray(res.procurement_data) &&
            res.procurement_data.length > 0;
          if (isOk) {
            const group = params.date
              ? res.procurement_data.find((d) => d.date === params.date) || res.procurement_data[0]
              : res.procurement_data[0];

            const records = [
              ...(group.morning_shift?.records || []),
              ...(group.evening_shift?.records || []),
            ];

            if (records.length > 0) {
              const p = records[0];
              const f = res.farmer_details;
              const totalLiters = records.reduce((s, r) => s + (parseFloat(r.liters) || 0), 0);
              const totalAmt = records.reduce((s, r) => s + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * (parseFloat(r.rate) || 35)), 0);

              setSlip({
                code: p.code || f?.code || '-',
                date: group.date,
                shift: p.shift,
                srNo: p.procurement_id,
                farmerName: f?.farmer_name || 'Farmer',
                farmerId: String(params.farmer_id),
                milk: 'Cow',
                liter: totalLiters.toFixed(2),
                fat: p.fat,
                snf: p.snf,
                rate: p.rate,
                amount: totalAmt.toFixed(2),
                time: p.created_at ? p.created_at.split(' ')[1] || '10:00:00' : '10:00:00',
              });
            }
          }
        }
      } catch (err) {
        console.log('Error loading dynamic slip:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.procurement_id, params.farmer_id, params.date]);

  const handleShare = async () => {
    try {
      const message = `CANAN DAIRY - MILK SLIP
Code: ${slip.code}
Farmer: ${slip.farmerName} (ID: #${slip.farmerId})
Date: ${slip.date}
Shift: ${slip.shift}
Total Liters: ${slip.liter} L
Fat: ${slip.fat}% | SNF: ${slip.snf}%
Rate: ₹${slip.rate} / L
Total Amount: ₹${slip.amount}`;
      await Share.share({ message });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Code', value: slip.code },
    { label: 'Date', value: slip.date },
    { label: 'Shift', value: slip.shift },
    { label: 'Sr No', value: slip.srNo },
    { label: 'Milk', value: slip.milk },
    { label: 'Liter', value: slip.liter },
    { label: 'Fat', value: slip.fat },
    { label: 'SNF', value: slip.snf },
    { label: 'Rate', value: slip.rate },
    { label: 'Amount', value: `₹${slip.amount}`, highlight: true },
    { label: 'Time', value: slip.time },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Milk Slip</Text>
            <Text style={styles.headerSubtitle}>Receipt & Verification</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>
        <BillSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Milk Slip</Text>
          <Text style={styles.headerSubtitle}>Receipt & Verification</Text>
        </View>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Slip card */}
        <View style={styles.slipCard}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.dairyName}>CANAN DAIRY</Text>
              <Text style={styles.dairyTagline}>A symbol of purity</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {rows.map((row) => (
            <View style={styles.row} key={row.label}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text
                style={[
                  styles.rowValue,
                  row.highlight && styles.rowValueHighlight,
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Download / Share button */}
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.downloadBtnText}>Download / Share Slip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA',
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.badgeText,
  },
  slipCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dairyName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.headline,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dairyTagline: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.amber,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginTop: 18,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.labelText,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.valueText,
  },
  rowValueHighlight: {
    color: COLORS.amountGreen,
  },
  downloadBtn: {
    backgroundColor: COLORS.downloadBtnBg,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
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