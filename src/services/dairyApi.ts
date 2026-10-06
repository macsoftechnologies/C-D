import axios from 'axios';

// Base API Configuration matching Postman collection
export const BASE_API_URL = 'http://macsof.in/milkmanagement/api';
export const AUTH_KEY = 'canandairyApi';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 CanaanDairyApp';

/**
 * Normalizes image and media URLs.
 * Automatically upgrades HTTP URLs from backend database to HTTPS so Android and iOS
 * security policies do not reject them with Cleartext/Android internal error.
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  if (trimmed.startsWith('http://macsof.in')) {
    return trimmed.replace('http://macsof.in', 'https://macsof.in');
  }
  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }
  return trimmed;
}

// Global axios defaults ensure ANY direct axios call in the app also inherits proper headers
axios.defaults.headers.common['Auth-Key'] = AUTH_KEY;
axios.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
axios.defaults.headers.common['User-Agent'] = DEFAULT_USER_AGENT;

// ----------------------------------------------------
// AXIOS CLIENT
// ----------------------------------------------------
export const apiClient = axios.create({
  baseURL: BASE_API_URL,
  timeout: 25000,
  headers: {
    'Auth-Key': AUTH_KEY,
    'User-Agent': DEFAULT_USER_AGENT,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    config.headers['Auth-Key'] = AUTH_KEY;
    config.headers['User-Agent'] = DEFAULT_USER_AGENT;
    if (!config.headers['Accept']) {
      config.headers['Accept'] = 'application/json, text/plain, */*';
    }
    // Only set Content-Type to application/json if data is NOT FormData
    if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Graceful error logging to assist debugging without unhandled crashes
    const status = error?.response?.status;
    const url = error?.config?.url;
    if (status !== 404) {
      console.log(`[API Network Error] ${url || 'request'} status=${status || 'timeout/network'}:`, error?.message);
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
  booth_name?: string;
  total_amount?: number;
  total_liters?: number;
  total_procurements?: number;
  today_amount?: number;
  today_liters?: number;
  branch_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
}

export interface SubadminItem {
  admin_id: string;
  admin_name: string;
  email?: string;
  mobile_number?: string;
  photo?: string;
  address?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  role_id?: string;
  total_amount?: number;
  total_liters?: number;
  total_procurements?: number;
  today_amount?: number;
  today_liters?: number;
  total_farmers?: number;
  otp?: string;
  otp_expiry?: string | null;
  branch_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  farmers?: any[];
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
  admin_id?: number | string;
  shift: 'Morning' | 'Evening';
  procurements: {
    animal_id: number | string;
    fat: number;
    snf: number;
    liters: number;
    rate: number;
  }[];
}

export interface SendOtpResponse {
  status: number | string;
  message: string;
  admin_id?: string;
}

export interface SubadminBankDetailsPayload {
  admin_id: string | number;
  branch_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}

export interface FarmerBankDetailsPayload {
  farmer_id: string | number;
  branch_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
}

export interface BankDetailsResponse {
  status: number | string;
  message: string;
  data?: any;
}

export function normalizeSubadmin(item: SubadminItem): SubadminItem {
  if (!item) return item;
  return {
    ...item,
    photo: normalizeImageUrl(item.photo),
  };
}

export function normalizeFarmer(item: Farmer): Farmer {
  if (!item) return item;
  return {
    ...item,
    profile: normalizeImageUrl(item.profile),
  };
}

export function normalizeAnimal(item: Animal): Animal {
  if (!item) return item;
  return {
    ...item,
    vaccination_proof: normalizeImageUrl(item.vaccination_proof),
  };
}

// ----------------------------------------------------
// IN-MEMORY CACHE & REQUEST DEDUPLICATION
// ----------------------------------------------------
const subadminsCache = { data: [] as SubadminItem[], timestamp: 0 };
const subadminByIdCache = new Map<string, { data: SubadminItem; timestamp: number }>();
const farmersCache = new Map<string, { data: Farmer[]; timestamp: number }>();
const farmerByIdCache = new Map<string, { data: Farmer; timestamp: number }>();
const animalsCache = new Map<string, { data: Animal[]; timestamp: number }>();
const procurementCache = new Map<string, { data: FarmerProcurementResponse; timestamp: number }>();

