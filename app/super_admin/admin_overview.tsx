
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getSubadminById, deleteSubadmin, SubadminItem } from '@/src/services/dairyApi';
import { AdminOverviewSkeleton } from '@/components/Shimmer';

interface AdminDetails extends SubadminItem {
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

const formatDate = (raw: string) => {
  if (!raw) return '-';

  const date = new Date(raw.replace(' ', 'T'));

  if (isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminOverview() {
  const { width } = useWindowDimensions();

  const { admin_id } = useLocalSearchParams<{
    admin_id: string;
  }>();

  const [adminDetails, setAdminDetails] =
    useState<AdminDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fetchAdminDetails = async (force = false) => {
    if (!admin_id) {
      setLoading(false);
      setError(true);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      const data = await getSubadminById(admin_id, force);

      if (data) {
        setAdminDetails(data as AdminDetails);
      } else {
        setError(true);
      }
    } catch (error) {
      console.log('Fetch Admin Error:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, [admin_id]);

  const [deleting, setDeleting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleUpdate = () => {
    router.push({
      pathname: '/super_admin/update_admin',
      params: {
        admin_id: admin_id,
      },
    });
  };

  const confirmDeleteSubadmin = () => {
    Alert.alert(
      'Delete Sub Admin',
      `Are you sure you want to delete "${adminDetails?.admin_name || 'this sub admin'}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!admin_id) return;
            setDeleting(true);
            try {
              const res = await deleteSubadmin(admin_id);
              const isOk =
                res?.status === 200 ||
                (res?.status as any) === '200' ||
                (res?.status as any) === true;
              if (isOk) {
                Alert.alert('Deleted', res?.message || 'Sub Admin deleted successfully.', [
                  { text: 'OK', onPress: () => router.replace('/super_admin/super') },
                ]);
              } else {
                Alert.alert('Delete Failed', res?.message || 'Could not delete sub admin.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete sub admin.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#161616" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <AdminOverviewSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !adminDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color="#F44336"
            />
          </View>

          <Text style={styles.errorTitle}>
            Unable to load details
          </Text>

          <Text style={styles.errorText}>
            We couldn't retrieve the sub admin information.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchAdminDetails(true)}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#fff"
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backErrorButton}
            onPress={handleBack}
          >
            <Text style={styles.backErrorText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = adminDetails.status === '1';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Sub Admin Overview
          </Text>

          <Text style={styles.headerSubtitle}>
            Administrator Details
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerEditButton}
          onPress={handleUpdate}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={19}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: width < 600 ? 18 : 30,
          },
        ]}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {adminDetails.photo && !imageError ? (
              <Image
                source={{
                  uri: adminDetails.photo,
                }}
                style={styles.profileImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Ionicons
                  name="person"
                  size={58}
                  color="#777"
                />
              </View>
            )}

            {/* Online/Status indicator */}
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: isActive
                    ? '#4CAF50'
                    : '#F44336',
                },
              ]}
            />
          </View>

          <Text
            style={styles.profileName}
            numberOfLines={2}
          >
            {adminDetails.admin_name || 'Sub Admin'}
          </Text>

          <Text style={styles.profileRole}>
            Sub Administrator
          </Text>

          <View
            style={[
              styles.profileStatus,
              isActive
                ? styles.activeStatus
                : styles.inactiveStatus,
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

            <Text
              style={[
                styles.profileStatusText,
                {
                  color: isActive
                    ? '#2E7D32'
                    : '#C62828',
                },
              ]}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Contact Information
          </Text>

          {/* Mobile */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Mobile Number
              </Text>

              <Text style={styles.detailValue}>
                {adminDetails.mobile_number || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Email Address
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={2}
              >
                {adminDetails.email || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Address */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Address
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={4}
              >
                {adminDetails.address || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Account Information
          </Text>

          {/* Admin ID */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Admin ID
              </Text>

              <Text style={styles.detailValue}>
                {adminDetails.admin_id || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Created Date */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Created On
              </Text>

              <Text style={styles.detailValue}>
                {formatDate(adminDetails.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Role */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#4CAF50"
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Role
              </Text>

              <Text style={styles.detailValue}>
                Sub Administrator
              </Text>
            </View>
          </View>
        </View>

        {/* Collection & Procurement Statistics Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Procurement & Milk Collection</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Collections</Text>
              <Text style={styles.statValue}>{adminDetails.total_procurements ?? 0}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Milk</Text>
              <Text style={styles.statValue}>{adminDetails.total_liters !== undefined ? `${Number(adminDetails.total_liters).toFixed(1)} L` : '0 L'}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={[styles.statValue, { color: '#2E7D32' }]}>₹{adminDetails.total_amount !== undefined ? Number(adminDetails.total_amount).toFixed(2) : '0.00'}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Today's Milk</Text>
              <Text style={styles.statValue}>{adminDetails.today_liters !== undefined ? `${Number(adminDetails.today_liters).toFixed(1)} L` : '0 L'}</Text>
            </View>
          </View>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
          activeOpacity={0.85}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color="#fff"
          />

          <Text style={styles.updateButtonText}>
            Update Details
          </Text>
        </TouchableOpacity>

        {/* View Farmers Button */}
        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: '#1F5E4A', marginTop: 12 }]}
          onPress={() =>
            router.push({
              pathname: '/super_admin/myfarmers',
              params: {
                admin_id: String(admin_id || adminDetails?.admin_id || ''),
              },
            })
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color="#fff"
          />

          <Text style={styles.updateButtonText}>
            View Farmers
          </Text>
        </TouchableOpacity>

        {/* Delete Sub Admin Button */}
        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: '#C62828', marginTop: 12 }]}
          onPress={confirmDeleteSubadmin}
          disabled={deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name="trash-outline"
                size={20}
                color="#fff"
              />
              <Text style={styles.updateButtonText}>
                Delete Sub Admin
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: 25 }} />
      </ScrollView>
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
    height: 70,
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

  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },

  headerEditButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Scroll */
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 30,
  },

  /* Profile Card */
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 25,
    paddingHorizontal: 18,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
    marginBottom: 15,
  },

  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EDEDED',
    borderWidth: 4,
    borderColor: '#F1F1F1',
  },

  profileFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EEEEEE',
    borderWidth: 4,
    borderColor: '#D8D8D8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },

  profileName: {
    color: '#161616',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  profileRole: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },

  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },

  activeStatus: {
    backgroundColor: '#E8F5E9',
  },

  inactiveStatus: {
    backgroundColor: '#FBE9E7',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  profileStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Details Card */
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 17,
    marginBottom: 15,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  sectionTitle: {
    color: '#161616',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F8F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    lineHeight: 19,
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },

  /* Update */
  updateButton: {
    height: 48,
    backgroundColor: '#4CAF50',
    borderRadius: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },

  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#777',
  },

  /* Error */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#161616',
  },

  errorText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 20,
  },

  retryButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  backErrorButton: {
    marginTop: 12,
    paddingVertical: 8,
  },

  backErrorText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F7F9F6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EBE6',
  },
  statLabel: {
    fontSize: 11.5,
    color: '#6B6B60',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161616',
  },
});
