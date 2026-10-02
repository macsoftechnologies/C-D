import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createSubadmin } from '@/src/services/dairyApi';

interface SubAdminForm {
  name: string;
  email: string;
  booth: string;
  location: string;
  address: string;
  phone: string;
  password: string;
}

export default function AddSubAdmin() {
  const [form, setForm] = useState<SubAdminForm>({
    name: '',
    email: '',
    booth: '',
    location: '',
    address: '',
    phone: '',
    password: '',
  });
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: keyof SubAdminForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (err) {
      console.log('Image picker error:', err);
    }
  };

  const validate = () => {
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.password.trim()
    ) {
      setError('Please fill in required fields (Name, Phone, Password).');
      return false;
    }
    if (form.phone.trim().length !== 10) {
      setError('Phone number must be 10 digits.');
      return false;
    }
    if (form.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;

    setSaving(true);
    try {
      const emailValue = form.email.trim() || `${form.phone.trim()}@canaan.com`;
      const fullAddress = [form.booth.trim(), form.location.trim(), form.address.trim()]
        .filter(Boolean)
        .join(', ');

      const formData = new FormData();
      formData.append('admin_name', form.name.trim());
      formData.append('email', emailValue);
      formData.append('mobile_number', form.phone.trim());
      formData.append('address', fullAddress || 'Booth Center');
      formData.append('password', form.password.trim());

      if (selectedImage?.uri) {
        const uriParts = selectedImage.uri.split('.');
        const fileType = (uriParts[uriParts.length - 1] || 'jpg').toLowerCase();
        const extension = fileType === 'jpeg' ? 'jpg' : fileType;
        const mimeType = selectedImage.mimeType || `image/${extension}`;

        formData.append('photo', {
          uri: Platform.OS === 'android' ? selectedImage.uri : selectedImage.uri.replace('file://', ''),
          name: `subadmin_${Date.now()}.${extension}`,
          type: mimeType,
        } as any);
      }

      const response = await createSubadmin(formData);

      const isOk =
        response?.status === 200 ||
        (response?.status as any) === '200' ||
        (response?.status as any) === true ||
        response?.status === 201;

      if (isOk) {
        Alert.alert('Success', 'Sub Admin created successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        setError(response?.message || 'Could not save sub admin.');
      }
    } catch (err: any) {
      console.log('Error creating subadmin:', err);
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Sub Admin</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Photo Picker */}
        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.photoWrapper} activeOpacity={0.8}>
            {selectedImage?.uri ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#777" />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {selectedImage?.uri ? (
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.label}>Sub Admin Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          placeholderTextColor="#999"
          value={form.name}
          onChangeText={(text) => handleChange('name', text)}
        />

        <Text style={styles.label}>Booth</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Booth 12"
          placeholderTextColor="#999"
          value={form.booth}
          onChangeText={(text) => handleChange('booth', text)}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter location"
          placeholderTextColor="#999"
          value={form.location}
          onChangeText={(text) => handleChange('location', text)}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter full address"
          placeholderTextColor="#999"
          value={form.address}
          onChangeText={(text) => handleChange('address', text)}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 10-digit phone number"
          placeholderTextColor="#999"
          value={form.phone}
          onChangeText={(text) => handleChange('phone', text)}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Email Address (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. subadmin@gmail.com"
          placeholderTextColor="#999"
          value={form.email}
          onChangeText={(text) => handleChange('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Set a login password"
          placeholderTextColor="#999"
          value={form.password}
          onChangeText={(text) => handleChange('password', text)}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>Save Sub Admin</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  backBtn: { padding: 2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  photoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EBEBEB',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  photo: {
    width: 90,
    height: 90,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: '#777',
    marginTop: 3,
    fontWeight: '600',
  },
  removePhotoBtn: {
    marginTop: 6,
  },
  removePhotoText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#161616',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  errorText: { color: '#D32F2F', marginTop: 14, fontSize: 13 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    backgroundColor: '#fff',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelText: { color: '#555', fontWeight: '600' },
  saveBtn: {
    minWidth: 110,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});