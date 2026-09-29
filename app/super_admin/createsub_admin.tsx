import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';

// Adjust to your real endpoint
const ADD_SUBADMIN_URL = 'http://macsof.in/milkmanagement/api/addsubadmin';

interface SubAdminForm {
  name: string;
  booth: string;
  location: string;
  address: string;
  phone: string;
  password: string;
}

export default function AddSubAdmin() {
  const [form, setForm] = useState<SubAdminForm>({
    name: '',
    booth: '',
    location: '',
    address: '',
    phone: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: keyof SubAdminForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (
      !form.name.trim() ||
      !form.booth.trim() ||
      !form.location.trim() ||
      !form.address.trim() ||
      !form.phone.trim() ||
      !form.password.trim()
    ) {
      setError('Please fill in every field.');
      return false;
    }
    if (form.phone.trim().length !== 10) {
      setError('Phone number must be 10 digits.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await axios.post(ADD_SUBADMIN_URL, form);
      if (response.data.status === 200) {
        router.back();
      } else {
        setError(response.data.message || 'Could not save sub admin.');
      }
    } catch (err) {
      console.log(err);
      setError('Something went wrong. Please try again.');
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
        <Text style={styles.label}>Sub Admin Name</Text>
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

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 10-digit phone number"
          placeholderTextColor="#999"
          value={form.phone}
          onChangeText={(text) => handleChange('phone', text)}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Set a login password"
          placeholderTextColor="#999"
          value={form.password}
          onChangeText={(text) => handleChange('password', text)}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
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
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelText: { color: '#555', fontWeight: '600' },
  saveBtn: {
    minWidth: 90,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  saveText: { color: '#fff', fontWeight: '600' },
});