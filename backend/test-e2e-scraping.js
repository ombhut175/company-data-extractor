/**
 * End-to-End Testing Script for Web Scraping Feature
 * Tests authentication flow and scraping functionality
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:6525';
const API_URL = `${BASE_URL}/api`;

// Test data
const testUser1 = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User 1'
};

const testUser2 = {
  email: `test-user2-${Date.now()}@example.com`,
  password: 'TestPassword456!',
  name: 'Test User 2'
};

let user1Token = null;
let user2Token = null;
let jobId = null;

// Helper function to log test results
function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Helper function to make authenticated requests
async function makeRequest(method, url, data = null, token = null, isFormData = false) {
  const config = {
    method,
    url: `${API_URL}${url}`,
    headers: {}
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    if (isFormData) {
      config.data = data;
      config.headers['Content-Type'] = 'multipart/form-data';
    } else {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
  }

  return axios(config);
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 Starting End-to-End Tests for Web Scraping Feature');
  console.log('='.repeat(80));

  try {
    // ========================================================================
    // 1. Application Health Check
    // ========================================================================
    console.log('\n📋 Section 1: Application Health Check');
    console.log('-'.repeat(80));

    try {
      const healthResponse = await axios.get(`${API_URL}`);
      logTest('Application is running', healthResponse.status === 200);
    } catch (error) {
      logTest('Application is running', false, error.message);
      return;
    }

    try {
      const swaggerResponse = await axios.get(`${BASE_URL}/api/docs`);
      logTest('Swagger documentation is accessible', swaggerResponse.status === 200);
    } catch (error) {
      logTest('Swagger documentation is accessible', false, error.message);
    }

    // ========================================================================
    // 2. Authentication Setup - User 1
    // ========================================================================
    console.log('\n📋 Section 2: Authentication Setup - User 1');
    console.log('-'.repeat(80));

    try {
      const signupResponse = await makeRequest('POST', '/auth/signup', {
        email: testUser1.email,
        password: testUser1.password,
        name: testUser1.name
      });

      const signupPassed = signupResponse.status === 201 && 
                          signupResponse.data.data.user;
      
      logTest('User 1 signup', signupPassed, 
        `User ID: ${signupResponse.data.data.user?.id}`);
    } catch (error) {
      logTest('User 1 signup', false, error.response?.data?.message || error.message);
      return;
    }

    try {
      const loginResponse = await makeRequest('POST', '/auth/login', {
        email: testUser1.email,
        password: testUser1.password
      });

      const loginPassed = loginResponse.status === 200 && 
                         loginResponse.data.data.tokens?.access_token;
      
      logTest('User 1 login', loginPassed);

      if (loginPassed) {
        user1Token = loginResponse.data.data.tokens.access_token;
        console.log(`   Token: ${user1Token.substring(0, 20)}...`);
      }
    } catch (error) {
      logTest('User 1 login', false, error.response?.data?.message || error.message);
      return;
    }

    // ========================================================================
    // 3. Scraping Feature Testing with Real Token
    // ========================================================================
    console.log('\n📋 Section 3: Scraping Feature Testing with Real Token');
    console.log('-'.repeat(80));

    // Test 3.1: Create job with mock server
    try {
      const mockServerResponse = await makeRequest('POST', '/scraping-jobs', {
        useMockServer: true
      }, user1Token);

      const mockServerPassed = mockServerResponse.status === 201 && 
                               mockServerResponse.data.data.jobId;
      
      logTest('Create job with mock server', mockServerPassed,
        `Job ID: ${mockServerResponse.data.data.jobId}`);

      if (mockServerPassed) {
        jobId = mockServerResponse.data.data.jobId;
      }
    } catch (error) {
      logTest('Create job with mock server', false, 
        error.response?.data?.message || error.message);
    }

    // Test 3.2: Create job with file upload
    try {
      // Create a test file with URLs
      const testUrls = [
        'http://localhost:3914/company',
        'http://localhost:3914/company',
        'http://localhost:3914/company'
      ];
      const testFilePath = path.join(__dirname, 'test-urls.txt');
      fs.writeFileSync(testFilePath, testUrls.join('\n'));

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));

      const fileUploadResponse = await axios.post(`${API_URL}/scraping-jobs`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${user1Token}`
        }
      });

      const fileUploadPassed = fileUploadResponse.status === 201 && 
                               fileUploadResponse.data.data.jobId;
      
      logTest('Create job with file upload', fileUploadPassed,
        `Job ID: ${fileUploadResponse.data.data.jobId}`);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    } catch (error) {
      logTest('Create job with file upload', false, 
        error.response?.data?.message || error.message);
    }

    // Test 3.3: List jobs
    try {
      const listJobsResponse = await makeRequest('GET', '/scraping-jobs', null, user1Token);

      const listJobsPassed = listJobsResponse.status === 200 && 
                            Array.isArray(listJobsResponse.data.data) &&
                            listJobsResponse.data.data.length > 0;
      
      logTest('List user jobs', listJobsPassed,
        `Found ${listJobsResponse.data.data.length} jobs`);
    } catch (error) {
      logTest('List user jobs', false, 
        error.response?.data?.message || error.message);
    }

    // Wait for background processing
    console.log('\n⏳ Waiting 5 seconds for background processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 3.4: Get job details
    if (jobId) {
      try {
        const jobDetailsResponse = await makeRequest('GET', `/scraping-jobs/${jobId}`, null, user1Token);

        const jobDetailsPassed = jobDetailsResponse.status === 200 && 
                                jobDetailsResponse.data.data.job &&
                                Array.isArray(jobDetailsResponse.data.data.items);
        
        logTest('Get job details', jobDetailsPassed,
          `Job status: ${jobDetailsResponse.data.data.job.status}, Items: ${jobDetailsResponse.data.data.items.length}`);

        // Check if items have extracted data
        const items = jobDetailsResponse.data.data.items;
        if (items.length > 0) {
          const hasExtractedData = items.some(item => 
            item.companyName || item.contacts
          );
          logTest('Items have extracted data', hasExtractedData,
            `Sample: ${items[0].companyName || 'No company name yet'}`);
        }
      } catch (error) {
        logTest('Get job details', false, 
          error.response?.data?.message || error.message);
      }
    }

    // Test 3.5: List scraping items
    try {
      const listItemsResponse = await makeRequest('GET', '/scraping-items', null, user1Token);

      const listItemsPassed = listItemsResponse.status === 200 && 
                             Array.isArray(listItemsResponse.data.data);
      
      logTest('List scraping items', listItemsPassed,
        `Found ${listItemsResponse.data.data.length} items`);
    } catch (error) {
      logTest('List scraping items', false, 
        error.response?.data?.message || error.message);
    }

    // ========================================================================
    // 4. Security Testing
    // ========================================================================
    console.log('\n📋 Section 4: Security Testing');
    console.log('-'.repeat(80));

    // Test 4.1: Invalid token
    try {
      await makeRequest('GET', '/scraping-jobs', null, 'invalid-token-12345');
      logTest('Reject invalid token', false, 'Should have returned 401');
    } catch (error) {
      const passed = error.response?.status === 401;
      logTest('Reject invalid token', passed, 
        `Status: ${error.response?.status}`);
    }

    // Test 4.2: Missing Authorization header
    try {
      await makeRequest('GET', '/scraping-jobs', null, null);
      logTest('Reject missing Authorization header', false, 'Should have returned 401');
    } catch (error) {
      const passed = error.response?.status === 401;
      logTest('Reject missing Authorization header', passed, 
        `Status: ${error.response?.status}`);
    }

    // Test 4.3: Cross-user access
    // Create second user
    try {
      const signup2Response = await makeRequest('POST', '/auth/signup', {
        email: testUser2.email,
        password: testUser2.password,
        name: testUser2.name
      });

      if (signup2Response.status === 201) {
        // Need to login to get token
        const login2Response = await makeRequest('POST', '/auth/login', {
          email: testUser2.email,
          password: testUser2.password
        });
        user2Token = login2Response.data.data.tokens.access_token;
        logTest('User 2 signup and login', true, `User ID: ${signup2Response.data.data.user.id}`);

        // Try to access User 1's job with User 2's token
        if (jobId && user2Token) {
          try {
            await makeRequest('GET', `/scraping-jobs/${jobId}`, null, user2Token);
            logTest('Prevent cross-user access', false, 'Should have returned 404');
          } catch (error) {
            const passed = error.response?.status === 404;
            logTest('Prevent cross-user access', passed, 
              `Status: ${error.response?.status} (404 prevents job existence leakage)`);
          }
        }
      }
    } catch (error) {
      logTest('User 2 signup', false, error.response?.data?.message || error.message);
    }

    // ========================================================================
    // 5. Background Processing Verification
    // ========================================================================
    console.log('\n📋 Section 5: Background Processing Verification');
    console.log('-'.repeat(80));

    console.log('\n📊 Bull Board is available at: http://localhost:6525/admin/queues');
    console.log('   Please manually verify:');
    console.log('   - scrape-queue appears in the queue list');
    console.log('   - Jobs are being processed');
    console.log('   - Job progress updates in real-time');

    // Wait a bit more for processing
    console.log('\n⏳ Waiting 10 more seconds for complete processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check final job status
    if (jobId && user1Token) {
      try {
        const finalJobResponse = await makeRequest('GET', `/scraping-jobs/${jobId}`, null, user1Token);
        const job = finalJobResponse.data.data.job;
        const items = finalJobResponse.data.data.items;

        console.log('\n📊 Final Job Status:');
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Total URLs: ${job.totalUrls}`);
        console.log(`   Processed: ${job.processedUrls}`);
        console.log(`   Failed: ${job.failedUrls}`);

        console.log('\n📊 Sample Item Data:');
        if (items.length > 0) {
          const sampleItem = items[0];
          console.log(`   URL: ${sampleItem.url}`);
          console.log(`   Status: ${sampleItem.status}`);
          console.log(`   Company Name: ${sampleItem.companyName || 'N/A'}`);
          console.log(`   Website: ${sampleItem.website || 'N/A'}`);
          console.log(`   Industry: ${sampleItem.industry || 'N/A'}`);
          console.log(`   Headcount: ${sampleItem.headcountRange || 'N/A'}`);
          console.log(`   Location: ${sampleItem.hqLocation || 'N/A'}`);
          console.log(`   Contacts: ${sampleItem.contacts ? JSON.stringify(sampleItem.contacts, null, 2) : 'N/A'}`);
          console.log(`   Last Error: ${sampleItem.lastError || 'None'}`);
        }

        const allProcessed = job.processedUrls === job.totalUrls;
        logTest('All items processed', allProcessed,
          `${job.processedUrls}/${job.totalUrls} items processed`);

        const hasExtractedData = items.some(item => item.companyName);
        logTest('HTML parsing extracted company data', hasExtractedData);

      } catch (error) {
        console.log('Error checking final job status:', error.message);
      }
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ End-to-End Testing Complete!');
    console.log('='.repeat(80));
    console.log('\n📝 Manual Verification Steps:');
    console.log('   1. Check Swagger docs: http://localhost:6525/api/docs');
    console.log('   2. Check Bull Board: http://localhost:6525/admin/queues');
    console.log('   3. Review application logs for structured logging');
    console.log('   4. Verify no sensitive data (tokens, passwords) in logs');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
runTests().catch(console.error);
