import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { changePassword } from '@/src/services/dairyApi';
import { getUserSession } from '@/src/authStorage';

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
  const [resolvedAdminId, setResolvedAdminId] = useState(id);

  // Change Password state
  const [changePwdVisible, setChangePwdVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!resolvedAdminId) {
      getUserSession().then((session) => {
        if (session?.admin_id) {
          setResolvedAdminId(session.admin_id);
        }
      });
    }
  }, [resolvedAdminId]);

  const handleChangePasswordSubmit = async () => {
    if (!resolvedAdminId) {
      Alert.alert('Error', 'Sub Admin ID could not be determined.');
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert('Validation', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      Alert.alert('Validation', 'New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New password and confirmation do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await changePassword(
        resolvedAdminId,
        currentPassword.trim(),
        newPassword.trim()
      );

      if (res?.status === 200 || res?.status === '200' || res?.status === true) {
        Alert.alert(
          'Success',
          res?.message || 'Password changed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setChangePwdVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Failed',
          res?.message || res?.result || 'Failed to change password. Please verify current password.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong while updating password.');
    } finally {
      setChangingPassword(false);
    }
  };

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
              <Text style={styles.detailValue}>{item.value || '-'}</Text>
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

        {/* Change Password Trigger Button */}
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => setChangePwdVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="key-outline" size={18} color="#2E7D32" />
          <Text style={styles.changePasswordBtnText}>Change Account Password</Text>
        </TouchableOpacity>

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

      {/* Change Password Modal */}
      <Modal
        visible={changePwdVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !changingPassword && setChangePwdVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => !changingPassword && setChangePwdVisible(false)}
                disabled={changingPassword}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Update your account password using the secure dairy management API.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!changingPassword}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!changingPassword}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!changingPassword}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setChangePwdVisible(false)}
                disabled={changingPassword}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, changingPassword && styles.btnDisabled]}
                onPress={handleChangePasswordSubmit}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingVertical: 13,
    marginBottom: 14,
    gap: 8,
  },
  changePasswordBtnText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161616',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#161616',
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  modalCancelBtnText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    minWidth: 80,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});