const CACHE_TTL_MS = 3 * 60 * 1000; // 3-minute TTL for fast navigation & low network usage
const PROCUREMENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2-minute TTL for procurement records

// In-flight request deduplication map to prevent parallel duplicate calls
const inFlightRequests = new Map<string, Promise<any>>();

function dedupeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = requestFn()
    .finally(() => {
      inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, promise);
  return promise;
}

// Concurrency helper for running promises with maximum parallel limit
export async function batchAllSettled<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 8
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        const val = await fn(items[index]);
        results[index] = { status: 'fulfilled', value: val };
      } catch (err: any) {
        results[index] = { status: 'rejected', reason: err };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

export function invalidateSubadminCache() {
  subadminsCache.timestamp = 0;
  subadminsCache.data = [];
  subadminByIdCache.clear();
  farmersCache.clear();
}

export function invalidateFarmerCache(admin_id?: string | number) {
  if (admin_id !== undefined && admin_id !== null) {
    farmersCache.delete(String(admin_id));
  } else {
    farmersCache.clear();
  }
  farmersCache.delete('__ALL_FARMERS__');
  farmerByIdCache.clear();
  subadminByIdCache.clear();
}

export function invalidateAnimalCache(farmer_id?: string | number) {
  if (farmer_id !== undefined && farmer_id !== null) {
    animalsCache.delete(String(farmer_id));
  } else {
    animalsCache.clear();
  }
}

export function invalidateProcurementCache(farmer_id?: string | number) {
  if (farmer_id !== undefined && farmer_id !== null) {
    procurementCache.delete(String(farmer_id));
    farmerByIdCache.delete(String(farmer_id));
  } else {
    procurementCache.clear();
    farmerByIdCache.clear();
  }
  subadminByIdCache.clear();
}

// ----------------------------------------------------
// SUBADMIN APIS (Matches Postman "Subadmin" folder)
// ----------------------------------------------------

/**
 * Get all subadmins
 * Endpoint: GET /api/getallsubadmins
 */
export async function getAllSubadmins(forceRefresh = false): Promise<SubadminItem[]> {
  const isFresh = Date.now() - subadminsCache.timestamp < CACHE_TTL_MS;
  if (!forceRefresh && isFresh && subadminsCache.data.length > 0) {
    return subadminsCache.data;
  }

  return dedupeRequest('getAllSubadmins', async () => {
    try {
      const res = await apiClient.get('/getallsubadmins');
      const isOk =
        res.data?.status === 200 ||
        res.data?.status === '200' ||
        res.data?.status === true;

      if (isOk && Array.isArray(res.data?.data)) {
        const list = res.data.data.map(normalizeSubadmin);
        subadminsCache.data = list;
        subadminsCache.timestamp = Date.now();
        return list;
      }
      return [];
    } catch {
      return subadminsCache.data || [];
    }
  });
}

/**
 * Get Subadmin by ID
 * Endpoint: POST /api/subadminbyid
 */
export async function getSubadminById(
  admin_id: string | number,
  forceRefresh = false
): Promise<SubadminItem | null> {
  const cacheKey = String(admin_id);
  if (!forceRefresh) {
    const cached = subadminByIdCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeRequest(`getSubadminById_${cacheKey}`, async () => {
    try {
      const res = await apiClient.post('/subadminbyid', {
        admin_id: Number(admin_id),
      });

      const isOk =
        res.data?.status === 200 ||
        res.data?.status === '200' ||
        res.data?.status === true;

      if (isOk && res.data?.data) {
        const raw = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
        const item: SubadminItem = normalizeSubadmin(raw);
        subadminByIdCache.set(cacheKey, { data: item, timestamp: Date.now() });
        return item;
      }
      return null;
    } catch {
      return null;
    }
  });
}

/**
 * Subadmin Create
 * Endpoint: POST /api/subadmincreate
 * Formdata: admin_name, email, mobile_number, photo, address, password
 */
export async function createSubadmin(formData: FormData | Record<string, any>): Promise<any> {
  try {
    let payload: any = formData;
    let headers: any = {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
    };

    if (!(formData instanceof FormData)) {
      const fd = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          fd.append(key, formData[key]);
        }
      });
      payload = fd;
    }

    const res = await axios.post(`${BASE_API_URL}/subadmincreate`, payload, {
      headers,
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    invalidateSubadminCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to create Sub-Admin.',
    };
  }
}

