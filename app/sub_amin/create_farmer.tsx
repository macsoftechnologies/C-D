import React, { useState, useEffect } from 'react';
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
import { createFarmer, invalidateFarmerCache } from '@/src/services/dairyApi';

const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  brandDark: '#161616',
  brandGreen: '#1F5E4A',
  brandGreenLight: '#E8F5E9',
  brandGreenBorder: '#C8E6C9',
  headline: '#161616',
  subtitle: '#6B6B60',
  textDark: '#161616',
  border: '#E2E6DF',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
};

// Use HTTPS
const FARMER_CREATE_URL =
  'http://macsof.in/milkmanagement/api/farmercreate';

interface FormErrors {
  farmer_name?: string;
  mobile_number?: string;
  aadhar_number?: string;
  address?: string;
}

export default function SubAdminCreateFarmer() {
  const params = useLocalSearchParams<{ admin_id?: string }>();
  const [adminId, setAdminId] = useState<string>(params.admin_id ? String(params.admin_id) : '');

  const [farmerName, setFarmerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [address, setAddress] = useState('');

  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const session = await getUserSession();
        console.log('SUB ADMIN SESSION:', session);

        if (!adminId && session?.admin_id) {
          setAdminId(String(session.admin_id));
        } else if (!adminId && !session?.admin_id) {
          Alert.alert(
            'Session Error',
            'Sub-Admin session not found. Please login again.'
          );
        }
      } catch (error) {
        console.log('LOAD ADMIN SESSION ERROR:', error);
      }
    };

    loadAdmin();
  }, [adminId]);

  

  const handleBack = () => {
    router.back();
  };

  

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to upload a farmer photo.'
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
        console.log('SELECTED IMAGE:', result.assets[0]);
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.log('IMAGE PICKER ERROR:', error);

      Alert.alert(
        'Error',
        'Unable to select the image.'
      );
    }
  };

  
  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!farmerName.trim()) {
      nextErrors.farmer_name =
        'Farmer name is required';
    }

    if (!mobileNumber.trim()) {
      nextErrors.mobile_number =
        'Mobile number is required';
    } else if (
      !/^[6-9]\d{9}$/.test(
        mobileNumber.trim()
      )
    ) {
      nextErrors.mobile_number =
        'Enter a valid 10-digit mobile number';
    }

    if (!aadharNumber.trim()) {
      nextErrors.aadhar_number =
        'Aadhaar number is required';
    } else if (
      !/^\d{12}$/.test(
        aadharNumber.trim()
      )
    ) {
      nextErrors.aadhar_number =
        'Aadhaar number must be exactly 12 digits';
    }

    if (!address.trim()) {
      nextErrors.address =
        'Village / Address is required';
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  

  const handleCreateFarmer = async () => {
    if (!validate()) {
      return;
    }

    if (!adminId) {
      Alert.alert(
        'Error',
        'Sub-Admin session not found. Please log in again.'
      );
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      // Required fields
      formData.append(
        'farmer_name',
        farmerName.trim()
      );

      formData.append(
        'mobile_number',
        mobileNumber.trim()
      );

      formData.append(
        'aadhar_number',
        aadharNumber.trim()
      );

      formData.append(
        'address',
        address.trim()
      );

      // Sub-admin ID
      let effectiveAdminId = adminId;
      if (!effectiveAdminId) {
        const session = await getUserSession();
        effectiveAdminId = session?.admin_id ? String(session.admin_id) : '';
      }

      if (!effectiveAdminId) {
        Alert.alert('Session Error', 'Missing Admin ID. Please login again.');
        setSubmitting(false);
        return;
      }

      formData.append(
        'admin_id',
        String(effectiveAdminId)
      );

      // Image
      if (selectedImage?.uri) {
        const uri = selectedImage.uri;

        const extension =
          uri
            .split('.')
            .pop()
            ?.toLowerCase() || 'jpg';

        const type =
          selectedImage.mimeType ||
          (extension === 'png'
            ? 'image/png'
            : 'image/jpeg');

        formData.append(
          'image',
          {
            uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
            name: `farmer_${Date.now()}.${extension}`,
            type,
          } as any
        );
      }

      console.log(
        '================================'
      );

      console.log(
        'CREATE FARMER API'
      );

      console.log(
        'Admin ID:',
        adminId
      );

      console.log(
        'Farmer Name:',
        farmerName.trim()
      );

      console.log(
        'Mobile:',
        mobileNumber.trim()
      );

      console.log(
        'Aadhaar:',
        aadharNumber.trim()
      );

      console.log(
        'Address:',
        address.trim()
      );

      console.log(
        'Has Image:',
        !!selectedImage
      );

      console.log(
        '================================'
      );

      // API REQUEST via centralized dairyApi
      const responseData = await createFarmer(formData);

      console.log(
        'CREATE FARMER RESPONSE:',
        responseData
      );

      // SUCCESS
      if (
        responseData?.status === 200 ||
        (responseData?.status as any) === '200' ||
        (responseData?.status as any) === true
      ) {
        invalidateFarmerCache();
        const generatedFarmerId =
          responseData?.farmer_id ||
          responseData?.data?.farmer_id ||
          responseData?.data?.id;

        Alert.alert(
          'Farmer Created Successfully',
          `Farmer ID: #${generatedFarmerId || 'N/A'}\n${
            responseData?.message ||
            'Farmer has been registered and associated with Sub-Admin #' + adminId
          }`,
          [
            ...(generatedFarmerId
              ? [
                  {
                    text: 'View Farmer Overview',
                    onPress: () => {
                      router.replace({
                        pathname: '/sub_amin/farmer_overview' as any,
                        params: {
                          farmer_id: String(generatedFarmerId),
                          admin_id: String(adminId),
                        },
                      });
                    },
                  },
                ]
              : []),
            {
              text: 'Farmer List',
              onPress: () => {
                router.back();
              },
            },
          ]
        );

        // Clear form
        setFarmerName('');
        setMobileNumber('');
        setAadharNumber('');
        setAddress('');
        setSelectedImage(null);
        setErrors({});
      } else {
        Alert.alert(
          'Registration Failed',
          responseData?.message ||
            'Could not register farmer.'
        );
      }
    } catch (error: any) {
      console.log(
        '================================'
      );

      console.log(
        'CREATE FARMER ERROR'
      );

      console.log(
        'Message:',
        error?.message
      );

      console.log(
        'Code:',
        error?.code
      );

      console.log(
        'URL:',
        error?.config?.url
      );

      console.log(
        'Method:',
        error?.config?.method
      );

      console.log(
        'Response:',
        error?.response?.data
      );

      console.log(
        'Status:',
        error?.response?.status
      );

      console.log(
        'Request:',
        error?.request
      );

      console.log(
        '================================'
      );

      let message =
        'Unable to connect to the server.';

      if (error?.response) {
        message =
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
      } else if (error?.request) {
        message =
          'Network error. Please check your internet connection and API URL.';
      } else if (error?.message) {
        message = error.message;
      }

      Alert.alert(
        'Error',
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  

  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.statusBarBg
        }
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View
          style={styles.headerContent}
        >
          <Text
            style={styles.headerTitle}
          >
            Add New Farmer
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Sub-Admin Portal
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >

          {/* PHOTO */}

          <View
            style={styles.photoCard}
          >
            <View
              style={styles.photoCircle}
            >
              {selectedImage ? (
                <Image
                  source={{
                    uri: selectedImage.uri,
                  }}
                  style={
                    styles.selectedPhoto
                  }
                />
              ) : (
                <Ionicons
                  name="person"
                  size={54}
                  color={
                    COLORS.brandGreen
                  }
                />
              )}
            </View>

            <TouchableOpacity
              style={
                styles.pickPhotoButton
              }
              onPress={pickImage}
              activeOpacity={0.85}
            >
              <Ionicons
                name="camera-outline"
                size={17}
                color={
                  COLORS.brandGreen
                }
              />

              <Text
                style={
                  styles.pickPhotoText
                }
              >
                {selectedImage
                  ? 'Change Photo'
                  : 'Upload Farmer Photo (Optional)'}
              </Text>
            </TouchableOpacity>

            {selectedImage ? (
              <TouchableOpacity
                onPress={() =>
                  setSelectedImage(null)
                }
                style={
                  styles.removePhotoBtn
                }
              >
                <Text
                  style={
                    styles.removePhotoText
                  }
                >
                  Remove Photo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* FORM */}

          <View
            style={styles.formCard}
          >

            {/* FARMER NAME */}

            <View
              style={styles.fieldGroup}
            >
              <Text
                style={styles.fieldLabel}
              >
                Farmer Full Name *
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.farmer_name &&
                    styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={
                    COLORS.subtitle
                  }
                />

                <TextInput
                  style={
                    styles.textInput
                  }
                  placeholder="Enter farmer name"
                  placeholderTextColor="#A0A09A"
                  value={farmerName}
                  onChangeText={(text) => {
                    setFarmerName(text);

                    if (
                      errors.farmer_name
                    ) {
                      setErrors(
                        (prev) => ({
                          ...prev,
                          farmer_name:
                            undefined,
                        })
                      );
                    }
                  }}
                />
              </View>

              {errors.farmer_name ? (
                <Text
                  style={
                    styles.fieldError
                  }
                >
                  {errors.farmer_name}
                </Text>
              ) : null}
            </View>

            {/* MOBILE */}

            <View
              style={styles.fieldGroup}
            >
              <Text
                style={styles.fieldLabel}
              >
                Mobile Number (10 digits) *
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.mobile_number &&
                    styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={
                    COLORS.subtitle
                  }
                />

                <TextInput
                  style={
                    styles.textInput
                  }
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#A0A09A"
                  value={mobileNumber}
                  onChangeText={(text) => {
                    const cleaned =
                      text.replace(
                        /\D/g,
                        ''
                      );

                    setMobileNumber(
                      cleaned
                    );

                    if (
                      errors.mobile_number
                    ) {
                      setErrors(
                        (prev) => ({
                          ...prev,
                          mobile_number:
                            undefined,
                        })
                      );
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {errors.mobile_number ? (
                <Text
                  style={
                    styles.fieldError
                  }
                >
                  {errors.mobile_number}
                </Text>
              ) : null}
            </View>

            {/* AADHAAR */}

            <View
              style={styles.fieldGroup}
            >
              <Text
                style={styles.fieldLabel}
              >
                Aadhaar Card Number (12 digits) *
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.aadhar_number &&
                    styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={
                    COLORS.subtitle
                  }
                />

                <TextInput
                  style={
                    styles.textInput
                  }
                  placeholder="e.g. 123456789012"
                  placeholderTextColor="#A0A09A"
                  value={aadharNumber}
                  onChangeText={(text) => {
                    const cleaned =
                      text.replace(
                        /\D/g,
                        ''
                      );

                    setAadharNumber(
                      cleaned
                    );

                    if (
                      errors.aadhar_number
                    ) {
                      setErrors(
                        (prev) => ({
                          ...prev,
                          aadhar_number:
                            undefined,
                        })
                      );
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>

              {errors.aadhar_number ? (
                <Text
                  style={
                    styles.fieldError
                  }
                >
                  {errors.aadhar_number}
                </Text>
              ) : null}
            </View>

            {/* ADDRESS */}

            <View
              style={styles.fieldGroup}
            >
              <Text
                style={styles.fieldLabel}
              >
                Village / Address *
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  errors.address &&
                    styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={
                    COLORS.subtitle
                  }
                  style={{
                    marginTop: 2,
                  }}
                />

                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                  ]}
                  placeholder="Enter village, mandal, or district"
                  placeholderTextColor="#A0A09A"
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);

                    if (
                      errors.address
                    ) {
                      setErrors(
                        (prev) => ({
                          ...prev,
                          address:
                            undefined,
                        })
                      );
                    }
                  }}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {errors.address ? (
                <Text
                  style={
                    styles.fieldError
                  }
                >
                  {errors.address}
                </Text>
              ) : null}
            </View>

            {/* ADMIN ID */}

            <View
              style={styles.fieldGroup}
            >
              <Text
                style={styles.fieldLabel}
              >
                Assigned Sub-Admin ID
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  styles.inputDisabled,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={
                    COLORS.brandGreen
                  }
                />

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color:
                        COLORS.headline,
                    },
                  ]}
                  value={`Admin ID: #${
                    adminId || '...'
                  }`}
                  editable={false}
                />
              </View>
            </View>

          </View>

          {/* SUBMIT */}

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting &&
                styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={
              handleCreateFarmer
            }
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="person-add-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Create Farmer
                </Text>
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
    backgroundColor:
      COLORS.brandDark,
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
    backgroundColor:
      COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor:
      COLORS.brandGreenLight,
    borderWidth: 2,
    borderColor:
      COLORS.brandGreenBorder,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },

  selectedPhoto: {
    width: '100%',
    height: '100%',
  },

  pickPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor:
      COLORS.brandGreenLight,
    gap: 6,
  },

  pickPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },

  removePhotoBtn: {
    marginTop: 8,
  },

  removePhotoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },

  formCard: {
    backgroundColor:
      COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
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
    minHeight: 48,
    gap: 10,
  },

  inputWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor:
      COLORS.dangerLight,
  },

  inputDisabled: {
    backgroundColor: '#EEEEEE',
    borderColor: '#E0E0E0',
  },

  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    paddingVertical: 10,
  },

  textAreaWrapper: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },

  textArea: {
    minHeight: 70,
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
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});