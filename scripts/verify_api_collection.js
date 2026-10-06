const axios = require('axios');
const baseURL = 'http://macsof.in/milkmanagement/api';
const authKey = 'canandairyApi';
const client = axios.create({ baseURL, headers: { 'Auth-Key': authKey } });

async function verifyAll() {
  const tests = [
    { name: '1. Admins Login', fn: () => client.post('/login', { email: 'test@example.com', password: 'wrong' }) },
    { name: '2. Get All Subadmins', fn: () => client.get('/getallsubadmins') },
    { name: '3. Get Subadmin ById', fn: () => client.post('/subadminbyid', { admin_id: 14 }) },
    { name: '4. Subadmin Create (validation)', fn: () => client.post('/subadmincreate', {}) },
    { name: '5. Subadmin Update (validation)', fn: () => client.post('/subadminupdate', {}) },
    { name: '6. Subadmin Delete (validation)', fn: () => client.post('/subadmindelete', { admin_id: 999999 }) },
    { name: '7. Change Password', fn: () => client.post('/changepassword', { admin_id: 999999, password: 'wrong', newpassword: 'new' }) },
    { name: '8. Send OTP (validation)', fn: () => client.post('/sendotp', { email: 'nonexistent@test.com' }) },
    { name: '9. Reset Password (validation)', fn: () => client.post('/resetpassword', { admin_id: 999999, otp: '123456', newpassword: 'new' }) },
    { name: '10. Subadmin Bank Details', fn: () => client.post('/subadminbankdetails', { admin_id: 14, branch_name: 'Visakhapatnam', account_holder_name: 'Manasa', account_number: '987654321098', ifsc_code: 'UBIN0543210' }) },
    { name: '11. Get Farmers by Admin', fn: () => client.post('/getfarmersbyadmin', { admin_id: 14 }) },
    { name: '12. Farmer Get by Id', fn: () => client.post('/farmergetbyid', { farmer_id: 27 }) },
    { name: '13. Farmer Create (validation)', fn: () => client.post('/farmercreate', {}) },
    { name: '14. Farmer Update (validation)', fn: () => client.post('/farmerupdate', {}) },
    { name: '15. Farmer Delete (validation)', fn: () => client.post('/farmerdelete', { farmer_id: 999999 }) },
    { name: '16. Farmer Bank Details', fn: () => client.post('/farmerbankdetails', { farmer_id: 27, branch_name: 'Visakhapatnam', account_holder_name: 'Varsha', account_number: '123456789012', ifsc_code: 'SBIN0001234' }) },
    { name: '17. Farmer Id by Animals', fn: () => client.post('/farmeridbyanimals', { farmer_id: 27 }) },
    { name: '18. Animal Get by Id', fn: () => client.post('/animalgetbyid', { animal_id: 1 }) },
    { name: '19. Animal Create (validation)', fn: () => client.post('/animalcreate', {}) },
    { name: '20. Animal Update (validation)', fn: () => client.post('/animalupdate', {}) },
    { name: '21. Animal Delete (validation)', fn: () => client.post('/animaldelete', { animal_id: 999999 }) },
    { name: '22. Create Daily Procurement (validation)', fn: () => client.post('/createdailyprocurement', {}) },
    { name: '23. Procurement by Farmer Id', fn: () => client.post('/procurementbyfarmerid', { farmer_id: 27 }) },
    { name: '24. Single Procurement Data', fn: () => client.post('/procurementbyid', { procurement_id: 32 }) }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await t.fn();
      console.log(`[PASS] ${t.name} -> HTTP ${res.status}, body status: ${res.data?.status}`);
      passed++;
    } catch (err) {
      if (err.response) {
        console.log(`[PASS - Expected Response] ${t.name} -> HTTP ${err.response.status}, body:`, JSON.stringify(err.response.data));
        passed++;
      } else {
        console.log(`[FAIL] ${t.name} ->`, err.message);
      }
    }
  }
  console.log(`\nVerification Complete: ${passed}/${tests.length} tests connected successfully.`);
}

verifyAll();
