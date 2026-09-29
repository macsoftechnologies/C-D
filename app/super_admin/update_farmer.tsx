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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { invalidateFarmerCache } from '@/src/services/dairyApi';

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

const GET_FARMER_BY_ID_URL =
  'http://macsof.in/milkmanagement/api/farmergetbyid';

const UPDATE_FARMER_URL =
  'http://macsof.in/milkmanagement/api/farmerupdate';

export default function UpdateFarmer() {
  const params = useLocalSearchParams<{
    farmer_id: string;
    admin_id?: string;
    farmer_name?: string;
    mobile_number?: string;
    aadhar_number?: string;
    address?: string;
    profile?: string;
  }>();

  const farmer_id = params.farmer_id;

  const [farmer, setFarmer] = useState<Farmer | null>(
    params.farmer_name
      ? {
          farmer_id: String(params.farmer_id || ''),
          farmer_name: params.farmer_name || '',
          mobile_number: params.mobile_number || '',
          profile: params.profile || '',
          aadhar_number: params.aadhar_number || '',
          address: params.address || '',
          status: '1',
          created_at: '',
          updated_at: '',
          admin_id: params.admin_id || '',
          code: '',
        }
      : null
  );
  const [loading, setLoading] = useState(!params.farmer_name);
  const [error, setError] = useState(false);

  const [farmerName, setFarmerName] = useState(params.farmer_name || '');
  const [mobileNumber, setMobileNumber] = useState(params.mobile_number || '');
  const [aadharNumber, setAadharNumber] = useState(params.aadhar_number || '');
  const [address, setAddress] = useState(params.address || '');

  // existing photo URL from the server (used for the preview until replaced)
  const [existingImage, setExistingImage] = useState<string | null>(params.profile || null);
  // newly picked photo (only sent to the API if the user changes it)
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(
    null
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /*
   * Fetch existing farmer and prefill the form
   */
  const fetchFarmerById = useCallback(async () => {
    if (!farmer_id) {
      setLoading(false);
      setError(true);
      return;
    }

    const safeFarmerId = Number(farmer_id);
    const url = GET_FARMER_BY_ID_URL;
    const method = 'POST';
    const headers = {
      'Auth-Key': 'canandairyApi',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    console.log('=== FARMER GET BY ID REQUEST ===');
    console.log('farmer_id:', safeFarmerId);
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Headers:', JSON.stringify(headers));
    console.log('================================');
    console.log('Farmer Get By ID URL:', url);

    try {
      setError(false);

      const response = await axios.post(
        url,
        {
          farmer_id: safeFarmerId,
        },
        {
          headers,
          timeout: 20000,
        }
      );

      console.log('Update Farmer Fetch Response:', response.data);

      if (response.data?.status === 200 && response.data?.data) {
        const data = Array.isArray(response.data.data)
          ? response.data.data[0]
          : response.data.data;

        if (data) {
          setFarmer(data);
          setFarmerName(data.farmer_name || '');
          setMobileNumber(data.mobile_number || '');
          setAadharNumber(data.aadhar_number || '');
          setAddress(data.address || '');
          setExistingImage(data.profile?.trim() ? data.profile : null);
          setError(false);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } catch (error) {
      console.log('Fetch Farmer Error:', error);
      if (!farmerName) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [farmer_id, farmerName]);

  useEffect(() => {
    setLoading(true);

    fetchFarmerById().finally(() => {
      setLoading(false);
    });
  }, [fetchFarmerById]);

  const handleBack = () => {
    router.back();
  };

  /*
   * Image Picker
   */
  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'Please allow photo library access to change the farmer photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setNewImage(result.assets[0]);
    }
  };

  /*
   * Validation
   */
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
      nextErrors.aadhar_number = 'Aadhaar number must be 12 digits';
    }

    if (!address.trim()) {
      nextErrors.address = 'Address is required';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  /*
   * Submit
   */
  const handleUpdateFarmer = async () => {
    if (!validate()) {
      return;
    }

    if (!farmer_id) {
      Alert.alert('Error', 'Missing farmer id. Please go back and try again.');
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

      const effectiveAdminId = params.admin_id || farmer?.admin_id || '';
      if (effectiveAdminId) {
        formData.append('admin_id', String(effectiveAdminId));
      }

      // Only send a new "image" field if the user actually picked one
      if (newImage && newImage.uri) {
        const uriParts = newImage.uri.split('.');
        const fileType = (uriParts[uriParts.length - 1] || 'jpg').toLowerCase();
        const extension = fileType === 'jpeg' ? 'jpg' : fileType;
        const mimeType = newImage.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');

        formData.append('image', {
          uri: Platform.OS === 'android' ? newImage.uri : newImage.uri.replace('file://', ''),
          name: `farmer_${farmer_id}_${Date.now()}.${extension}`,
          type: mimeType,
        } as any);
      }

      console.log('=== SUPER ADMIN FARMER UPDATE REQUEST ===');
      console.log('URL:', UPDATE_FARMER_URL);
      console.log('Method: POST');
      console.log('farmer_id:', farmer_id);
      console.log('farmer_name:', farmerName.trim());
      console.log('mobile_number:', mobileNumber.trim());
      console.log('aadhar_number:', aadharNumber.trim());
      console.log('address:', address.trim());
      console.log('admin_id:', effectiveAdminId);
      console.log('has newImage:', Boolean(newImage && newImage.uri));
      console.log('========================================');

      const response = await axios.post(UPDATE_FARMER_URL, formData, {
        headers: {
          'Auth-Key': 'canandairyApi',
          Accept: 'application/json',
        },
        transformRequest: (data: any) => data,
        timeout: 30000,
      });

      console.log('Super Admin Farmer Update Response:', response.data);

      const isSuccess =
        response.data?.status === 200 ||
        response.data?.status === '200' ||
        response.data?.status === true;

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
          'Error',
          response.data?.message || 'Could not update farmer. Please try again.'
        );
      }
    } catch (error: any) {
      console.log('Update Farmer Error (Super-Admin):', error);
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (error?.message === 'Network Error'
          ? 'Network error. Please verify your connection to the Canaan Dairy server.'
          : error?.message) ||
        'Something went wrong while updating the farmer.';
      Alert.alert('Error', serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const previewUri = newImage?.uri || existingImage;

  /*
   * Loading (initial fetch)
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Update Farmer</Text>

            <Text style={styles.headerSubtitle}>Farmer Registration</Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />

          <Text style={styles.loadingText}>Loading farmer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * Error (initial fetch failed)
   */
  if (error || !farmer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Update Farmer</Text>

            <Text style={styles.headerSubtitle}>Farmer Registration</Text>
          </View>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={42} color="#F44336" />
          </View>

          <Text style={styles.errorTitle}>Unable to load farmer</Text>

          <Text style={styles.errorText}>
            Something went wrong while retrieving this farmer's details.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchFarmerById}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />

            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Update Farmer</Text>

          <Text style={styles.headerSubtitle}>Farmer Registration</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Picker */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imagePicker}
              activeOpacity={0.85}
              onPress={pickImage}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={styles.imagePreview}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#777" />

                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </View>
              )}

              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Farmer Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Farmer Name</Text>

            <View
              style={[
                styles.inputWrapper,
                errors.farmer_name && styles.inputWrapperError,
              ]}
            >
              <Ionicons name="person-outline" size={18} color="#777" />

              <TextInput
                style={styles.input}
                placeholder="Enter farmer name"
                placeholderTextColor="#999"
                value={farmerName}
                onChangeText={(text) => {
                  setFarmerName(text);
                  if (errors.farmer_name) {
                    setErrors((prev) => ({ ...prev, farmer_name: undefined }));
                  }
                }}
              />
            </View>

            {errors.farmer_name && (
              <Text style={styles.errorMessage}>{errors.farmer_name}</Text>
            )}
          </View>

          {/* Mobile Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>

            <View
              style={[
                styles.inputWrapper,
                errors.mobile_number && styles.inputWrapperError,
              ]}
            >
              <Ionicons name="call-outline" size={18} color="#777" />

              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={10}
                value={mobileNumber}
                onChangeText={(text) => {
                  setMobileNumber(text.replace(/[^0-9]/g, ''));
                  if (errors.mobile_number) {
                    setErrors((prev) => ({
                      ...prev,
                      mobile_number: undefined,
                    }));
                  }
                }}
              />
            </View>

            {errors.mobile_number && (
              <Text style={styles.errorMessage}>{errors.mobile_number}</Text>
            )}
          </View>

          {/* Aadhaar Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Aadhaar Number</Text>

            <View
              style={[
                styles.inputWrapper,
                errors.aadhar_number && styles.inputWrapperError,
              ]}
            >
              <Ionicons name="card-outline" size={18} color="#777" />

              <TextInput
                style={styles.input}
                placeholder="12-digit Aadhaar number"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={12}
                value={aadharNumber}
                onChangeText={(text) => {
                  setAadharNumber(text.replace(/[^0-9]/g, ''));
                  if (errors.aadhar_number) {
                    setErrors((prev) => ({
                      ...prev,
                      aadhar_number: undefined,
                    }));
                  }
                }}
              />
            </View>

            {errors.aadhar_number && (
              <Text style={styles.errorMessage}>{errors.aadhar_number}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>

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
                color="#777"
                style={{ marginTop: 2 }}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter full address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  if (errors.address) {
                    setErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
              />
            </View>

            {errors.address && (
              <Text style={styles.errorMessage}>{errors.address}</Text>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleUpdateFarmer}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />

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
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },

  /* Form */
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  /* Image */
  imageSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  imagePicker: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#EEEEEE',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    position: 'relative',
  },

  imagePreview: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imagePlaceholderText: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    fontWeight: '600',
  },

  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  /* Fields */
  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },

  inputWrapperError: {
    borderColor: '#F44336',
  },

  textAreaWrapper: {
    height: 90,
    alignItems: 'flex-start',
    paddingTop: 12,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#161616',
  },

  textArea: {
    height: '100%',
    textAlignVertical: 'top',
  },

  errorMessage: {
    color: '#F44336',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },

  /* Submit */
  submitButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,

    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#777',
  },

  /* Error */
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#161616',
    fontSize: 18,
    fontWeight: '700',
  },

  errorText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 20,
  },

  retryButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
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
});