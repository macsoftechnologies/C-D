import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  DimensionValue,
  ScrollView,
} from 'react-native';

interface ShimmerBlockProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * High-performance animated shimmer block with smooth opacity pulse.
 * Powered by React Native Animated with native driver for 60fps performance.
 */
export function ShimmerBlock({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: ShimmerBlockProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerBase,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton matching Farmer cards in My Farmers list screens
 */
export function FarmerCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`farmer-skel-${index}`} style={styles.card}>
          <View style={styles.row}>
            {/* Avatar circle */}
            <ShimmerBlock width={52} height={52} borderRadius={26} />

            <View style={styles.contentColumn}>
              {/* Name & Code */}
              <View style={styles.rowBetween}>
                <ShimmerBlock width="55%" height={16} borderRadius={4} />
                <ShimmerBlock width={64} height={18} borderRadius={10} />
              </View>

              {/* Mobile / Booth info */}
              <View style={[styles.row, { marginTop: 8 }]}>
                <ShimmerBlock width="40%" height={13} borderRadius={4} />
                <ShimmerBlock width="35%" height={13} borderRadius={4} style={{ marginLeft: 12 }} />
              </View>

              {/* Address / Date */}
              <ShimmerBlock width="70%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>

          {/* Action buttons row */}
          <View style={styles.cardFooter}>
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton matching SubAdmin cards in Super Admin Dashboard
 */
export function SubAdminCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`subadmin-skel-${index}`} style={styles.card}>
          <View style={styles.row}>
            <ShimmerBlock width={56} height={56} borderRadius={28} />
            <View style={[styles.contentColumn, { marginLeft: 14 }]}>
              <View style={styles.rowBetween}>
                <ShimmerBlock width="60%" height={18} borderRadius={4} />
                <ShimmerBlock width={50} height={18} borderRadius={10} />
              </View>
              <ShimmerBlock width="45%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
              <ShimmerBlock width="75%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>

          <View style={[styles.cardFooter, { marginTop: 16 }]}>
            <ShimmerBlock width="47%" height={36} borderRadius={8} />
            <ShimmerBlock width="47%" height={36} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton matching Farmer Overview screen
 */
export function FarmerOverviewSkeleton() {
  return (
    <ScrollView style={styles.fullScreen} showsVerticalScrollIndicator={false}>
      {/* Profile Header Banner Skeleton */}
      <View style={styles.overviewHeaderCard}>
        <View style={styles.centerAlign}>
          <ShimmerBlock width={80} height={80} borderRadius={40} />
          <ShimmerBlock width="50%" height={20} borderRadius={6} style={{ marginTop: 12 }} />
          <ShimmerBlock width="30%" height={14} borderRadius={4} style={{ marginTop: 6 }} />

          {/* Badge Chips */}
          <View style={[styles.row, { marginTop: 12 }]}>
            <ShimmerBlock width={80} height={24} borderRadius={12} />
            <ShimmerBlock width={90} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
          </View>
        </View>

        {/* Quick action buttons (Call, WhatsApp, Record Milk) */}
        <View style={[styles.rowBetween, { marginTop: 20 }]}>
          <ShimmerBlock width="22%" height={44} borderRadius={10} />
          <ShimmerBlock width="22%" height={44} borderRadius={10} />
          <ShimmerBlock width="22%" height={44} borderRadius={10} />
          <ShimmerBlock width="22%" height={44} borderRadius={10} />
        </View>
      </View>

      {/* Personal Info Card Skeleton */}
      <View style={[styles.card, { marginHorizontal: 16, marginTop: 14 }]}>
        <ShimmerBlock width="40%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={styles.gridRow}>
          <View style={{ width: '48%' }}>
            <ShimmerBlock width="60%" height={12} borderRadius={4} />
            <ShimmerBlock width="80%" height={15} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <View style={{ width: '48%' }}>
            <ShimmerBlock width="60%" height={12} borderRadius={4} />
            <ShimmerBlock width="80%" height={15} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 14 }]}>
          <View style={{ width: '48%' }}>
            <ShimmerBlock width="60%" height={12} borderRadius={4} />
            <ShimmerBlock width="90%" height={15} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <View style={{ width: '48%' }}>
            <ShimmerBlock width="60%" height={12} borderRadius={4} />
            <ShimmerBlock width="70%" height={15} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>

      {/* Animals Section Skeleton */}
      <View style={[styles.card, { marginHorizontal: 16, marginTop: 14 }]}>
        <View style={styles.rowBetween}>
          <ShimmerBlock width="40%" height={16} borderRadius={4} />
          <ShimmerBlock width={70} height={28} borderRadius={8} />
        </View>
        <View style={[styles.row, { marginTop: 14 }]}>
          <ShimmerBlock width={64} height={64} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ShimmerBlock width="50%" height={16} borderRadius={4} />
            <ShimmerBlock width="70%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
            <ShimmerBlock width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>

      {/* Procurement History Skeleton */}
      <View style={[styles.card, { marginHorizontal: 16, marginTop: 14, marginBottom: 30 }]}>
        <View style={styles.rowBetween}>
          <ShimmerBlock width="45%" height={16} borderRadius={4} />
          <ShimmerBlock width={80} height={28} borderRadius={8} />
        </View>
        <ShimmerBlock width="100%" height={40} borderRadius={8} style={{ marginTop: 14 }} />
        <ShimmerBlock width="100%" height={40} borderRadius={8} style={{ marginTop: 8 }} />
        <ShimmerBlock width="100%" height={40} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
    </ScrollView>
  );
}

