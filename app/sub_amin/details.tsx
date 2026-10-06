import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  changePassword,
  getSubadminById,
  addSubadminBankDetails,
  SubadminItem,
} from '@/src/services/dairyApi';
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
  const [subadmin, setSubadmin] = useState<SubadminItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Change Password state
  const [changePwdVisible, setChangePwdVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Bank Details state
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Fetch full Sub-Admin profile (including bank details)
  const fetchSubadminProfile = useCallback(async (adminIdToFetch: string, force = false) => {
    if (!adminIdToFetch) return;
    try {
      setLoadingDetails(true);
      const data = await getSubadminById(adminIdToFetch, force);
      if (data) {
        setSubadmin(data);
        setBankBranch(data.branch_name || '');
        setBankAccountHolder(data.account_holder_name || '');
        setBankAccountNumber(data.account_number || '');
        setBankIfsc(data.ifsc_code || '');
      }
    } catch (err) {
      console.log('Error fetching subadmin details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    let effectiveId = resolvedAdminId;
    if (!effectiveId) {
      getUserSession().then((session) => {
        if (session?.admin_id) {
          setResolvedAdminId(session.admin_id);
          fetchSubadminProfile(session.admin_id);
        }
      });
    } else {
      fetchSubadminProfile(effectiveId);
    }
  }, [resolvedAdminId, fetchSubadminProfile]);

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
          res?.result || res?.message || 'Failed to change password. Please verify current password.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong while updating password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!resolvedAdminId) {
      Alert.alert('Error', 'Sub Admin ID is missing.');
      return;
    }
    if (!bankAccountHolder.trim()) {
      Alert.alert('Validation', 'Please enter account holder name.');
      return;
    }
    if (!bankAccountNumber.trim()) {
      Alert.alert('Validation', 'Please enter account number.');
      return;
    }
    if (!bankIfsc.trim()) {
      Alert.alert('Validation', 'Please enter IFSC code.');
      return;
    }
    if (!bankBranch.trim()) {
      Alert.alert('Validation', 'Please enter branch name.');
      return;
    }

    try {
      setSavingBank(true);
      const res = await addSubadminBankDetails({
        admin_id: resolvedAdminId,
        branch_name: bankBranch.trim(),
        account_holder_name: bankAccountHolder.trim(),
        account_number: bankAccountNumber.trim(),
        ifsc_code: bankIfsc.trim().toUpperCase(),
      });

      const isOk =
        res?.status === 200 ||
        (res?.status as any) === '200' ||
        (res?.status as any) === true;

      if (isOk) {
        Alert.alert('Success', res?.message || 'Bank Details Successfully Added.', [
          {
            text: 'OK',
            onPress: () => {
              setBankModalVisible(false);
              fetchSubadminProfile(resolvedAdminId, true);
            },
          },
        ]);
      } else {
        Alert.alert('Failed', res?.message || 'Could not update bank details.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error while updating bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const details = [
    { label: 'Name', value: subadmin?.admin_name || name, icon: 'person-outline' as const },
    { label: 'Booth', value: booth || subadmin?.address || '-', icon: 'business-outline' as const },
    { label: 'Location', value: location || subadmin?.address || '-', icon: 'location-outline' as const },
    { label: 'Address', value: subadmin?.address || address, icon: 'home-outline' as const },
    { label: 'Phone Number', value: subadmin?.mobile_number || phone, icon: 'call-outline' as const },
    { label: 'Email', value: subadmin?.email || '-', icon: 'mail-outline' as const },
  ];

  const hasBankDetails = Boolean(
    subadmin?.account_number || subadmin?.ifsc_code || subadmin?.account_holder_name
  );

  // Navigate to Milk Collection page, carrying the sub admin's id/name along
  const handleViewMilkCollection = () => {
    (router.push as any)({
      pathname: '/sub_amin/milk_collection',
      params: { id: resolvedAdminId, name: subadmin?.admin_name || name },
    });
  };

  // Navigate to Milk Slip page
  const handleViewMilkSlip = () => {
    router.push({
      pathname: '/sub_amin/slip_collection',
      params: { id: resolvedAdminId, name: subadmin?.admin_name || name },
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
          <Text style={styles.headerSubtitle}>Account & Settlement Information</Text>
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

        {/* Bank Details Card */}
        <View style={styles.bankCard}>
          <View style={styles.bankCardHeader}>
            <View style={styles.bankTitleRow}>
              <MaterialCommunityIcons name="bank" size={20} color="#1F5E4A" />
              <Text style={styles.bankCardTitle}>Bank & Settlement Details</Text>
            </View>
            <TouchableOpacity
              style={styles.bankEditBtn}
              activeOpacity={0.8}
              onPress={() => setBankModalVisible(true)}
            >
              <Ionicons name="create-outline" size={15} color="#1F5E4A" />
              <Text style={styles.bankEditBtnText}>
                {hasBankDetails ? 'Edit' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingDetails ? (
            <ActivityIndicator size="small" color="#4CAF50" style={{ paddingVertical: 12 }} />
          ) : hasBankDetails ? (
            <View style={styles.bankFieldsWrap}>
              <View style={styles.bankFieldRow}>
                <Text style={styles.bankFieldLabel}>Account Holder</Text>
                <Text style={styles.bankFieldValue}>
                  {subadmin?.account_holder_name || '-'}
                </Text>
              </View>
              <View style={styles.bankFieldRow}>
                <Text style={styles.bankFieldLabel}>Account Number</Text>
                <Text style={[styles.bankFieldValue, { letterSpacing: 1 }]}>
                  {subadmin?.account_number || '-'}
                </Text>
              </View>
              <View style={styles.bankFieldRow}>
                <Text style={styles.bankFieldLabel}>IFSC Code</Text>
                <Text style={[styles.bankFieldValue, { textTransform: 'uppercase' }]}>
                  {subadmin?.ifsc_code || '-'}
                </Text>
              </View>
              <View style={styles.bankFieldRow}>
                <Text style={styles.bankFieldLabel}>Branch</Text>
                <Text style={styles.bankFieldValue}>
                  {subadmin?.branch_name || '-'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.bankEmptyWrap}>
              <Text style={styles.bankEmptyText}>No bank details added yet.</Text>
              <TouchableOpacity
                style={styles.bankAddFirstBtn}
                activeOpacity={0.85}
                onPress={() => setBankModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.bankAddFirstBtnText}>Add Bank Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Password row with show/hide toggle */}
        <View style={styles.detailRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#4CAF50" />
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <Text style={styles.detailValue}>
                {showPassword ? (password || '123456') : '••••••••'}
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

      {/* Bank Details Modal */}
      <Modal
        visible={bankModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !savingBank && setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="bank" size={20} color="#1F5E4A" />
                <Text style={styles.modalTitle}>
                  {hasBankDetails ? 'Update Bank Details' : 'Add Bank Details'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !savingBank && setBankModalVisible(false)}
                disabled={savingBank}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Bank details are used for official Canaan Dairy settlements.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.modalInput}
                value={bankAccountHolder}
                onChangeText={setBankAccountHolder}
                placeholder="e.g. John Doe"
                placeholderTextColor="#999"
                editable={!savingBank}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Account Number</Text>
              <TextInput
                style={styles.modalInput}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="e.g. 0009998788"
                placeholderTextColor="#999"
                keyboardType="numeric"
                editable={!savingBank}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>IFSC Code</Text>
              <TextInput
                style={styles.modalInput}
                value={bankIfsc}
                onChangeText={(t) => setBankIfsc(t.toUpperCase())}
                placeholder="e.g. UBIN0980"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                editable={!savingBank}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Branch Name</Text>
              <TextInput
                style={styles.modalInput}
                value={bankBranch}
                onChangeText={setBankBranch}
                placeholder="e.g. Kirlampudi"
                placeholderTextColor="#999"
                editable={!savingBank}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBankModalVisible(false)}
                disabled={savingBank}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingBank && styles.btnDisabled]}
                onPress={handleSaveBankDetails}
                disabled={savingBank}
              >
                {savingBank ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161616',
  },
  bankEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  bankEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F5E4A',
  },
  bankFieldsWrap: {
    gap: 8,
  },
  bankFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bankFieldLabel: {
    fontSize: 12,
    color: '#888',
  },
  bankFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161616',
  },
  bankEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  bankEmptyText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  bankAddFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F5E4A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bankAddFirstBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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