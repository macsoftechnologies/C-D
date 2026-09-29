import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  StatusBar,
  Linking,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import {
  getFarmerById,
  getAnimalsByFarmerId,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  deleteFarmer,
  getProcurementByFarmerId,
  createDailyProcurement,
  calculateMilkRate,
  calculateTotalMilk,
  calculateTotalAmount,
  DailyProcurementDateGroup,
} from '@/src/services/dairyApi';

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------

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

export interface AnimalItem {
  animal_id: string;
  farmer_id: string;
  animal_type: string;
  vaccination_proof: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_id?: string;
  breed?: string;
  age?: string;
  gender?: string;
  weight?: string;
  milk_capacity?: string;
  milk_details?: string;
}

// ----------------------------------------------------
// API ENDPOINTS (Postman Collection)
// ----------------------------------------------------

const GET_FARMER_BY_ID_URL =
  'http://macsof.in/milkmanagement/api/farmergetbyid';

const DELETE_FARMER_URL =
  'http://macsof.in/milkmanagement/api/farmerdelete';

const GET_ANIMALS_BY_FARMER_URL =
  'http://macsof.in/milkmanagement/api/farmeridbyanimals';

const ANIMAL_CREATE_URL =
  'http://macsof.in/milkmanagement/api/animalcreate';

const ANIMAL_UPDATE_URL =
  'http://macsof.in/milkmanagement/api/animalupdate';

const ANIMAL_DELETE_URL =
  'http://macsof.in/milkmanagement/api/animaldelete';

const ANIMAL_GET_BY_ID_URL =
  'http://macsof.in/milkmanagement/api/animalgetbyid';

// ----------------------------------------------------
// THEME COLORS
// ----------------------------------------------------

const COLORS = {
  bg: '#F5F7F4',
  cardBg: '#FFFFFF',
  statusBarBg: '#161616',
  brandDark: '#161616',
  brandGreen: '#1F5E4A',
  brandGreenLight: '#E8F5E9',
  brandGreenDark: '#174738',
  brandGreenBorder: '#C8E6C9',
  amber: '#B8791E',
  amberLight: '#FFF8E1',
  amberBorder: '#FFE082',
  headline: '#161616',
  subtitle: '#6B6B60',
  labelText: '#6B6B60',
  textDark: '#161616',
  textMuted: '#8E8E93',
  border: '#E2E6DF',
  danger: '#D32F2F',
  dangerLight: '#FFEBEE',
  dangerBorder: '#FFCDD2',
};

