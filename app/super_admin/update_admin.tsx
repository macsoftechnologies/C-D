import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const GET_SUB_ADMIN_URL =
  'http://macsof.in/milkmanagement/api/subadminbyid';

const UPDATE_SUB_ADMIN_URL =
  'http://macsof.in/milkmanagement/api/subadminupdate';

interface AdminDetails {
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

export default function UpdateSubAdmin() {
  const { width } = useWindowDimensions();

  const { admin_id } = useLocalSearchParams<{
    admin_id: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [adminDetails, setAdminDetails] =
    useState<AdminDetails | null>(null);

  // Form fields
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('1');

  // Image
  const [photo, setPhoto] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /*
   * Fetch admin details
   */
  const fetchAdminDetails = async () => {
    if (!admin_id) {
      setLoading(false);
      Alert.alert('Error', 'Admin ID is missing.');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        GET_SUB_ADMIN_URL,
        {
          admin_id: admin_id,
        },
        {
          headers: {
            'Auth-Key': 'canandairyApi',
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Admin Details:', response.data);

      if (
        response.data?.status === 200 &&
        response.data?.data
      ) {
        const data = Array.isArray(response.data.data)
          ? response.data.data[0]
          : response.data.data;

        setAdminDetails(data);

        setAdminName(data.admin_name || '');
        setEmail(data.email || '');
        setMobileNumber(data.mobile_number || '');
        setAddress(data.address || '');
        setRoleId(data.role_id || '');
        setStatus(data.status || '1');
        setPhoto(data.photo || '');
      } else {
        Alert.alert(
          'Error',
          'Unable to fetch admin details.'
        );
      }
    } catch (error) {
      console.log('Fetch Admin Error:', error);

      Alert.alert(
        'Error',
        'Something went wrong while loading admin details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, [admin_id]);

  /*
   * Image Picker
   */
  const handleChooseImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to select a profile photo.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.length > 0) {
        const imageUri = result.assets[0].uri;

        setSelectedImage(imageUri);
      }
    } catch (error) {
      console.log('Image Picker Error:', error);

      Alert.alert(
        'Error',
        'Unable to select image.'
      );
    }
  };

  /*
   * Remove newly selected image
   */
  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  /*
   * Validation
   */
  const validateForm = () => {
    if (!adminName.trim()) {
      Alert.alert(
        'Validation',
        'Please enter admin name.'
      );
      return false;
    }

    if (!mobileNumber.trim()) {
      Alert.alert(
        'Validation',
        'Please enter mobile number.'
      );
      return false;
    }

    if (mobileNumber.trim().length < 10) {
      Alert.alert(
        'Validation',
        'Please enter a valid mobile number.'
      );
      return false;
    }

    if (!email.trim()) {
      Alert.alert(
        'Validation',
        'Please enter email address.'
      );
      return false;
    }

    return true;
  };

  /*
   * Update Admin
   */
  const handleUpdateAdminDetails = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      /*
       * NOTE:
       * This sends the selected local image URI as "photo".
       *
       * If your backend requires actual multipart image upload,
       * use FormData instead. See note below.
       */
      const response = await axios.post(
        UPDATE_SUB_ADMIN_URL,
        {
          admin_id: admin_id,

          admin_name: adminName.trim(),

          email: email.trim(),

          mobile_number: mobileNumber.trim(),

          address: address.trim(),

          photo:
            selectedImage ||
            photo ||
            '',

          role_id: roleId,

          status: status,
        },
        {
          headers: {
            'Auth-Key': 'canandairyApi',
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(
        'Update Response:',
        response.data
      );

      if (
        response.data?.status === 200 ||
        response.data?.status === 201
      ) {
        Alert.alert(
          'Success',
          'Sub Admin details updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Update Failed',
          response.data?.message ||
            'Unable to update admin details.'
        );
      }
    } catch (error) {
      console.log(
        'Update Admin Error:',
        error
      );

      Alert.alert(
        'Error',
        'Something went wrong while updating the admin.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Back
   */
  const handleBack = () => {
    if (saving) return;

    router.back();
  };

  /*
   * Loading
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#4CAF50"
          />

          <Text style={styles.loadingText}>
            Loading admin details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * Image to display
   */
  const displayImage =
    selectedImage || photo;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={saving}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Update Sub Admin
            </Text>

            <Text style={styles.headerSubtitle}>
              Edit administrator details
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal:
                width < 600 ? 18 : 30,
            },
          ]}
        >
          {/* Profile Image Card */}
          <View style={styles.profileCard}>
            <View style={styles.imageWrapper}>
              {displayImage ? (
                <Image
                  source={{
                    uri: displayImage,
                  }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={styles.profileFallback}
                >
                  <Ionicons
                    name="person"
                    size={58}
                    color="#777"
                  />
                </View>
              )}

              {/* Camera Button */}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleChooseImage}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.photoTitle}>
              Profile Photo
            </Text>

            <Text style={styles.photoSubtitle}>
              Tap the camera icon to change photo
            </Text>

            {selectedImage && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color="#F44336"
                />

                <Text style={styles.removeImageText}>
                  Remove selected photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Information */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              Basic Information
            </Text>

            {/* Admin Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Admin Name
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#777"
                />

                <TextInput
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="Enter admin name"
                  placeholderTextColor="#aaa"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Mobile */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Mobile Number
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#777"
                />

                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#aaa"
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email Address
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#777"
                />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#aaa"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Address
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  styles.addressContainer,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#777"
                  style={styles.addressIcon}
                />

                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor="#aaa"
                  style={[
                    styles.input,
                    styles.addressInput,
                  ]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Account Settings */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              Account Settings
            </Text>

            {/* Role */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Role
              </Text>

              <View style={styles.readOnlyContainer}>
                <View
                  style={styles.readOnlyIcon}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#4CAF50"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.readOnlyTitle}
                  >
                    Sub Administrator
                  </Text>

                  <Text
                    style={styles.readOnlySubtitle}
                  >
                    Role ID: {roleId || '-'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Account Status
              </Text>

              <View style={styles.statusSelector}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    status === '1' &&
                      styles.statusOptionActive,
                  ]}
                  onPress={() =>
                    setStatus('1')
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      status === '1' &&
                        styles.radioActive,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusOptionText,
                      status === '1' &&
                        styles.statusActiveText,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    status === '0' &&
                      styles.statusOptionInactive,
                  ]}
                  onPress={() =>
                    setStatus('0')
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      status === '0' &&
                        styles.radioInactive,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusOptionText,
                      status === '0' &&
                        styles.statusInactiveText,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleUpdateAdminDetails}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />

                <Text style={styles.saveButtonText}>
                  Updating...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#fff"
                />

                <Text style={styles.saveButtonText}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 30 }} />
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
    marginLeft: 12,
    flex: 1,
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

  /* Scroll */
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 30,
  },

  /* Profile */
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 15,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  imageWrapper: {
    position: 'relative',
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#eee',
    borderWidth: 4,
    borderColor: '#f0f0f0',
  },

  profileFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#eee',
    borderWidth: 4,
    borderColor: '#d8d8d8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 3,
  },

  photoTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },

  photoSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 5,
  },

