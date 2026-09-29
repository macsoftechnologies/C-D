import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Base API Configuration
export const BASE_API_URL = 'http://macsof.in/milkmanagement/api';
export const AUTH_KEY = 'canandairyApi';

// ----------------------------------------------------
// LOGGER HELPER
// ----------------------------------------------------
function logApiRequest(url: string, method: string, dataOrParams: any) {
  console.log('====================================');
  console.log(`[API REQUEST] ${method.toUpperCase()} ${url}`);
  console.log('Headers: { "Auth-Key": "' + AUTH_KEY + '" }');
  if (dataOrParams instanceof FormData) {
    console.log('Body: [FormData payload]');
  } else {
    console.log('Body/Params:', JSON.stringify(dataOrParams, null, 2));
  }
  console.log('====================================');
}

function logApiResponse(url: string, status: number, data: any) {
  console.log('====================================');
  console.log(`[API RESPONSE] Status: ${status} ${url}`);
  console.log('Response Data:', JSON.stringify(data, null, 2));
  console.log('====================================');
}

function logApiError(url: string, error: any) {
  console.log('====================================');
  console.log(`[API ERROR] ${url}`);
  if (error?.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else if (error?.request) {
    console.log('No response received from server.');
  } else {
    console.log('Error Message:', error?.message);
  }
  console.log('====================================');
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 CanaanDairyApp';

// Global axios defaults ensure ANY direct axios call in the app also inherits proper headers
axios.defaults.headers.common['Auth-Key'] = AUTH_KEY;
axios.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
axios.defaults.headers.common['User-Agent'] = DEFAULT_USER_AGENT;

// ----------------------------------------------------
// AXIOS CLIENT
// ----------------------------------------------------
export const apiClient = axios.create({
  baseURL: BASE_API_URL,
  timeout: 20000,
  headers: {
    'Auth-Key': AUTH_KEY,
    'User-Agent': DEFAULT_USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['Auth-Key'] = AUTH_KEY;
  config.headers['User-Agent'] = DEFAULT_USER_AGENT;
  if (!config.headers['Accept']) {
    config.headers['Accept'] = 'application/json, text/plain, */*';
  }
  logApiRequest(`${config.baseURL || ''}${config.url || ''}`, config.method || 'GET', config.data || config.params);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    logApiResponse(response.config.url || '', response.status, response.data);
    return response;
  },
  async (error) => {
    logApiError(error.config?.url || '', error);
    const config = error.config;
    // Transient network retry with backoff for safe fetch operations
    if (
      config &&
      (!config._retryCount || config._retryCount < 2) &&
      (!error.response || error.response.status >= 500 || error.response.status === 465 || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) &&
      config.url &&
      !config.url.includes('create') &&
      !config.url.includes('delete') &&
      !config.url.includes('update')
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 800 * config._retryCount));
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

// ----------------------------------------------------
// INTERFACES
// ----------------------------------------------------

export interface Farmer {
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

export interface Animal {
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

export interface ProcurementRecordItem {
  procurement_id: string;
  admin_id: string;
  farmer_id: string;
  animal_id: string;
  code: string;
  fat: string;
  snf: string;
  liters: string;
  rate: string;
  amount: string;
  shift: 'Morning' | 'Evening';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftGroup {
  records: ProcurementRecordItem[];
}

export interface DailyProcurementDateGroup {
  date: string;
  morning_shift: ShiftGroup;
  evening_shift: ShiftGroup;
}

export interface FarmerProcurementResponse {
  status: number | string;
  message: string;
  farmer_details?: Farmer;
  procurement_data: DailyProcurementDateGroup[];
}

export interface SingleProcurementResponse {
  status: number | string;
  message: string;
  farmer_details?: Farmer;
  procurement_data: ProcurementRecordItem;
}

export interface CreateProcurementPayload {
  farmer_id: number | string;
  shift: 'Morning' | 'Evening';
  procurements: {
    animal_id: number | string;
    fat: number;
    snf: number;
    liters: number;
    rate: number;
  }[];
}

// ----------------------------------------------------
// IN-MEMORY CACHE UTILITIES
// ----------------------------------------------------
const farmersCache = new Map<string, { data: Farmer[]; timestamp: number }>();
const animalsCache = new Map<string, { data: Animal[]; timestamp: number }>();
const procurementCache = new Map<string, { data: FarmerProcurementResponse; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1-minute TTL

export function invalidateFarmerCache(admin_id?: string | number) {
  if (admin_id !== undefined && admin_id !== null) {
    farmersCache.delete(String(admin_id));
  } else {
    farmersCache.clear();
  }
  procurementCache.clear();
}

export function invalidateAnimalCache(farmer_id?: string | number) {
  if (farmer_id !== undefined && farmer_id !== null) {
    animalsCache.delete(String(farmer_id));
  } else {
    animalsCache.clear();
  }
}

// ----------------------------------------------------
// FARMER APIS
// ----------------------------------------------------

/**
 * Get farmers for a specific Sub-Admin / Admin ID
 * Endpoint: POST /api/getfarmersbyadmin
 */
export async function getFarmersByAdmin(
  admin_id: string | number,
  forceRefresh = false
): Promise<Farmer[]> {
  const cacheKey = String(admin_id);

  if (!forceRefresh) {
    const cached = farmersCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const res = await apiClient.post('/getfarmersbyadmin', {
      admin_id: Number(admin_id),
    });

    const isOk =
      res.data?.status === 200 ||
      res.data?.status === '200' ||
      res.data?.status === true;

    let list: Farmer[] = [];
    if (isOk && Array.isArray(res.data?.data)) {
      list = res.data.data;
    } else if (Array.isArray(res.data)) {
      list = res.data;
    }

    // Deduplicate by farmer_id
    const seen = new Set<string>();
    const uniqueList: Farmer[] = [];
    for (const f of list) {
      const fid = String(f.farmer_id);
      if (!seen.has(fid)) {
        seen.add(fid);
        uniqueList.push(f);
      }
    }

    farmersCache.set(cacheKey, { data: uniqueList, timestamp: Date.now() });
    return uniqueList;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      farmersCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    throw error;
  }
}

/**
 * Get Farmer details by Farmer ID
 * Endpoint: POST /api/farmergetbyid
 */
export async function getFarmerById(farmer_id: string | number): Promise<Farmer | null> {
  const res = await apiClient.post('/farmergetbyid', {
    farmer_id: Number(farmer_id),
  });

  const isOk =
    res.data?.status === 200 ||
    res.data?.status === '200' ||
    res.data?.status === true;

  if (isOk && res.data?.data) {
    return Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
  }
  return null;
}

/**
 * Create Farmer (formdata with photo)
 * Endpoint: POST /api/farmercreate
 */
export async function createFarmer(formData: FormData): Promise<{ status: number; message: string; farmer_id?: string | number; data?: any }> {
  logApiRequest(`${BASE_API_URL}/farmercreate`, 'POST', formData);
  const res = await axios.post(`${BASE_API_URL}/farmercreate`, formData, {
    headers: {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    transformRequest: (data: any) => data,
    timeout: 30000,
  });

  logApiResponse('/farmercreate', res.status, res.data);
  invalidateFarmerCache();
  return res.data;
}

/**
 * Update Farmer (formdata)
 * Endpoint: POST /api/farmerupdate
 */
export async function updateFarmer(formData: FormData): Promise<{ status: number; message: string; data?: any }> {
  logApiRequest(`${BASE_API_URL}/farmerupdate`, 'POST', formData);
  const res = await axios.post(`${BASE_API_URL}/farmerupdate`, formData, {
    headers: {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    transformRequest: (data: any) => data,
    timeout: 30000,
  });

  logApiResponse('/farmerupdate', res.status, res.data);
  invalidateFarmerCache();
  return res.data;
}

/**
 * Delete Farmer by Farmer ID
 * Endpoint: POST /api/farmerdelete
 */
export async function deleteFarmer(farmer_id: string | number): Promise<{ status: number; message: string }> {
  const res = await apiClient.post('/farmerdelete', {
    farmer_id: Number(farmer_id),
  });
  invalidateFarmerCache();
  invalidateAnimalCache(farmer_id);
  return res.data;
}

// ----------------------------------------------------
// ANIMAL APIS
// ----------------------------------------------------

/**
 * Get Animals by Farmer ID
 * Endpoint: POST /api/farmeridbyanimals
 */
export async function getAnimalsByFarmerId(
  farmer_id: string | number,
  forceRefresh = false
): Promise<Animal[]> {
  const cacheKey = String(farmer_id);

  if (!forceRefresh) {
    const cached = animalsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const res = await apiClient.post('/farmeridbyanimals', {
      farmer_id: Number(farmer_id),
    });

    const isOk =
      res.data?.status === 200 ||
      res.data?.status === '200' ||
      res.data?.status === true;

    if (isOk && Array.isArray(res.data?.data)) {
      animalsCache.set(cacheKey, { data: res.data.data, timestamp: Date.now() });
      return res.data.data;
    }
    animalsCache.set(cacheKey, { data: [], timestamp: Date.now() });
    return [];
  } catch (error: any) {
    // 404 or empty response means no animals yet for this farmer
    animalsCache.set(cacheKey, { data: [], timestamp: Date.now() });
    return [];
  }
}

/**
 * Get Animal by Animal ID
 * Endpoint: POST /api/animalgetbyid
 */
export async function getAnimalById(animal_id: string | number): Promise<Animal | null> {
  const res = await apiClient.post('/animalgetbyid', {
    animal_id: Number(animal_id),
  });

  const isOk =
    res.data?.status === 200 ||
    res.data?.status === '200' ||
    res.data?.status === true;

  if (isOk && res.data?.data) {
    return Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
  }
  return null;
}

/**
 * Create Animal for a Farmer
 * Endpoint: POST /api/animalcreate
 */
export async function createAnimal(formData: FormData): Promise<{ status: number; message: string; animal_id?: string | number }> {
  logApiRequest(`${BASE_API_URL}/animalcreate`, 'POST', formData);
  const res = await axios.post(`${BASE_API_URL}/animalcreate`, formData, {
    headers: {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    transformRequest: (data: any) => data,
    timeout: 30000,
  });

  logApiResponse('/animalcreate', res.status, res.data);
  animalsCache.clear();
  return res.data;
}

/**
 * Update Animal by Animal ID
 * Endpoint: POST /api/animalupdate
 */
export async function updateAnimal(formData: FormData): Promise<{ status: number; message: string }> {
  logApiRequest(`${BASE_API_URL}/animalupdate`, 'POST', formData);
  const res = await axios.post(`${BASE_API_URL}/animalupdate`, formData, {
    headers: {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    transformRequest: (data: any) => data,
    timeout: 30000,
  });

  logApiResponse('/animalupdate', res.status, res.data);
  animalsCache.clear();
  return res.data;
}

/**
 * Delete Animal by Animal ID
 * Endpoint: POST /api/animaldelete
 */
export async function deleteAnimal(animal_id: string | number): Promise<{ status: number; message: string }> {
  const res = await apiClient.post('/animaldelete', {
    animal_id: Number(animal_id),
  });
  animalsCache.clear();
  return res.data;
}

// ----------------------------------------------------
// DAILY PROCUREMENT & BILLING APIS
// ----------------------------------------------------

/**
 * Create Daily Procurement List
 * Endpoint: POST /api/createdailyprocurement
 */
export async function createDailyProcurement(
  payload: CreateProcurementPayload
): Promise<{ status: number; message: string; count?: number }> {
  const res = await apiClient.post('/createdailyprocurement', payload);
  return res.data;
}

/**
 * Get Procurement list by Farmer ID
 * Endpoint: POST /api/procurementbyfarmerid
 */
export async function getProcurementByFarmerId(
  farmer_id: string | number,
  forceRefresh = false
): Promise<FarmerProcurementResponse> {
  const cacheKey = String(farmer_id);

  if (!forceRefresh) {
    const cached = procurementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
  }

  try {
    const res = await apiClient.post('/procurementbyfarmerid', {
      farmer_id: Number(farmer_id),
    });
    procurementCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
    return res.data;
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data;
    }
    return {
      status: 404,
      message: error?.message || 'No procurement records found',
      procurement_data: [],
    };
  }
}

/**
 * Get Single Procurement by Procurement ID
 * Endpoint: POST /api/procurementbyid
 */
export async function getProcurementById(
  procurement_id: string | number
): Promise<SingleProcurementResponse> {
  const res = await apiClient.post('/procurementbyid', {
    procurement_id: Number(procurement_id),
  });
  return res.data;
}

// ----------------------------------------------------
// SNF & RATE CALCULATION UTILITIES
// ----------------------------------------------------

/**
 * Standard SNF Calculation Formula based on Lactometer Reading (CLR) and Fat%:
 * SNF = (CLR / 4) + (0.21 * Fat) + 0.36
 */
export function calculateSNFFromCLR(clr: number, fat: number): number {
  if (isNaN(clr) || isNaN(fat)) return 0;
  const snf = clr / 4 + 0.21 * fat + 0.36;
  return Number(snf.toFixed(2));
}

/**
 * Rate Calculation per liter based on Fat and SNF
 * Uses standard Two-Axis pricing chart matching Canaan Dairy API defaults:
 * e.g., Cow milk (Fat ~4.5, SNF ~8.5) -> ~₹35/L
 * e.g., Buffalo milk (Fat ~7.0, SNF ~9.0) -> ~₹45/L
 * Rate = (Fat * 4.0) + (SNF * 2.0)
 */
export function calculateMilkRate(fat: number, snf: number, animalType?: string): number {
  if (isNaN(fat) || isNaN(snf) || fat <= 0 || snf <= 0) {
    return animalType?.toLowerCase().includes('buffalo') ? 45.0 : 35.0;
  }
  // Two-axis formula
  const calculated = fat * 4.0 + snf * 2.0;
  return Number(calculated.toFixed(2));
}

/**
 * Calculate Total Milk
 * Total Milk = Morning Quantity + Evening Quantity
 */
export function calculateTotalMilk(morningLiters: number, eveningLiters: number): number {
  const m = isNaN(morningLiters) ? 0 : morningLiters;
  const e = isNaN(eveningLiters) ? 0 : eveningLiters;
  return Number((m + e).toFixed(2));
}

/**
 * Calculate Total Milk Amount
 * Total Milk Amount = Total Quantity * Price Per Liter
 */
export function calculateTotalAmount(liters: number, pricePerLiter: number): number {
  const l = isNaN(liters) ? 0 : liters;
  const p = isNaN(pricePerLiter) ? 0 : pricePerLiter;
  return Number((l * p).toFixed(2));
}

// ----------------------------------------------------
// AUTH / LOGIN APIS (Matches Postman "Admins Login")
// ----------------------------------------------------

export interface LoginUserdata {
  admin_id: string;
  admin_name: string;
  email: string;
  mobile_number: string;
  role_id: string;
  photo?: string;
  address?: string;
  status?: string;
}

export interface LoginApiResponse {
  status: number | string;
  message: string;
  userdata?: LoginUserdata;
  role_id?: string;
}

/**
 * Admins Login
 * Endpoint: POST /api/login
 * Headers: { "Auth-Key": "canandairyApi", "Content-Type": "application/json" }
 * Body: raw JSON { "email": "...", "password": "..." }
 * Supports both Super Admin and Sub-Admin logins.
 */
export async function loginAdmin(
  emailOrPhone: string,
  password: string
): Promise<LoginApiResponse> {
  const requestBody = JSON.stringify({
    email: emailOrPhone.trim(),
    password: password.trim(),
  });

  const res = await axios.post(`${BASE_API_URL}/login`, requestBody, {
    headers: {
      'Auth-Key': AUTH_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
    timeout: 20000,
  });

  return res.data;
}

