import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getUserSession } from '@/src/authStorage';
import { getFarmerById, updateFarmer, invalidateFarmerCache } from '@/src/services/dairyApi';

interface Farmer {
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

interface FormErrors {
  farmer_name?: string;
  mobile_number?: string;
  aadhar_number?: string;
  address?: string;
}


const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  brandDark: '#161616',
  brandGreen: '#1F5E4A',
  brandGreenLight: '#E8F5E9',
  brandGreenDark: '#174738',
  headline: '#161616',
  subtitle: '#6B6B60',
  textDark: '#161616',
  textMuted: '#8E8E93',
  border: '#E2E6DF',
  danger: '#D32F2F',
  dangerLight: '#FFEBEE',
};

export default function SubAdminUpdateFarmer() {
  const { farmer_id, admin_id: paramAdminId } = useLocalSearchParams<{
    farmer_id: string;
    admin_id?: string;
  }>();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [adminId, setAdminId] = useState(paramAdminId || '');
  const [farmerName, setFarmerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [address, setAddress] = useState('');

  // Existing photo URL from backend
  const [existingImage, setExistingImage] = useState<string | null>(null);
  // Newly picked image
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch current farmer data and pre-fill form
  const fetchFarmerById = useCallback(async () => {
    if (!farmer_id) {
      setLoading(false);
      setError(true);
      setErrorMessage('Missing farmer ID.');
      return;
    }

    try {
      setError(false);
      setErrorMessage('');

      // Get logged-in admin session fallback
      if (!adminId) {
        const session = await getUserSession();
        if (session?.admin_id) {
          setAdminId(session.admin_id);
        }
      }

      const data = await getFarmerById(String(farmer_id));

      if (data) {
        setFarmer(data);
        setFarmerName(data.farmer_name || '');
        setMobileNumber(data.mobile_number || '');
        setAadharNumber(data.aadhar_number || '');
        setAddress(data.address || '');
        if (data.admin_id) setAdminId(data.admin_id);
        setExistingImage(data.profile?.trim() ? data.profile : null);
      } else {
        setError(true);
        setErrorMessage('Farmer not found.');
      }
    } catch (err: any) {
      console.log('Update Farmer Fetch Error (Sub-Admin):', err);
      setError(true);
      setErrorMessage('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [farmer_id, adminId]);

  useEffect(() => {
    fetchFarmerById();
  }, [fetchFarmerById]);

  const handleBack = () => {
    router.back();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'Please allow photo library access to change the farmer photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setNewImage(result.assets[0]);
    }
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!farmerName.trim()) {
      nextErrors.farmer_name = 'Farmer name is required';
    }

    if (!mobileNumber.trim()) {
      nextErrors.mobile_number = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      nextErrors.mobile_number = 'Enter a valid 10-digit mobile number';
    }

    if (!aadharNumber.trim()) {
      nextErrors.aadhar_number = 'Aadhaar number is required';
    } else if (!/^\d{12}$/.test(aadharNumber.trim())) {
      nextErrors.aadhar_number = 'Aadhaar number must be exactly 12 digits';
    }

    if (!address.trim()) {
      nextErrors.address = 'Village / Address is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Farmer Update API submission
  const handleUpdateFarmer = async () => {
    if (!validate()) return;

    if (!farmer_id) {
      Alert.alert('Error', 'Missing farmer ID.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('farmer_id', String(farmer_id));
      formData.append('farmer_name', farmerName.trim());
      formData.append('mobile_number', mobileNumber.trim());
      formData.append('aadhar_number', aadharNumber.trim());
      formData.append('address', address.trim());

      let effectiveAdminId = adminId || farmer?.admin_id || '';
      if (!effectiveAdminId) {
        const session = await getUserSession();
        effectiveAdminId = session?.admin_id ? String(session.admin_id) : '';
      }
      if (effectiveAdminId) {
        formData.append('admin_id', String(effectiveAdminId));
      }

      // If user selected a new photo, append it
      if (newImage && newImage.uri) {
        const uriParts = newImage.uri.split('.');
        const fileType = (uriParts[uriParts.length - 1] || 'jpg').toLowerCase();
        const extension = fileType === 'jpeg' ? 'jpg' : fileType;
        const mimeType =
          newImage.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');

        formData.append('image', {
          uri: Platform.OS === 'android' ? newImage.uri : newImage.uri.replace('file://', ''),
          name: `farmer_${farmer_id}_${Date.now()}.${extension}`,
          type: mimeType,
        } as any);
      }

      console.log('=== FARMER UPDATE REQUEST ===');
      console.log('URL: /farmerupdate');
      console.log('Method: POST');
      console.log('farmer_id:', farmer_id);
      console.log('farmer_name:', farmerName.trim());
      console.log('mobile_number:', mobileNumber.trim());
      console.log('aadhar_number:', aadharNumber.trim());
      console.log('address:', address.trim());
      console.log('admin_id:', effectiveAdminId);
      console.log('has newImage:', Boolean(newImage && newImage.uri));
      console.log('=============================');

      const response = await updateFarmer(formData);

      console.log('Farmer Update Response:', response);

      const isSuccess =
        response?.status === 200 ||
        (response?.status as any) === '200' ||
        (response?.status as any) === true;

      if (isSuccess) {
        invalidateFarmerCache();
        Alert.alert('Success', response.data?.message || 'Farmer updated successfully.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert(
          'Update Failed',
          response.data?.message || 'Could not update farmer. Please try again.'
        );
      }
    } catch (err: any) {
      console.log('Update Farmer Error (Sub-Admin):', err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.message === 'Network Error'
          ? 'Network error. Please verify your connection to the Canaan Dairy server.'
          : err?.message) ||
        'Something went wrong while updating the farmer.';
      Alert.alert('Update Error', serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Update Farmer</Text>
            <Text style={styles.headerSubtitle}>Sub-Admin Portal</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
          <Text style={styles.loadingText}>Loading farmer information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !farmer) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Update Farmer</Text>
            <Text style={styles.headerSubtitle}>Sub-Admin Portal</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Unable to load farmer</Text>
          <Text style={styles.errorText}>
            {errorMessage || 'Farmer record not found.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFarmerById}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Display photo priority: newImage > existingImage
  const displayImageUri = newImage?.uri || existingImage;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Update Farmer</Text>
          <Text style={styles.headerSubtitle}>
            Farmer #{farmer.code || farmer.farmer_id}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Section */}
          <View style={styles.photoCard}>
            <View style={styles.avatarWrapper}>
              {displayImageUri ? (
                <Image
                  source={{ uri: displayImageUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={50} color={COLORS.brandGreen} />
                </View>
              )}

              <TouchableOpacity
                style={styles.cameraBadge}
                activeOpacity={0.8}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={16} color={COLORS.brandGreen} />
              <Text style={styles.changePhotoText}>
                {newImage ? 'Change Selected Photo' : 'Upload New Photo'}
              </Text>
            </TouchableOpacity>

            {newImage ? (
              <TouchableOpacity
                style={styles.resetPhotoBtn}
                onPress={() => setNewImage(null)}
              >
                <Text style={styles.resetPhotoText}>Discard New Photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            {/* Farmer Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Farmer Full Name *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.farmer_name && styles.inputWrapperError,
                ]}
              >
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter farmer name"
                  placeholderTextColor={COLORS.textMuted}
                  value={farmerName}
                  onChangeText={(text) => {
                    setFarmerName(text);
                    if (errors.farmer_name) {
                      setErrors((prev) => ({ ...prev, farmer_name: undefined }));
                    }
                  }}
                />
              </View>
              {errors.farmer_name ? (
                <Text style={styles.fieldError}>{errors.farmer_name}</Text>
              ) : null}
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number (10 digits) *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.mobile_number && styles.inputWrapperError,
                ]}
              >
                <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={COLORS.textMuted}
                  value={mobileNumber}
                  onChangeText={(text) => {
                    setMobileNumber(text);
                    if (errors.mobile_number) {
                      setErrors((prev) => ({ ...prev, mobile_number: undefined }));
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.mobile_number ? (
                <Text style={styles.fieldError}>{errors.mobile_number}</Text>
              ) : null}
            </View>

            {/* Aadhaar Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Aadhaar Card Number (12 digits) *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.aadhar_number && styles.inputWrapperError,
                ]}
              >
                <Ionicons name="card-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 123456789012"
                  placeholderTextColor={COLORS.textMuted}
                  value={aadharNumber}
                  onChangeText={(text) => {
                    setAadharNumber(text);
                    if (errors.aadhar_number) {
                      setErrors((prev) => ({ ...prev, aadhar_number: undefined }));
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>
              {errors.aadhar_number ? (
                <Text style={styles.fieldError}>{errors.aadhar_number}</Text>
              ) : null}
            </View>

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Village / Address *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  errors.address && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginTop: 2 }}
                />
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter village, mandal, or district"
                  placeholderTextColor={COLORS.textMuted}
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    if (errors.address) {
                      setErrors((prev) => ({ ...prev, address: undefined }));
                    }
                  }}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address ? (
                <Text style={styles.fieldError}>{errors.address}</Text>
              ) : null}
            </View>

            {/* Readonly Sub-Admin ID */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Assigned Sub-Admin ID</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={COLORS.brandGreen}
                />
                <TextInput
                  style={[styles.textInput, { color: COLORS.headline }]}
                  value={`Admin ID: #${adminId || farmer.admin_id}`}
                  editable={false}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleUpdateFarmer}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    height: 70,
    backgroundColor: COLORS.brandDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  backButton: {
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
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#999999',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  photoCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDEDED',
    borderWidth: 3,
    borderColor: COLORS.brandGreenLight,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandGreen,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.brandGreenLight,
    gap: 6,
    marginTop: 4,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  resetPhotoBtn: {
    marginTop: 8,
  },
  resetPhotoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.headline,
    marginBottom: 7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  inputDisabled: {
    backgroundColor: '#EEEEEE',
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  textAreaWrapper: {
    height: 'auto',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  fieldError: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.subtitle,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.headline,
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