  removeImageText: {
    color: '#F44336',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Form Card */
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 17,
    marginBottom: 15,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 17,
  },

  /* Input */
  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    marginLeft: 9,
    color: '#222',
    fontSize: 13,
    minHeight: 45,
  },

  addressContainer: {
    alignItems: 'flex-start',
    paddingTop: 10,
    minHeight: 100,
  },

  addressIcon: {
    marginTop: 4,
  },

  addressInput: {
    minHeight: 80,
    paddingTop: 0,
  },

  /* Read Only */
  readOnlyContainer: {
    minHeight: 60,
    borderRadius: 10,
    backgroundColor: '#F7F9F7',
    borderWidth: 1,
    borderColor: '#E4EDE5',

    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  readOnlyIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  readOnlyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  readOnlySubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
  },

  /* Status */
  statusSelector: {
    flexDirection: 'row',
    gap: 10,
  },

  statusOption: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 9,

    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  statusOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F2',
  },

  statusOptionInactive: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F4',
  },

  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#BBB',
    marginRight: 8,
  },

  radioActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },

  radioInactive: {
    borderColor: '#F44336',
    backgroundColor: '#F44336',
  },

  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

  statusActiveText: {
    color: '#2E7D32',
  },

  statusInactiveText: {
    color: '#C62828',
  },

  /* Save */
  saveButton: {
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 11,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
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
});