/**
 * Subadmin Update
 * Endpoint: POST /api/subadminupdate
 * Formdata: admin_name, email, mobile_number, photo, address, password, admin_id
 */
export async function updateSubadmin(formData: FormData | Record<string, any>): Promise<any> {
  try {
    let payload: any = formData;
    let headers: any = {
      'Auth-Key': AUTH_KEY,
      'User-Agent': DEFAULT_USER_AGENT,
    };

    if (!(formData instanceof FormData)) {
      const fd = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          fd.append(key, formData[key]);
        }
      });
      payload = fd;
    }

    const res = await axios.post(`${BASE_API_URL}/subadminupdate`, payload, {
      headers,
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    invalidateSubadminCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to update Sub-Admin.',
    };
  }
}

/**
 * Subadmin Delete
 * Endpoint: POST /api/subadmindelete
 */
export async function deleteSubadmin(admin_id: string | number): Promise<any> {
  try {
    const res = await apiClient.post('/subadmindelete', {
      admin_id: Number(admin_id),
    });
    invalidateSubadminCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to delete Sub-Admin.',
    };
  }
}

/**
 * Change Password
 * Endpoint: POST /api/changepassword
 */
export async function changePassword(
  admin_id: string | number,
  password: string,
  newpassword: string
): Promise<any> {
  try {
    const res = await apiClient.post('/changepassword', {
      admin_id: Number(admin_id),
      password,
      newpassword,
    });
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err?.message || 'Failed to change password.',
      result: err?.response?.data?.result,
    };
  }
}

/**
 * Send OTP
 * Endpoint: POST /api/sendotp
 */
export async function sendOtp(email: string): Promise<SendOtpResponse> {
  try {
    const res = await apiClient.post('/sendotp', {
      email: email.trim(),
    });
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to send OTP.',
    };
  }
}

/**
 * Reset Password Or Forgotpassword
 * Endpoint: POST /api/resetpassword
 */
export async function resetPassword(
  admin_id: string | number,
  otp: string,
  newpassword: string
): Promise<any> {
  try {
    const res = await apiClient.post('/resetpassword', {
      admin_id: Number(admin_id),
      otp: otp.trim(),
      newpassword: newpassword.trim(),
    });
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to reset password.',
    };
  }
}

/**
 * Subadmin Bank Details Added / Updated
 * Endpoint: POST /api/subadminbankdetails
 * Body: { admin_id, branch_name, account_holder_name, account_number, ifsc_code }
 */
export async function addSubadminBankDetails(
  payload: SubadminBankDetailsPayload
): Promise<BankDetailsResponse> {
  try {
    const res = await apiClient.post('/subadminbankdetails', {
      admin_id: Number(payload.admin_id),
      branch_name: payload.branch_name.trim(),
      account_holder_name: payload.account_holder_name.trim(),
      account_number: payload.account_number.trim(),
      ifsc_code: payload.ifsc_code.trim(),
    });
    invalidateSubadminCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err?.message || 'Failed to add subadmin bank details.',
    };
  }
}

// ----------------------------------------------------
// FARMER APIS (Matches Postman "Farmers" folder)
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

  return dedupeRequest(`getFarmersByAdmin_${cacheKey}`, async () => {
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
        list = res.data.data.map(normalizeFarmer);
      } else if (Array.isArray(res.data)) {
        list = res.data.map(normalizeFarmer);
      }

      // Deduplicate by farmer_id and pre-cache individual records for instant overview
      const seen = new Set<string>();
      const uniqueList: Farmer[] = [];
      const now = Date.now();
      for (const f of list) {
        const fid = String(f.farmer_id);
        if (!seen.has(fid)) {
          seen.add(fid);
          uniqueList.push(f);
          // Pre-seed individual farmer cache so viewing details is instant (0ms)
          farmerByIdCache.set(fid, { data: f, timestamp: now });
        }
      }

      farmersCache.set(cacheKey, { data: uniqueList, timestamp: Date.now() });
      return uniqueList;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        farmersCache.set(cacheKey, { data: [], timestamp: Date.now() });
        return [];
      }
      const existing = farmersCache.get(cacheKey);
      return existing?.data || [];
    }
  });
}