/**
 * Skeleton matching Daily Procurement screen
 */
export function DailyProcurementSkeleton() {
  return (
    <View style={styles.fullScreen}>
      {/* Top Stat Cards Skeleton */}
      <View style={[styles.rowBetween, { paddingHorizontal: 16, marginTop: 14 }]}>
        <View style={[styles.card, { flex: 1, marginRight: 8, padding: 12 }]}>
          <ShimmerBlock width="60%" height={12} borderRadius={4} />
          <ShimmerBlock width="80%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.card, { flex: 1, marginHorizontal: 4, padding: 12 }]}>
          <ShimmerBlock width="60%" height={12} borderRadius={4} />
          <ShimmerBlock width="80%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.card, { flex: 1, marginLeft: 8, padding: 12 }]}>
          <ShimmerBlock width="60%" height={12} borderRadius={4} />
          <ShimmerBlock width="80%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Search / Filter Bar */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <ShimmerBlock width="100%" height={44} borderRadius={10} />
      </View>

      {/* Procurement items list */}
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={`proc-skel-${index}`} style={[styles.card, { marginBottom: 12 }]}>
            <View style={styles.rowBetween}>
              <View>
                <ShimmerBlock width={140} height={16} borderRadius={4} />
                <ShimmerBlock width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
              <ShimmerBlock width={70} height={20} borderRadius={10} />
            </View>

            <View style={[styles.rowBetween, { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2EC' }]}>
              <View>
                <ShimmerBlock width={60} height={11} borderRadius={4} />
                <ShimmerBlock width={70} height={15} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <View>
                <ShimmerBlock width={60} height={11} borderRadius={4} />
                <ShimmerBlock width={70} height={15} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <View>
                <ShimmerBlock width={60} height={11} borderRadius={4} />
                <ShimmerBlock width={80} height={16} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Skeleton matching Bill / Slip screens (Milk Bill, SNF Bill, Milk Slip)
 */
export function BillSkeleton() {
  return (
    <ScrollView style={styles.fullScreen} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { margin: 16, padding: 18 }]}>
        {/* Receipt Header */}
        <View style={styles.centerAlign}>
          <ShimmerBlock width={48} height={48} borderRadius={24} />
          <ShimmerBlock width="60%" height={20} borderRadius={6} style={{ marginTop: 12 }} />
          <ShimmerBlock width="40%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
        </View>

        <View style={[styles.rowBetween, { marginTop: 24, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEF2EC' }]}>
          <ShimmerBlock width={80} height={13} borderRadius={4} />
          <ShimmerBlock width={100} height={13} borderRadius={4} />
        </View>

        {/* Bill Rows */}
        <View style={{ marginTop: 16 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={`bill-row-${index}`} style={[styles.rowBetween, { marginBottom: 12 }]}>
              <ShimmerBlock width="35%" height={14} borderRadius={4} />
              <ShimmerBlock width="40%" height={14} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Total Box */}
        <View style={[styles.card, { backgroundColor: '#F0F7F2', marginTop: 16, padding: 14, borderColor: '#C8E6C9' }]}>
          <View style={styles.rowBetween}>
            <ShimmerBlock width="35%" height={16} borderRadius={4} />
            <ShimmerBlock width="45%" height={24} borderRadius={6} />
          </View>
        </View>

        {/* Print / Share Buttons */}
        <View style={[styles.rowBetween, { marginTop: 24 }]}>
          <ShimmerBlock width="48%" height={46} borderRadius={10} />
          <ShimmerBlock width="48%" height={46} borderRadius={10} />
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Skeleton matching Admin Overview screen
 */
export function AdminOverviewSkeleton() {
  return (
    <ScrollView style={styles.fullScreen} showsVerticalScrollIndicator={false}>
      <View style={[styles.overviewHeaderCard, { margin: 16 }]}>
        <View style={styles.centerAlign}>
          <ShimmerBlock width={84} height={84} borderRadius={42} />
          <ShimmerBlock width="55%" height={20} borderRadius={6} style={{ marginTop: 14 }} />
          <ShimmerBlock width="35%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          <ShimmerBlock width={80} height={24} borderRadius={12} style={{ marginTop: 10 }} />
        </View>
      </View>

      <View style={[styles.card, { marginHorizontal: 16 }]}>
        <ShimmerBlock width="40%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={`admin-info-${idx}`} style={[styles.row, { marginBottom: 14 }]}>
            <ShimmerBlock width={36} height={36} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ShimmerBlock width="30%" height={11} borderRadius={4} />
              <ShimmerBlock width="60%" height={15} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <ShimmerBlock width="100%" height={48} borderRadius={10} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#F5F7F4',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  shimmerBase: {
    backgroundColor: '#DDE5DC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E6DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E6DF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentColumn: {
    flex: 1,
    marginLeft: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EC',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
