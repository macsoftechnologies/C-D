import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function SubAdminDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    booth?: string;
    location?: string;
    address?: string;
    phone?: string;
    password?: string;
  }>();

  // Safe, always-string versions of each param
  const {
    id = '',
    name = '',
    booth = '',
    location = '',
    address = '',
    phone = '',
    password = '',
  } = params;

  const [showPassword, setShowPassword] = useState(false);

  const details = [
    { label: 'Name', value: name, icon: 'person-outline' as const },
    { label: 'Booth', value: booth, icon: 'business-outline' as const },
    { label: 'Location', value: location, icon: 'location-outline' as const },
    { label: 'Address', value: address, icon: 'home-outline' as const },
    { label: 'Phone Number', value: phone, icon: 'call-outline' as const },
  ];

  // Navigate to Milk Collection page, carrying the sub admin's id/name along
  const handleViewMilkCollection = () => {
    (router.push as any)({
      pathname: '/sub_amin/milk_collection',
      params: { id, name },
    });
  };

  // Navigate to Milk Slip page
  const handleViewMilkSlip = () => {
    router.push({
      pathname: '/sub_amin/slip_collection',
      params: { id, name },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#161616" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sub Admin Details</Text>
          <Text style={styles.headerSubtitle}>Account Information</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {details.map((item) => (
          <View style={styles.detailRow} key={item.label}>
            <Ionicons name={item.icon} size={18} color="#4CAF50" />
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          </View>
        ))}

        {/* Password row with show/hide toggle */}
        <View style={styles.detailRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#4CAF50" />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <Text style={styles.detailValue}>
                {showPassword ? password : '••••••••'}
              </Text>
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsWrap}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleViewMilkCollection}>
            <Ionicons name="water-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>View Milk Collection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleViewMilkSlip}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>View Milk Slip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#161616',
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsWrap: {
    marginTop: 10,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});