/**
 * Get all farmers across all subadmins (Optimized Parallel Concurrent Fetch)
 */
export async function getAllFarmers(forceRefresh = false): Promise<Farmer[]> {
  const cacheKey = '__ALL_FARMERS__';
  if (!forceRefresh) {
    const cached = farmersCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeRequest('getAllFarmers', async () => {
    try {
      const subadmins = await getAllSubadmins(forceRefresh);
      if (!subadmins.length) return [];

      // Run all subadmin farmer fetches concurrently in parallel
      const settled = await Promise.allSettled(
        subadmins.map(async (s) => {
          const fList = await getFarmersByAdmin(s.admin_id, forceRefresh);
          return fList.map((f) => ({
            ...f,
            booth_name: f.booth_name || s.admin_name,
          }));
        })
      );

      const combined: Farmer[] = [];
      for (const res of settled) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          combined.push(...res.value);
        }
      }

      const seen = new Set<string>();
      const uniqueList: Farmer[] = [];
      const now = Date.now();
      for (const f of combined) {
        const fid = String(f.farmer_id);
        if (!seen.has(fid)) {
          seen.add(fid);
          uniqueList.push(f);
          // Pre-seed individual farmer cache
          farmerByIdCache.set(fid, { data: f, timestamp: now });
        }
      }

      farmersCache.set(cacheKey, { data: uniqueList, timestamp: Date.now() });
      return uniqueList;
    } catch {
      const existing = farmersCache.get(cacheKey);
      return existing?.data || [];
    }
  });
}

/**
 * Get Farmer details by Farmer ID
 * Endpoint: POST /api/farmergetbyid
 */