const formatDate = (raw?: string) => {
  if (!raw) return '-';
  const clean = raw.replace(' ', 'T');
  const date = new Date(clean);
  if (isNaN(date.getTime())) return raw;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SubAdminFarmerOverview() {
  const params = useLocalSearchParams<{
    farmer_id: string;
    admin_id?: string;
    farmer_name?: string;
    code?: string;
    mobile_number?: string;
    aadhar_number?: string;
    address?: string;
    status?: string;
    profile?: string;
    created_at?: string;
  }>();

  const farmer_id = params.farmer_id;

  // Immediate initialization from route params to ensure instant display on click
  const initialFarmer: Farmer | null =
    params.farmer_name || params.code
      ? {
        farmer_id: String(params.farmer_id || ''),
        farmer_name: params.farmer_name || '',
        mobile_number: params.mobile_number || '',
        profile: params.profile || '',
        aadhar_number: params.aadhar_number || '',
        address: params.address || '',
        status: String(params.status ?? '1'),
        created_at: params.created_at || '',
        updated_at: '',
        admin_id: params.admin_id || '',
        code: params.code || '',
      }
      : null;

  // Farmer State
  const [farmer, setFarmer] = useState<Farmer | null>(initialFarmer);
  const [loading, setLoading] = useState<boolean>(!initialFarmer);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Animals State (Dynamic Backend Data)
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [animalsError, setAnimalsError] = useState(false);
  const [animalsErrorMessage, setAnimalsErrorMessage] = useState('');

  // Modals State
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  // Add Animal Modal State
  const [addAnimalModalVisible, setAddAnimalModalVisible] = useState(false);
  const [newAnimalType, setNewAnimalType] = useState<'Cow' | 'Buffalo' | string>('Cow');
  const [customAnimalType, setCustomAnimalType] = useState('');
  const [newVaccinationImage, setNewVaccinationImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [savingAnimal, setSavingAnimal] = useState(false);

  // Edit Animal Modal State
  const [editAnimalModalVisible, setEditAnimalModalVisible] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<AnimalItem | null>(null);
  const [editAnimalType, setEditAnimalType] = useState<'Cow' | 'Buffalo' | string>('Cow');
  const [editCustomAnimalType, setEditCustomAnimalType] = useState('');
  const [editVaccinationImage, setEditVaccinationImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [updatingAnimal, setUpdatingAnimal] = useState(false);

  // Daily Procurement State
  const [procurements, setProcurements] = useState<DailyProcurementDateGroup[]>([]);
  const [procurementsLoading, setProcurementsLoading] = useState(false);
  const [procurementModalVisible, setProcurementModalVisible] = useState(false);
  const [procShift, setProcShift] = useState<'Morning' | 'Evening'>('Morning');
  const [procAnimalId, setProcAnimalId] = useState<string>('');
  const [procLiters, setProcLiters] = useState('');
  const [procFat, setProcFat] = useState('4.5');
  const [procSnf, setProcSnf] = useState('8.5');
  const [procRate, setProcRate] = useState('35.00');
  const [savingProcurement, setSavingProcurement] = useState(false);

  const farmerRef = React.useRef<Farmer | null>(null);
  React.useEffect(() => {
    farmerRef.current = farmer;
  }, [farmer]);

  const lastLoadedFarmerIdRef = React.useRef<string | null>(null);
  const isLoadingOverviewRef = React.useRef<boolean>(false);

  // Prevent stale data when switching to a different farmer
  React.useEffect(() => {
    lastLoadedFarmerIdRef.current = null;
    if (params.farmer_name || params.code) {
      setFarmer({
        farmer_id: String(params.farmer_id || ''),
        farmer_name: params.farmer_name || '',
        mobile_number: params.mobile_number || '',
        profile: params.profile || '',
        aadhar_number: params.aadhar_number || '',
        address: params.address || '',
        status: String(params.status ?? '1'),
        created_at: params.created_at || '',
        updated_at: '',
        admin_id: params.admin_id || '',
        code: params.code || '',
      });
      setLoading(false);
    } else {
      setFarmer(null);
      setLoading(true);
    }
    setAnimals([]);
    setProcurements([]);
    setError(false);
    setErrorMessage('');
  }, [params.farmer_id]);

  // ----------------------------------------------------
  // CONCURRENT OVERVIEW DATA LOADER (Parallel APIs)
  // ----------------------------------------------------
  const loadOverviewData = useCallback(
    async (targetId: string, force = false) => {
      if (!targetId) {
        setLoading(false);
        setError(true);
        setErrorMessage('Missing Farmer ID.');
        return;
      }

      // Avoid redundant repeated requests for the same farmer unless forced
      if (!force && lastLoadedFarmerIdRef.current === targetId) {
        return;
      }

      if (isLoadingOverviewRef.current) {
        return;
      }

      isLoadingOverviewRef.current = true;
      setAnimalsLoading(true);
      setProcurementsLoading(true);

      try {
        const [farmerRes, animalsRes, procRes] = await Promise.allSettled([
          getFarmerById(targetId),
          getAnimalsByFarmerId(targetId, force),
          getProcurementByFarmerId(targetId),
        ]);

        if (farmerRes.status === 'fulfilled' && farmerRes.value) {
          setFarmer(farmerRes.value);
          setError(false);
        } else if (procRes.status === 'fulfilled' && procRes.value?.farmer_details) {
          setFarmer(procRes.value.farmer_details);
          setError(false);
        } else if (!farmerRef.current && farmerRes.status === 'rejected') {
          setError(true);
          setErrorMessage('Could not load farmer details. Please check connection.');
        }

        if (animalsRes.status === 'fulfilled') {
          setAnimals(animalsRes.value || []);
          setAnimalsError(false);
        } else {
          setAnimals([]);
        }

        if (procRes.status === 'fulfilled' && procRes.value) {
          if (
            (procRes.value.status === 200 || procRes.value.status === '200') &&
            Array.isArray(procRes.value.procurement_data)
          ) {
            setProcurements(procRes.value.procurement_data);
          } else {
            setProcurements([]);
          }
        }

        lastLoadedFarmerIdRef.current = targetId;
      } catch (err: any) {
        console.log('Error loading farmer overview data:', err);
      } finally {
        isLoadingOverviewRef.current = false;
        setLoading(false);
        setAnimalsLoading(false);
        setProcurementsLoading(false);
      }
    },
    []
  );

  // Update default animal and live rate
  React.useEffect(() => {
    if (animals.length > 0 && !procAnimalId) {
      setProcAnimalId(animals[0].animal_id);
      const r = calculateMilkRate(
        parseFloat(procFat) || 4.5,
        parseFloat(procSnf) || 8.5,
        animals[0].animal_type
      );
      setProcRate(r.toFixed(2));
    }
  }, [animals, procAnimalId]);

  const handleProcFatChange = (val: string) => {
    setProcFat(val);
    const f = parseFloat(val) || 0;
    const s = parseFloat(procSnf) || 0;
    if (f > 0 && s > 0) {
      const currentAnimal = animals.find((a) => a.animal_id === procAnimalId);
      const r = calculateMilkRate(f, s, currentAnimal?.animal_type);
      setProcRate(r.toFixed(2));
    }
  };

  const handleProcSnfChange = (val: string) => {
    setProcSnf(val);
    const f = parseFloat(procFat) || 0;
    const s = parseFloat(val) || 0;
    if (f > 0 && s > 0) {
      const currentAnimal = animals.find((a) => a.animal_id === procAnimalId);
      const r = calculateMilkRate(f, s, currentAnimal?.animal_type);
      setProcRate(r.toFixed(2));
    }
  };

  const handleSaveDailyProcurement = async () => {
    const l = parseFloat(procLiters);
    if (!l || l <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid milk quantity in liters.');
      return;
    }
    const f = parseFloat(procFat) || 4.5;
    const s = parseFloat(procSnf) || 8.5;
    const r = parseFloat(procRate) || 35.0;

    setSavingProcurement(true);
    try {
      const targetAid = Number(procAnimalId) || (animals.length > 0 ? Number(animals[0].animal_id) : 1);
      const payload = {
        farmer_id: Number(farmer_id),
        shift: procShift,
        procurements: [
          {
            animal_id: targetAid,
            fat: Number(f.toFixed(2)),
            snf: Number(s.toFixed(2)),
            liters: Number(l.toFixed(2)),
            rate: Number(r.toFixed(2)),
          },
        ],
      };

      const res = await createDailyProcurement(payload);
      const isSuccess = res.status === 200 || (res as any).status === '200' || (res as any).status === true;
      if (isSuccess) {
        Alert.alert('Success', 'Daily milk procurement recorded successfully!', [
          {
            text: 'View Milk Bill',
            onPress: () => {
              setProcurementModalVisible(false);
              router.push({
                pathname: '/sub_amin/milk_bill' as any,
                params: {
                  farmer_id: String(farmer_id),
                },
              });
            },
          },
          {
            text: 'OK',
            onPress: () => {
              setProcurementModalVisible(false);
              if (farmer_id) loadOverviewData(String(farmer_id), true);
            },
          },
        ]);
        setProcLiters('');
      } else {
        Alert.alert('Failed', res.message || 'Could not record procurement.');
      }
    } catch (err: any) {
      console.log('Error recording procurement:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Network error while recording procurement.');
    } finally {
      setSavingProcurement(false);
    }
  };

  // Refresh farmer data, animal list, and procurement records when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (farmer_id && lastLoadedFarmerIdRef.current !== String(farmer_id)) {
        loadOverviewData(String(farmer_id), true);
      }
    }, [farmer_id, loadOverviewData])
  );

  const handleBack = () => {
    router.back();
  };

  const handleUpdate = () => {
    if (!farmer) return;
    lastLoadedFarmerIdRef.current = null;
    router.push({
      pathname: '/sub_amin/update_farmer',
      params: {
        farmer_id: farmer.farmer_id,
        admin_id: farmer.admin_id,
        farmer_name: farmer.farmer_name,
        mobile_number: farmer.mobile_number,
        aadhar_number: farmer.aadhar_number,
        address: farmer.address,
        profile: farmer.profile,
      },
    });
  };

  const handleCall = () => {
    if (!farmer?.mobile_number) return;
    Linking.openURL(`tel:${farmer.mobile_number}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // ----------------------------------------------------
  // 3. DELETE FARMER (POST /api/farmerdelete)
  // ----------------------------------------------------
  const confirmDeleteFarmer = () => {
    if (!farmer) return;

    Alert.alert(
      'Delete Farmer',
      `Are you sure you want to delete "${farmer.farmer_name || 'this farmer'}" (Code: ${farmer.code || farmer.farmer_id})?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: executeDeleteFarmer,
        },
      ]
    );
  };

  const executeDeleteFarmer = async () => {
    if (!farmer?.farmer_id) return;

    setDeleting(true);
    try {
      const response = await deleteFarmer(farmer.farmer_id);
      const isSuccess =
        response?.status === 200 ||
        (response as any)?.status === '200' ||
        (response as any)?.status === true;

      if (isSuccess) {
        Alert.alert('Deleted', 'Farmer deleted successfully.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert(
          'Delete Failed',
          response?.message || 'Could not delete farmer. Please try again.'
        );
      }
    } catch (err: any) {
      console.log('Farmer Delete Error (Sub-Admin):', err);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Network error while attempting to delete farmer.'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ----------------------------------------------------
  // 4. IMAGE PICKER FOR VACCINATION PROOF
  // ----------------------------------------------------
  const pickVaccinationPhoto = async (forEdit: boolean = false) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to upload vaccination proof.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        if (forEdit) {
          setEditVaccinationImage(result.assets[0]);
        } else {
          setNewVaccinationImage(result.assets[0]);
        }
      }
    } catch (err) {
      console.log('Image picker error:', err);
      Alert.alert('Error', 'Unable to pick image.');
    }
  };

  // ----------------------------------------------------
  // 5. ANIMAL CREATE (POST /api/animalcreate)
  // ----------------------------------------------------
  const handleCreateAnimal = async () => {
    const finalType = newAnimalType === 'Other' ? customAnimalType.trim() : newAnimalType;

    if (!finalType) {
      Alert.alert('Validation Error', 'Please select or enter an animal type (e.g. Cow, Buffalo).');
      return;
    }

    if (!farmer_id) {
      Alert.alert('Error', 'Missing farmer ID.');
      return;
    }

    setSavingAnimal(true);
    const url = ANIMAL_CREATE_URL;
    const method = 'POST';

    try {
      const formData = new FormData();
      formData.append('farmer_id', String(farmer_id));
      formData.append('animal_type', finalType);

      if (newVaccinationImage) {
        const uriParts = newVaccinationImage.uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        formData.append('vaccination_proof', {
          uri: newVaccinationImage.uri,
          name: `vaccination_${Date.now()}.${fileType}`,
          type: newVaccinationImage.mimeType || `image/${fileType}`,
        } as any);
      }

      const response = await createAnimal(formData);

      const isSuccess =
        response?.status === 200 ||
        (response?.status as any) === '200' ||
        (response?.status as any) === true;

      if (isSuccess) {
        Alert.alert('Success', response?.message || 'Animal added successfully.');
        setAddAnimalModalVisible(false);
        setNewAnimalType('Cow');
        setCustomAnimalType('');
        setNewVaccinationImage(null);
        // Refresh animals list dynamically
        if (farmer_id) loadOverviewData(String(farmer_id), true);
      } else {
        Alert.alert('Failed', response?.message || 'Could not add animal.');
      }
    } catch (err: any) {
      console.log('========== ANIMAL API ERROR ==========');
      console.log('URL:', url);
      console.log('METHOD:', method);
      console.log('FARMER ID:', farmer_id);
      console.log('PARAMS: none');
      console.log('REQUEST BODY: animal_type =', finalType);
      console.log('STATUS:', err?.response?.status || 'Network Error');
      console.log('RESPONSE:', err?.response?.data || null);
      console.log('MESSAGE:', err?.message);
      console.log('======================================');

      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Unable to add animal. Please check your network connection.'
      );
    } finally {
      setSavingAnimal(false);
    }
  };

  // ----------------------------------------------------
  // 6. ANIMAL UPDATE (POST /api/animalupdate)
  // ----------------------------------------------------
  const openEditAnimalModal = (animal: AnimalItem) => {
    setEditingAnimal(animal);
    if (animal.animal_type === 'Cow' || animal.animal_type === 'Buffalo') {
      setEditAnimalType(animal.animal_type);
      setEditCustomAnimalType('');
    } else {
      setEditAnimalType('Other');
      setEditCustomAnimalType(animal.animal_type || '');
    }
    setEditVaccinationImage(null);
    setEditAnimalModalVisible(true);
  };

  const handleUpdateAnimal = async () => {
    if (!editingAnimal) return;

    const finalType =
      editAnimalType === 'Other' ? editCustomAnimalType.trim() : editAnimalType;

    if (!finalType) {
      Alert.alert('Validation Error', 'Please select or enter an animal type.');
      return;
    }

    setUpdatingAnimal(true);
    const url = ANIMAL_UPDATE_URL;
    const method = 'POST';

    try {
      const formData = new FormData();
      formData.append('animal_id', String(editingAnimal.animal_id));
      formData.append('farmer_id', String(farmer_id || editingAnimal.farmer_id));
      formData.append('animal_type', finalType);

      if (editVaccinationImage) {
        const uriParts = editVaccinationImage.uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        formData.append('vaccination_proof', {
          uri: editVaccinationImage.uri,
          name: `vaccination_${Date.now()}.${fileType}`,
          type: editVaccinationImage.mimeType || `image/${fileType}`,
        } as any);
      }

      const response = await updateAnimal(formData);

      const isSuccess =
        response?.status === 200 ||
        (response?.status as any) === '200' ||
        (response?.status as any) === true;

      if (isSuccess) {
        Alert.alert('Success', response?.message || 'Animal updated successfully.');
        setEditAnimalModalVisible(false);
        setEditingAnimal(null);
        setEditVaccinationImage(null);
        // Refresh animals dynamically
        if (farmer_id) loadOverviewData(String(farmer_id), true);
      } else {
        Alert.alert('Failed', response?.message || 'Could not update animal.');
      }
    } catch (err: any) {
      console.log('========== ANIMAL API ERROR ==========');
      console.log('URL:', url);
      console.log('METHOD:', method);
      console.log('FARMER ID:', farmer_id);
      console.log('PARAMS: animal_id =', editingAnimal.animal_id);
      console.log('REQUEST BODY: animal_type =', finalType);
      console.log('STATUS:', err?.response?.status || 'Network Error');
      console.log('RESPONSE:', err?.response?.data || null);
      console.log('MESSAGE:', err?.message);
      console.log('======================================');

      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Unable to update animal. Please check connection.'
      );
    } finally {
      setUpdatingAnimal(false);
    }
  };

  // ----------------------------------------------------
  // 7. ANIMAL DELETE (POST /api/animaldelete)
  // ----------------------------------------------------
  const confirmDeleteAnimal = (animal: AnimalItem) => {
    Alert.alert(
      'Delete Animal',
      `Are you sure you want to delete this animal (#${animal.animal_id} - ${animal.animal_type})?\n\nThis record will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDeleteAnimal(animal.animal_id),
        },
      ]
    );
  };

  const executeDeleteAnimal = async (animalId: string) => {
    try {
      const res = await deleteAnimal(animalId);
      if (res.status === 200 || (res as any).status === '200') {
        Alert.alert('Success', res.message || 'Animal deleted successfully.');
        if (farmer_id) loadOverviewData(String(farmer_id), true);
      } else {
        Alert.alert('Delete Failed', res.message || 'Could not delete animal.');
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Unable to delete animal. Please check connection.'
      );
    }
  };

  // ----------------------------------------------------
  // RENDER: LOADING & ERROR STATES
  // ----------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Farmer Overview</Text>
            <Text style={styles.headerSubtitle}>Sub-Admin Portal</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
          <Text style={styles.loadingText}>Loading farmer details...</Text>
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
            <Text style={styles.headerTitle}>Farmer Overview</Text>
            <Text style={styles.headerSubtitle}>Sub-Admin Portal</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          </View>
          <Text style={styles.errorTitle}>Unable to load farmer</Text>
          <Text style={styles.errorText}>
            {errorMessage || 'Something went wrong while retrieving details.'}
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={() => farmer_id && loadOverviewData(String(farmer_id), true)}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = farmer.status === '1';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBarBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {farmer.farmer_name || 'Farmer Details'}
          </Text>
          <Text style={styles.headerSubtitle}>Sub-Admin Portal</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleUpdate}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {farmer.profile?.trim() ? (
              <Image
                source={{ uri: farmer.profile }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={54} color={COLORS.brandGreen} />
              </View>
            )}

            <View
              style={[
                styles.statusBadge,
                isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? '#2E7D32' : COLORS.danger },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isActive ? '#2E7D32' : COLORS.danger },
                ]}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <Text style={styles.farmerName}>{farmer.farmer_name || 'Unnamed Farmer'}</Text>

          <View style={styles.codeRow}>
            <View style={styles.badgePill}>
              <Ionicons name="qr-code-outline" size={13} color={COLORS.brandGreen} />
              <Text style={styles.badgeText}>Code: {farmer.code || '-'}</Text>
            </View>

            <View style={styles.badgePill}>
              <Ionicons name="id-card-outline" size={13} color={COLORS.brandGreen} />
              <Text style={styles.badgeText}>Farmer ID: #{farmer.farmer_id}</Text>
            </View>
          </View>

          {/* Quick Call Row */}
          {farmer.mobile_number ? (
            <TouchableOpacity
              style={styles.callBanner}
              activeOpacity={0.85}
              onPress={handleCall}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.callBannerText}>Call {farmer.mobile_number}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Detailed Farmer Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Farmer Information</Text>

          <DetailItem
            icon="call-outline"
            label="Mobile Number"
            value={farmer.mobile_number}
            canCall={!!farmer.mobile_number}
            onCall={handleCall}
          />

          <DetailItem
            icon="card-outline"
            label="Aadhaar Number"
            value={farmer.aadhar_number}
          />

          <DetailItem
            icon="location-outline"
            label="Village / Address"
            value={farmer.address}
          />

          <DetailItem
            icon="shield-checkmark-outline"
            label="Assigned Sub-Admin ID"
            value={`Admin #${farmer.admin_id || '-'}`}
          />

          <DetailItem
            icon="calendar-outline"
            label="Registration Date"
            value={formatDate(farmer.created_at)}
          />

          <DetailItem
            icon="time-outline"
            label="Last Updated"
            value={formatDate(farmer.updated_at)}
            isLast
          />
        </View>

        {/* ==================================================== */}
        {/* ANIMAL DETAILS SECTION (Real API Data)               */}
        {/* ==================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.animalsHeaderRow}>
            <View>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="cow" size={20} color={COLORS.brandGreen} />
                <Text style={styles.sectionTitle}>Animal Details</Text>
              </View>
              <Text style={styles.animalsSubhead}>
                {animals.length} {animals.length === 1 ? 'animal' : 'animals'} registered for this farmer
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addAnimalBtn}
              activeOpacity={0.85}
              onPress={() => setAddAnimalModalVisible(true)}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addAnimalBtnText}>Add Animal</Text>
            </TouchableOpacity>
          </View>

          {/* Animals Loading State */}
          {animalsLoading ? (
            <View style={styles.animalsLoaderWrap}>
              <ActivityIndicator size="small" color={COLORS.brandGreen} />
              <Text style={styles.animalsLoaderText}>Loading farmer's animals...</Text>
            </View>
          ) : animalsError ? (
            /* Animals API Error State */
            <View style={styles.animalsErrorBox}>
              <Ionicons name="alert-circle-outline" size={26} color={COLORS.danger} />
              <Text style={styles.animalsErrorText}>
                {animalsErrorMessage || 'Unable to load animal details. Please try again.'}
              </Text>
              <TouchableOpacity
                style={styles.animalsRetryBtn}
                onPress={() => farmer_id && loadOverviewData(String(farmer_id), true)}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.animalsRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : animals.length === 0 ? (
            /* Empty State: Farmer has no animals */
            <View style={styles.emptyAnimalsBox}>
              <View style={styles.emptyAnimalsIconWrap}>
                <MaterialCommunityIcons name="cow" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyAnimalsTitle}>No animals found for this farmer.</Text>
              <Text style={styles.emptyAnimalsSubtitle}>
                Add this farmer's livestock record using the button below.
              </Text>
              <TouchableOpacity
                style={styles.addFirstAnimalBtn}
                activeOpacity={0.85}
                onPress={() => setAddAnimalModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.addFirstAnimalBtnText}>Register First Animal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Dynamic Animal Cards List */
            <View style={styles.animalCardsList}>
              {animals.map((item, index) => {
                const isAnimalActive = item.status === '1';
                const isCow =
                  item.animal_type?.toLowerCase().includes('cow') ?? true;

                return (
                  <View key={item.animal_id || `animal_${index}`} style={styles.animalCard}>
                    {/* Animal Card Header */}
                    <View style={styles.animalCardTop}>
                      <View style={styles.animalTypeBadge}>
                        <MaterialCommunityIcons
                          name={isCow ? 'cow' : 'pig'}
                          size={18}
                          color={COLORS.brandGreen}
                        />
                        <Text style={styles.animalTypeText}>{item.animal_type || 'Livestock'}</Text>
                      </View>

                      <View
                        style={[
                          styles.animalStatusBadge,
                          isAnimalActive ? styles.statusActive : styles.statusInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: isAnimalActive ? '#2E7D32' : COLORS.danger },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: isAnimalActive ? '#2E7D32' : COLORS.danger },
                          ]}
                        >
                          {isAnimalActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Animal Metadata Grid */}
                    <View style={styles.animalMetaGrid}>
                      <View style={styles.animalMetaCol}>
                        <Text style={styles.animalMetaLabel}>Animal ID</Text>
                        <Text style={styles.animalMetaValue}>#{item.animal_id}</Text>
                      </View>

                      <View style={styles.animalMetaCol}>
                        <Text style={styles.animalMetaLabel}>Farmer ID</Text>
                        <Text style={styles.animalMetaValue}>#{item.farmer_id}</Text>
                      </View>

                      <View style={styles.animalMetaCol}>
                        <Text style={styles.animalMetaLabel}>Registered On</Text>
                        <Text style={styles.animalMetaValue}>{formatDate(item.created_at)}</Text>
                      </View>

                      <View style={styles.animalMetaCol}>
                        <Text style={styles.animalMetaLabel}>Last Updated</Text>
                        <Text style={styles.animalMetaValue}>{formatDate(item.updated_at)}</Text>
                      </View>

                      {item.breed ? (
                        <View style={styles.animalMetaCol}>
                          <Text style={styles.animalMetaLabel}>Breed</Text>
                          <Text style={styles.animalMetaValue}>{item.breed}</Text>
                        </View>
                      ) : null}

                      {item.age ? (
                        <View style={styles.animalMetaCol}>
                          <Text style={styles.animalMetaLabel}>Age</Text>
                          <Text style={styles.animalMetaValue}>{item.age}</Text>
                        </View>
                      ) : null}

                      {item.gender ? (
                        <View style={styles.animalMetaCol}>
                          <Text style={styles.animalMetaLabel}>Gender</Text>
                          <Text style={styles.animalMetaValue}>{item.gender}</Text>
                        </View>
                      ) : null}

                      {item.weight ? (
                        <View style={styles.animalMetaCol}>
                          <Text style={styles.animalMetaLabel}>Weight</Text>
                          <Text style={styles.animalMetaValue}>{item.weight}</Text>
                        </View>
                      ) : null}

                      {item.milk_capacity || item.milk_details ? (
                        <View style={styles.animalMetaCol}>
                          <Text style={styles.animalMetaLabel}>Milk Details</Text>
                          <Text style={styles.animalMetaValue}>{item.milk_capacity || item.milk_details}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Vaccination Proof Row */}
                    <View style={styles.proofRow}>
                      <Text style={styles.proofLabel}>Vaccination Proof:</Text>
                      {item.vaccination_proof && item.vaccination_proof.trim() ? (
                        <TouchableOpacity
                          style={styles.viewProofBtn}
                          onPress={() => setProofPreviewUrl(item.vaccination_proof)}
                        >
                          <Ionicons name="document-attach-outline" size={15} color={COLORS.brandGreen} />
                          <Text style={styles.viewProofText}>View Document / Photo</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.noProofText}>No vaccination proof attached</Text>
                      )}
                    </View>

                    {/* Card Actions (Update & Delete) */}
                    <View style={styles.animalCardActions}>
                      <TouchableOpacity
                        style={styles.animalEditBtn}
                        activeOpacity={0.8}
                        onPress={() => openEditAnimalModal(item)}
                      >
                        <Ionicons name="create-outline" size={15} color={COLORS.brandGreen} />
                        <Text style={styles.animalEditBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.animalDeleteBtn}
                        activeOpacity={0.8}
                        onPress={() => confirmDeleteAnimal(item)}
                      >
                        <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                        <Text style={styles.animalDeleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ==================================================== */}
        {/* DAILY MILK PROCUREMENT SECTION (Real API Data)        */}
        {/* ==================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.animalsHeaderRow}>
            <View>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="water" size={20} color={COLORS.brandGreen} />
                <Text style={styles.sectionTitle}>Daily Milk Procurement</Text>
              </View>
              <Text style={styles.animalsSubhead}>
                {procurements.length} {procurements.length === 1 ? 'day recorded' : 'days recorded'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addAnimalBtn}
              activeOpacity={0.85}
              onPress={() => setProcurementModalVisible(true)}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addAnimalBtnText}>Record Milk</Text>
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {procurementsLoading ? (
            <View style={styles.animalsLoaderWrap}>
              <ActivityIndicator size="small" color={COLORS.brandGreen} />
              <Text style={styles.animalsLoaderText}>Loading milk procurement records...</Text>
            </View>
          ) : procurements.length === 0 ? (
            <View style={styles.emptyAnimalsBox}>
              <View style={styles.emptyAnimalsIconWrap}>
                <MaterialCommunityIcons name="water-outline" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyAnimalsTitle}>No milk procurement recorded yet.</Text>
              <Text style={styles.emptyAnimalsSubtitle}>
                Record daily morning or evening milk collection for this farmer.
              </Text>
              <TouchableOpacity
                style={styles.addFirstAnimalBtn}
                activeOpacity={0.85}
                onPress={() => setProcurementModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.addFirstAnimalBtnText}>Record First Procurement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.procurementListWrap}>
              {procurements.map((group) => {
                const mRecs = group.morning_shift?.records || [];
                const eRecs = group.evening_shift?.records || [];
                const allRecs = [...mRecs, ...eRecs];

                const mQty = mRecs.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const eQty = eRecs.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
                const totalLiters = calculateTotalMilk(mQty, eQty);

                const sample = allRecs[0];
                const rateVal = parseFloat(sample?.rate || '35.00');
                const totalAmt = allRecs.reduce(
                  (sum, r) => sum + (parseFloat(r.amount) || (parseFloat(r.liters) || 0) * rateVal),
                  0
                );

                return (
                  <View key={group.date} style={styles.procurementDateCard}>
                    {/* Date Header */}
                    <View style={styles.procHeaderRow}>
                      <View style={styles.procDateBadge}>
                        <Ionicons name="calendar-outline" size={13} color={COLORS.brandGreen} />
                        <Text style={styles.procDateBadgeText}>{group.date}</Text>
                      </View>

                      <Text style={styles.procSummaryText}>
                        Total: <Text style={{ fontWeight: '800', color: COLORS.brandGreen }}>{totalLiters} L</Text>
                      </Text>
                    </View>

                    {/* Shifts Breakdown */}
                    <View style={styles.procShiftsRow}>
                      <View style={styles.procShiftCol}>
                        <Text style={styles.procShiftLabel}>Morning Shift</Text>
                        <Text style={styles.procShiftVal}>{mQty} L</Text>
                        <Text style={styles.procShiftSub}>
                          {mRecs.length > 0 ? `Fat ${mRecs[0].fat}% | SNF ${mRecs[0].snf}%` : 'No entry'}
                        </Text>
                      </View>

                      <View style={styles.procShiftDivider} />

                      <View style={styles.procShiftCol}>
                        <Text style={styles.procShiftLabel}>Evening Shift</Text>
                        <Text style={styles.procShiftVal}>{eQty} L</Text>
                        <Text style={styles.procShiftSub}>
                          {eRecs.length > 0 ? `Fat ${eRecs[0].fat}% | SNF ${eRecs[0].snf}%` : 'No entry'}
                        </Text>
                      </View>
                    </View>

                    {/* Calculation & Rate Summary */}
                    <View style={styles.procCalcBox}>
                      <View style={styles.procCalcRow}>
                        <Text style={styles.procCalcLabel}>Price Per Liter:</Text>
                        <Text style={styles.procCalcVal}>₹{rateVal.toFixed(2)} / L</Text>
                      </View>
                      <View style={styles.procCalcRow}>
                        <Text style={styles.procCalcLabel}>Formula:</Text>
                        <Text style={styles.procCalcFormula}>
                          {totalLiters} L × ₹{rateVal.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.procCalcRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 0.6, borderTopColor: '#D0E4D8' }]}>
                        <Text style={[styles.procCalcLabel, { fontWeight: '800', color: COLORS.brandGreen }]}>Total Milk Amount:</Text>
                        <Text style={styles.procTotalAmount}>₹{totalAmt.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Bill Navigation Actions */}
                    <View style={styles.procActionsRow}>
                      <TouchableOpacity
                        style={styles.procBillBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          router.push({
                            pathname: '/sub_amin/milk_bill' as any,
                            params: {
                              farmer_id: String(farmer.farmer_id),
                              procurement_id: sample?.procurement_id,
                              date: group.date,
                            },
                          });
                        }}
                      >
                        <Ionicons name="receipt-outline" size={14} color={COLORS.brandGreen} />
                        <Text style={styles.procBillBtnText}>Milk Bill</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.procSnfBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          router.push({
                            pathname: '/sub_amin/snf_bill' as any,
                            params: {
                              farmer_id: String(farmer.farmer_id),
                              procurement_id: sample?.procurement_id,
                              date: group.date,
                            },
                          });
                        }}
                      >
                        <MaterialCommunityIcons name="calculator" size={14} color={COLORS.amber} />
                        <Text style={styles.procSnfBtnText}>SNF Bill</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom Actions (Update & Delete Farmer) */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={handleUpdate}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.updateButtonText}>Update Farmer Information</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.85}
            onPress={confirmDeleteFarmer}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                <Text style={styles.deleteButtonText}>Delete Farmer Record</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL: ADD ANIMAL                                    */}
      {/* ==================================================== */}
      <Modal
        visible={addAnimalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddAnimalModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="cow" size={20} color={COLORS.brandGreen} />
                <Text style={styles.modalTitle}>Add Animal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddAnimalModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Registering for Farmer #{farmer_id} ({farmer.farmer_name})
              </Text>

              {/* Animal Type Selector */}
              <Text style={styles.inputLabel}>Animal Type *</Text>
              <View style={styles.typeSelectorRow}>
                {(['Cow', 'Buffalo', 'Other'] as const).map((type) => {
                  const selected = newAnimalType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeOption, selected && styles.typeOptionSelected]}
                      onPress={() => setNewAnimalType(type)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          selected && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {newAnimalType === 'Other' ? (
                <TextInput
                  style={styles.customTypeInput}
                  placeholder="Enter animal type (e.g. Goat, Sheep)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customAnimalType}
                  onChangeText={setCustomAnimalType}
                />
              ) : null}

              {/* Vaccination Proof Upload */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Vaccination Proof (Optional)
              </Text>
              <TouchableOpacity
                style={styles.uploadProofBtn}
                activeOpacity={0.8}
                onPress={() => pickVaccinationPhoto(false)}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.brandGreen} />
                <Text style={styles.uploadProofText}>
                  {newVaccinationImage ? 'Change Proof Document' : 'Upload Proof Image'}
                </Text>
              </TouchableOpacity>

              {newVaccinationImage ? (
                <View style={styles.previewImageWrap}>
                  <Image
                    source={{ uri: newVaccinationImage.uri }}
                    style={styles.proofPreviewThumb}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeProofBtn}
                    onPress={() => setNewVaccinationImage(null)}
                  >
                    <Text style={styles.removeProofText}>Remove Image</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingAnimal && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleCreateAnimal}
                disabled={savingAnimal}
              >
                {savingAnimal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Save Animal</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: EDIT ANIMAL                                   */}
      {/* ==================================================== */}
      <Modal
        visible={editAnimalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditAnimalModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="create-outline" size={20} color={COLORS.brandGreen} />
                <Text style={styles.modalTitle}>Edit Animal #{editingAnimal?.animal_id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditAnimalModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Animal Type */}
              <Text style={styles.inputLabel}>Animal Type *</Text>
              <View style={styles.typeSelectorRow}>
                {(['Cow', 'Buffalo', 'Other'] as const).map((type) => {
                  const selected = editAnimalType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeOption, selected && styles.typeOptionSelected]}
                      onPress={() => setEditAnimalType(type)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          selected && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {editAnimalType === 'Other' ? (
                <TextInput
                  style={styles.customTypeInput}
                  placeholder="Enter animal type"
                  placeholderTextColor={COLORS.textMuted}
                  value={editCustomAnimalType}
                  onChangeText={setEditCustomAnimalType}
                />
              ) : null}

              {/* Vaccination Proof */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Vaccination Proof</Text>

              {editingAnimal?.vaccination_proof && !editVaccinationImage ? (
                <View style={styles.existingProofWrap}>
                  <Text style={styles.existingProofLabel}>Current Document:</Text>
                  <TouchableOpacity
                    onPress={() => setProofPreviewUrl(editingAnimal.vaccination_proof)}
                  >
                    <Image
                      source={{ uri: editingAnimal.vaccination_proof }}
                      style={styles.proofPreviewThumb}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.uploadProofBtn}
                activeOpacity={0.8}
                onPress={() => pickVaccinationPhoto(true)}
              >
                <Ionicons name="camera-outline" size={18} color={COLORS.brandGreen} />
                <Text style={styles.uploadProofText}>
                  {editVaccinationImage
                    ? 'Change New Photo'
                    : editingAnimal?.vaccination_proof
                      ? 'Replace Current Proof'
                      : 'Upload Proof Image'}
                </Text>
              </TouchableOpacity>

              {editVaccinationImage ? (
                <View style={styles.previewImageWrap}>
                  <Image
                    source={{ uri: editVaccinationImage.uri }}
                    style={styles.proofPreviewThumb}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeProofBtn}
                    onPress={() => setEditVaccinationImage(null)}
                  >
                    <Text style={styles.removeProofText}>Discard New Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Update Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, updatingAnimal && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleUpdateAnimal}
                disabled={updatingAnimal}
              >
                {updatingAnimal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Update Animal</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: RECORD DAILY MILK PROCUREMENT                 */}
      {/* ==================================================== */}
      <Modal
        visible={procurementModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProcurementModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="water" size={22} color={COLORS.brandGreen} />
                <Text style={styles.modalTitle}>Record Daily Procurement</Text>
              </View>
              <TouchableOpacity
                onPress={() => setProcurementModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Farmer #{farmer.farmer_id} - {farmer.farmer_name}
              </Text>

              {/* Shift Selector */}
              <Text style={styles.inputLabel}>Shift *</Text>
              <View style={styles.typeSelectorRow}>
                {(['Morning', 'Evening'] as const).map((shift) => {
                  const selected = procShift === shift;
                  return (
                    <TouchableOpacity
                      key={shift}
                      style={[styles.typeOption, selected && styles.typeOptionSelected]}
                      onPress={() => setProcShift(shift)}
                    >
                      <Ionicons
                        name={shift === 'Morning' ? 'sunny-outline' : 'moon-outline'}
                        size={15}
                        color={selected ? '#FFFFFF' : COLORS.textDark}
                      />
                      <Text style={[styles.typeOptionText, selected && styles.typeOptionTextSelected]}>
                        {shift}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Animal Selector */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Animal *</Text>
              {animals.length === 0 ? (
                <View style={styles.noProofWrap}>
                  <Text style={styles.noProofText}>No registered animals. Will record under Animal #1.</Text>
                </View>
              ) : (
                <View style={styles.animalChipWrap}>
                  {animals.map((a) => {
                    const selected = a.animal_id === procAnimalId;
                    return (
                      <TouchableOpacity
                        key={a.animal_id}
                        style={[styles.animalChip, selected && styles.animalChipSelected]}
                        onPress={() => {
                          setProcAnimalId(a.animal_id);
                          const r = calculateMilkRate(parseFloat(procFat) || 4.5, parseFloat(procSnf) || 8.5, a.animal_type);
                          setProcRate(r.toFixed(2));
                        }}
                      >
                        <Text style={[styles.animalChipText, selected && styles.animalChipTextSelected]}>
                          #{a.animal_id} ({a.animal_type})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Liters & Fat */}
              <View style={styles.inputGridRow}>
                <View style={styles.inputGridCol}>
                  <Text style={styles.inputLabel}>Quantity (L) *</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="10.0"
                    keyboardType="numeric"
                    value={procLiters}
                    onChangeText={setProcLiters}
                  />
                </View>

                <View style={styles.inputGridCol}>
                  <Text style={styles.inputLabel}>Fat % *</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="4.5"
                    keyboardType="numeric"
                    value={procFat}
                    onChangeText={handleProcFatChange}
                  />
                </View>
              </View>

              {/* SNF & Rate */}
              <View style={styles.inputGridRow}>
                <View style={styles.inputGridCol}>
                  <Text style={styles.inputLabel}>SNF % *</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="8.5"
                    keyboardType="numeric"
                    value={procSnf}
                    onChangeText={handleProcSnfChange}
                  />
                </View>

                <View style={styles.inputGridCol}>
                  <Text style={styles.inputLabel}>Price / L (₹) *</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="35.00"
                    keyboardType="numeric"
                    value={procRate}
                    onChangeText={setProcRate}
                  />
                </View>
              </View>

              {/* Live Preview */}
              <View style={styles.liveCalculationBox}>
                <Text style={styles.liveCalcTitle}>Live Total Amount:</Text>
                <Text style={styles.liveCalcFormula}>
                  {parseFloat(procLiters) || 0} Liters × ₹{parseFloat(procRate) || 0} / L
                </Text>
                <Text style={styles.liveCalcAmount}>
                  = ₹{calculateTotalAmount(parseFloat(procLiters) || 0, parseFloat(procRate) || 0).toFixed(2)}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingProcurement && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleSaveDailyProcurement}
                disabled={savingProcurement}
              >
                {savingProcurement ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Save Procurement</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: FULL PROOF IMAGE PREVIEW                     */}
      {/* ==================================================== */}
      <Modal
        visible={!!proofPreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setProofPreviewUrl(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setProofPreviewUrl(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>

          {proofPreviewUrl ? (
            <Image
              source={{ uri: proofPreviewUrl }}
              style={styles.fullPreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// SUB-COMPONENT: DETAIL ITEM
// ----------------------------------------------------

function DetailItem({
  icon,
  label,
  value,
  isLast = false,
  canCall = false,
  onCall,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  isLast?: boolean;
  canCall?: boolean;
  onCall?: () => void;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={styles.detailIconBox}>
        <Ionicons name={icon} size={18} color={COLORS.brandGreen} />
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || '-'}</Text>
      </View>

      {canCall ? (
        <TouchableOpacity style={styles.miniCallBtn} onPress={onCall}>
          <Ionicons name="call" size={14} color={COLORS.brandGreen} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------
// STYLES
// ----------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* Header */
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Scroll Content */
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Profile Card */
  profileCard: {
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
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#EDEDED',
    borderWidth: 3,
    borderColor: COLORS.brandGreenLight,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    gap: 5,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  farmerName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.headline,
    textAlign: 'center',
    marginTop: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  callBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    marginTop: 6,
  },
  callBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.headline,
    letterSpacing: 0.2,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2ED',
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.brandGreenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.headline,
  },
  miniCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandGreenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Animals Section */
  animalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  animalsSubhead: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  addAnimalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addAnimalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  animalsLoaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  animalsLoaderText: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  animalsErrorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  animalsErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '500',
  },
  animalsRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  animalsRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyAnimalsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAF7',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  emptyAnimalsIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAEFE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyAnimalsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headline,
    textAlign: 'center',
  },
  emptyAnimalsSubtitle: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  addFirstAnimalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  addFirstAnimalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Animal Cards List */
  animalCardsList: {
    gap: 12,
  },
  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  animalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  animalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  animalTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  animalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  animalMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F2ED',
  },
  animalMetaCol: {
    width: '46%',
  },
  animalMetaLabel: {
    fontSize: 11,
    color: COLORS.subtitle,
    marginBottom: 1,
  },
  animalMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.headline,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  proofLabel: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  viewProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  viewProofText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  noProofText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  animalCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 6,
  },
  animalEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  animalEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  animalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  animalDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },

  /* Bottom Actions */
  actionSection: {
    gap: 12,
    marginTop: 8,
  },
  updateButton: {
    backgroundColor: COLORS.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.brandGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Center States */
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
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.headline,
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
    backgroundColor: COLORS.brandGreen,
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

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2ED',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.headline,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.headline,
    marginBottom: 6,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
  },
  typeOptionSelected: {
    borderColor: COLORS.brandGreen,
    backgroundColor: COLORS.brandGreenLight,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.subtitle,
  },
  typeOptionTextSelected: {
    color: COLORS.brandGreen,
    fontWeight: '700',
  },
  customTypeInput: {
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: COLORS.headline,
    marginBottom: 6,
  },
  uploadProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.brandGreen,
    backgroundColor: COLORS.brandGreenLight,
    gap: 6,
  },
  uploadProofText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  previewImageWrap: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  proofPreviewThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#EDEDED',
  },
  removeProofBtn: {
    marginTop: 6,
  },
  removeProofText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  existingProofWrap: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  existingProofLabel: {
    fontSize: 11,
    color: COLORS.subtitle,
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    marginTop: 18,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Image Viewer */
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    right: 20,
    zIndex: 10,
  },
  fullPreviewImage: {
    width: '90%',
    height: '75%',
  },

  /* Daily Milk Procurement Section Styles */
  procurementListWrap: {
    gap: 12,
  },
  procurementDateCard: {
    backgroundColor: '#F8FAF7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6DF',
    padding: 14,
  },
  procHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  procDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  procDateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  procSummaryText: {
    fontSize: 13,
    color: COLORS.headline,
  },
  procShiftsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECE6',
    padding: 10,
    marginBottom: 10,
  },
  procShiftCol: {
    flex: 1,
    alignItems: 'center',
  },
  procShiftDivider: {
    width: 1,
    backgroundColor: '#ECECE8',
  },
  procShiftLabel: {
    fontSize: 11,
    color: COLORS.labelText,
    fontWeight: '600',
  },
  procShiftVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.headline,
    marginTop: 2,
  },
  procShiftSub: {
    fontSize: 10.5,
    color: '#8A8A80',
    marginTop: 2,
  },
  procCalcBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8ECE6',
    marginBottom: 10,
  },
  procCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  procCalcLabel: {
    fontSize: 12,
    color: COLORS.labelText,
  },
  procCalcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.headline,
  },
  procCalcFormula: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.labelText,
  },
  procTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.brandGreen,
  },
  procActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  procBillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 5,
  },
  procBillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  procSnfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 5,
  },
  procSnfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
  },
  animalChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  animalChip: {
    backgroundColor: '#F0F2EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  animalChipSelected: {
    backgroundColor: COLORS.brandGreen,
  },
  animalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.headline,
  },
  animalChipTextSelected: {
    color: '#FFFFFF',
  },
  noProofWrap: {
    backgroundColor: COLORS.amberLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  inputGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGridCol: {
    flex: 1,
  },
  numberInput: {
    backgroundColor: '#F5F7F4',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headline,
  },
  liveCalculationBox: {
    backgroundColor: COLORS.brandGreenLight,
    borderWidth: 1,
    borderColor: COLORS.brandGreenBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  liveCalcTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  liveCalcFormula: {
    fontSize: 12,
    color: COLORS.headline,
    marginTop: 2,
  },
  liveCalcAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.brandGreen,
    marginTop: 2,
  },
});