export async function getFarmerById(
  farmer_id: string | number,
  forceRefresh = false
): Promise<Farmer | null> {
  const cacheKey = String(farmer_id);

  if (!forceRefresh) {
    const cached = farmerByIdCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeRequest(`getFarmerById_${cacheKey}`, async () => {
    try {
      const res = await apiClient.post('/farmergetbyid', {
        farmer_id: Number(farmer_id),
      });

      const isOk =
        res.data?.status === 200 ||
        res.data?.status === '200' ||
        res.data?.status === true;

      if (isOk && res.data?.data) {
        const raw = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
        const farmer: Farmer = normalizeFarmer(raw);
        farmerByIdCache.set(cacheKey, { data: farmer, timestamp: Date.now() });
        return farmer;
      }
      return null;
    } catch {
      const cached = farmerByIdCache.get(cacheKey);
      return cached?.data || null;
    }
  });
}

/**
 * Create Farmer (formdata with photo)
 * Endpoint: POST /api/farmercreate
 */
export async function createFarmer(formData: FormData): Promise<{ status: number | string; message: string; farmer_id?: string | number; data?: any }> {
  try {
    const res = await axios.post(`${BASE_API_URL}/farmercreate`, formData, {
      headers: {
        'Auth-Key': AUTH_KEY,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    invalidateFarmerCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to create farmer.',
    };
  }
}

/**
 * Update Farmer (formdata)
 * Endpoint: POST /api/farmerupdate
 */
export async function updateFarmer(formData: FormData): Promise<{ status: number | string; message: string; data?: any }> {
  try {
    const res = await axios.post(`${BASE_API_URL}/farmerupdate`, formData, {
      headers: {
        'Auth-Key': AUTH_KEY,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    invalidateFarmerCache();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to update farmer.',
    };
  }
}

/**
 * Delete Farmer by Farmer ID
 * Endpoint: POST /api/farmerdelete
 */
export async function deleteFarmer(farmer_id: string | number): Promise<{ status: number | string; message: string }> {
  try {
    const res = await apiClient.post('/farmerdelete', {
      farmer_id: Number(farmer_id),
    });
    invalidateFarmerCache();
    invalidateAnimalCache(farmer_id);
    invalidateProcurementCache(farmer_id);
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to delete farmer.',
    };
  }
}

/**
 * Farmer Bank Details Added / Updated
 * Endpoint: POST /api/farmerbankdetails
 * Body: { farmer_id, branch_name, account_holder_name, account_number, ifsc_code }
 */
export async function addFarmerBankDetails(
  payload: FarmerBankDetailsPayload
): Promise<BankDetailsResponse> {
  try {
    const res = await apiClient.post('/farmerbankdetails', {
      farmer_id: Number(payload.farmer_id),
      branch_name: payload.branch_name.trim(),
      account_holder_name: payload.account_holder_name.trim(),
      account_number: payload.account_number.trim(),
      ifsc_code: payload.ifsc_code.trim(),
    });
    invalidateFarmerCache(payload.farmer_id);
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err?.message || 'Failed to add farmer bank details.',
    };
  }
}

// ----------------------------------------------------
// ANIMAL APIS (Matches Postman "Animals" folder)
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

  return dedupeRequest(`getAnimals_${cacheKey}`, async () => {
    try {
      const res = await apiClient.post('/farmeridbyanimals', {
        farmer_id: Number(farmer_id),
      });

      const isOk =
        res.data?.status === 200 ||
        res.data?.status === '200' ||
        res.data?.status === true;

      if (isOk && Array.isArray(res.data?.data)) {
        const list = res.data.data.map(normalizeAnimal);
        animalsCache.set(cacheKey, { data: list, timestamp: Date.now() });
        return list;
      }
      animalsCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    } catch {
      animalsCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
  });
}

/**
 * Get Animal by Animal ID
 * Endpoint: POST /api/animalgetbyid
 */
export async function getAnimalById(animal_id: string | number): Promise<Animal | null> {
  try {
    const res = await apiClient.post('/animalgetbyid', {
      animal_id: Number(animal_id),
    });

    const isOk =
      res.data?.status === 200 ||
      res.data?.status === '200' ||
      res.data?.status === true;

    if (isOk && res.data?.data) {
      const raw = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
      return normalizeAnimal(raw);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create Animal for a Farmer
 * Endpoint: POST /api/animalcreate
 */
export async function createAnimal(formData: FormData): Promise<{ status: number | string; message: string; animal_id?: string | number }> {
  try {
    const res = await axios.post(`${BASE_API_URL}/animalcreate`, formData, {
      headers: {
        'Auth-Key': AUTH_KEY,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    animalsCache.clear();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to create animal.',
    };
  }
}

/**
 * Update Animal by Animal ID
 * Endpoint: POST /api/animalupdate
 */
export async function updateAnimal(formData: FormData): Promise<{ status: number | string; message: string }> {
  try {
    const res = await axios.post(`${BASE_API_URL}/animalupdate`, formData, {
      headers: {
        'Auth-Key': AUTH_KEY,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      transformRequest: (data: any) => data,
      timeout: 30000,
    });

    animalsCache.clear();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to update animal.',
    };
  }
}

/**
 * Delete Animal by Animal ID
 * Endpoint: POST /api/animaldelete
 */
export async function deleteAnimal(animal_id: string | number): Promise<{ status: number | string; message: string }> {
  try {
    const res = await apiClient.post('/animaldelete', {
      animal_id: Number(animal_id),
    });
    animalsCache.clear();
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to delete animal.',
    };
  }
}

// ----------------------------------------------------
// DAILY PROCUREMENT & BILLING APIS (Matches Postman)
// ----------------------------------------------------

/**
 * Create Daily Procurement List
 * Endpoint: POST /api/createdailyprocurement
 */
export async function createDailyProcurement(
  payload: CreateProcurementPayload
): Promise<{ status: number | string; message: string; count?: number }> {
  try {
    const res = await apiClient.post('/createdailyprocurement', payload);
    // Invalidate ONLY the procurement cache and totals for this specific farmer, NOT the entire farmers list
    invalidateProcurementCache(payload.farmer_id);
    farmerByIdCache.delete(String(payload.farmer_id));
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) return err.response.data;
    return {
      status: 500,
      message: err?.message || 'Failed to record daily procurement.',
    };
  }
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
    if (cached && Date.now() - cached.timestamp < PROCUREMENT_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeRequest(`getProcurement_${cacheKey}`, async () => {
    try {
      const res = await apiClient.post('/procurementbyfarmerid', {
        farmer_id: Number(farmer_id),
      });
      const responseData = res.data || {};
      const normalizedFarmer = responseData.farmer_details ? normalizeFarmer(responseData.farmer_details) : undefined;
      const normalizedData: FarmerProcurementResponse = {
        status: responseData.status ?? 200,
        message: responseData.message || '',
        farmer_details: normalizedFarmer,
        procurement_data: Array.isArray(responseData.procurement_data)
          ? responseData.procurement_data
          : [],
      };
      procurementCache.set(cacheKey, { data: normalizedData, timestamp: Date.now() });
      if (normalizedFarmer) {
        farmerByIdCache.set(cacheKey, { data: normalizedFarmer, timestamp: Date.now() });
      }
      return normalizedData;
    } catch (error: any) {
      if (error?.response?.data) {
        const errData = error.response.data;
        const normalizedFarmer = errData.farmer_details ? normalizeFarmer(errData.farmer_details) : undefined;
        return {
          status: errData.status ?? 404,
          message: errData.message || 'No procurement records found',
          farmer_details: normalizedFarmer,
          procurement_data: Array.isArray(errData.procurement_data) ? errData.procurement_data : [],
        };
      }
      return {
        status: 404,
        message: error?.message || 'No procurement records found',
        procurement_data: [],
      };
    }
  });
}

/**
 * Get Single Procurement by Procurement ID
 * Endpoint: POST /api/procurementbyid
 */
export async function getProcurementById(
  procurement_id: string | number
): Promise<SingleProcurementResponse> {
  try {
    const res = await apiClient.post('/procurementbyid', {
      procurement_id: Number(procurement_id),
    });
    if (res.data?.farmer_details) {
      res.data.farmer_details = normalizeFarmer(res.data.farmer_details);
    }
    return res.data;
  } catch (err: any) {
    if (err?.response?.data) {
      if (err.response.data?.farmer_details) {
        err.response.data.farmer_details = normalizeFarmer(err.response.data.farmer_details);
      }
      return err.response.data;
    }
    return {
      status: 404,
      message: err?.message || 'Procurement not found.',
      procurement_data: null as any,
    };
  }
}

// ----------------------------------------------------
// SNF & RATE CALCULATION UTILITIES
// ----------------------------------------------------

export function calculateSNFFromCLR(clr: number, fat: number): number {
  if (isNaN(clr) || isNaN(fat)) return 0;
  const snf = clr / 4 + 0.21 * fat + 0.36;
  return Number(snf.toFixed(2));
}

export function calculateMilkRate(fat: number, snf: number, animalType?: string): number {
  if (isNaN(fat) || isNaN(snf) || fat <= 0 || snf <= 0) {
    return animalType?.toLowerCase().includes('buffalo') ? 45.0 : 35.0;
  }
  const calculated = fat * 4.0 + snf * 2.0;
  return Number(calculated.toFixed(2));
}

export function calculateTotalMilk(morningLiters: number, eveningLiters: number): number {
  const m = isNaN(morningLiters) ? 0 : morningLiters;
  const e = isNaN(eveningLiters) ? 0 : eveningLiters;
  return Number((m + e).toFixed(2));
}

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

export async function loginAdmin(
  emailOrPhone: string,
  password: string
): Promise<LoginApiResponse> {
  try {
    const res = await apiClient.post('/login', {
      email: emailOrPhone.trim(),
      password: password.trim(),
    });

    if (res.data?.userdata) {
      res.data.userdata = {
        ...res.data.userdata,
        photo: normalizeImageUrl(res.data.userdata.photo),
      };
    }

    return res.data;
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data;
    }
    return {
      status: 500,
      message: error?.message || 'Login failed. Please check your network connection.',
    };
  }
}

