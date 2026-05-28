/**
 * ArxisVR - IFC E2E Test Suite
 * Automated end-to-end tests for IFC models module
 * 
 * Usage:
 *   node tests/e2e/ifc-e2e.test.js
 * 
 * Requirements:
 *   - Backend running on localhost:3001
 *   - PostgreSQL database connected
 *   - Test user credentials (test@arxisvr.com / Test123!@#)
 *   - Node.js >= 18.0.0 (native fetch & FormData)
 */

const baseURL = 'http://localhost:3001';
const testTimeout = 10000; // 10 seconds per test (file uploads are slower)

// Test state
let testAuth = null;
let testProject = null;
let uploadedModels = [];
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null
};

let results = [];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Logger with colors and timestamps
 */
function log(level, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const levelColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    debug: colors.gray
  };
  
  const levelEmojis = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warn: '⚠️ ',
    debug: '🔍'
  };
  
  const color = levelColors[level] || colors.reset;
  const emoji = levelEmojis[level] || '📝';
  
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${color}${emoji} ${message}${colors.reset}`);
  
  if (data) {
    console.log(colors.gray + JSON.stringify(data, null, 2) + colors.reset);
  }
}

/**
 * Test runner with timeout and error handling
 */
async function runTest(name, category, testFn) {
  stats.total++;
  const testId = stats.total;
  
  const startTime = Date.now();
  log('info', `[${testId}/${stats.total}] ${category} → ${name}`);
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), testTimeout)
    );
    
    await Promise.race([testFn(), timeoutPromise]);
    
    const duration = Date.now() - startTime;
    stats.passed++;
    results.push({ id: testId, name, category, status: 'PASSED', duration });
    log('success', `✓ ${name} (${duration}ms)`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    stats.failed++;
    results.push({ id: testId, name, category, status: 'FAILED', duration, error: error.message });
    log('error', `✗ ${name} (${duration}ms)`, { error: error.message });
  }
}

/**
 * Simple assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * HTTP request helper
 */
async function request(method, endpoint, options = {}) {
  const { body, headers = {}, auth = false } = options;
  
  const url = `${baseURL}${endpoint}`;
  
  const requestHeaders = {
    ...headers
  };
  
  // Only add Content-Type if there's a body
  if (body) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  
  if (auth && testAuth?.accessToken) {
    requestHeaders['Authorization'] = `Bearer ${testAuth.accessToken}`;
  }
  
  const fetchOptions = {
    method,
    headers: requestHeaders
  };
  
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  let data = null;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    data
  };
}

/**
 * Multipart request helper for file uploads
 */
async function uploadRequest(endpoint, formData, options = {}) {
  const { auth = true } = options;
  const url = `${baseURL}${endpoint}`;
  
  const requestHeaders = {};
  
  if (auth && testAuth?.accessToken) {
    requestHeaders['Authorization'] = `Bearer ${testAuth.accessToken}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body: formData
  });
  
  let data = null;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    data
  };
}

/**
 * Create minimal IFC file content for testing
 */
function createMockIfcFile(name = 'test-model.ifc') {
  // Minimal valid IFC2x3 file content
  const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${name}','2026-05-04T10:00:00',('E2E Test'),('ArxisVR'),'','','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCPROJECT('3cQl_dQTj0HQw_6LPVxW8g',$,'Test Project',$,$,$,$,(#2),#3);
#2=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-5,#4,$);
#3=IFCUNITASSIGNMENT((#5,#6,#7));
#4=IFCAXIS2PLACEMENT3D(#8,$,$);
#5=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#6=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#7=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#8=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;`;
  
  return new Blob([ifcContent], { type: 'application/x-step' });
}

/**
 * ========================================
 * TEST SUITES
 * ========================================
 */

/**
 * Setup - Login with test user
 */
async function setupAuthentication() {
  const loginResponse = await request('POST', '/api/v1/auth/login', {
    body: {
      email: 'test@arxisvr.com',
      password: 'Test123!@#'
    }
  });
  
  assert(loginResponse.ok, `Login failed: ${loginResponse.status}`);
  assert(loginResponse.data.accessToken, 'No access token received');
  
  testAuth = loginResponse.data;
  log('debug', `Token: ${testAuth.accessToken.substring(0, 50)}...`);
  log('info', `Authenticated as ${testAuth.user.email}`);
}

/**
 * Setup - Get or create test project
 */
async function setupTestProject() {
  // Try to get existing projects
  const listResponse = await request('GET', '/api/v1/projects', { auth: true });
  
  if (listResponse.ok && listResponse.data.length > 0) {
    testProject = listResponse.data[0];
    log('info', `Using existing project: ${testProject.name} (${testProject.id})`);
    return;
  }
  
  // If no projects, throw error - we need at least one project
  throw new Error('No projects found in database. Please create at least one project first.');
}

/**
 * Backend Health Tests
 */
async function testBackendHealth() {
  const response = await request('GET', '/health');
  
  assert(response.ok, `Health endpoint returned ${response.status}`);
  assert(response.data.status === 'healthy', `Backend not healthy: ${response.data.status}`);
  
  log('info', `Backend is healthy`);
}

/**
 * IFC Upload Tests
 */
async function testUploadIfcArchitecture() {
  const formData = new FormData();
  const ifcFile = createMockIfcFile('architecture-test.ifc');
  
  formData.append('file', ifcFile, 'architecture-test.ifc');
  formData.append('projectId', testProject.id);
  formData.append('discipline', 'architecture');
  formData.append('phase', 'new');
  formData.append('description', 'E2E test - Architecture model');
  
  const response = await uploadRequest('/api/v1/ifc/upload', formData);
  
  assert(response.ok, `Upload failed: ${response.status} - ${JSON.stringify(response.data)}`);
  assert(response.data.id, 'No model ID in response');
  assert(response.data.originalName === 'architecture-test.ifc', 'Original name mismatch');
  assert(response.data.discipline === 'architecture', 'Discipline mismatch');
  assert(response.data.phase === 'new', 'Phase mismatch');
  assert(response.data.projectId === testProject.id, 'Project ID mismatch');
  
  uploadedModels.push(response.data);
  log('info', `Uploaded architecture model: ${response.data.id}`);
}

async function testUploadIfcStructure() {
  const formData = new FormData();
  const ifcFile = createMockIfcFile('structure-test.ifc');
  
  formData.append('file', ifcFile, 'structure-test.ifc');
  formData.append('projectId', testProject.id);
  formData.append('discipline', 'structure');
  formData.append('phase', 'new');
  
  const response = await uploadRequest('/api/v1/ifc/upload', formData);
  
  assert(response.ok, `Upload failed: ${response.status}`);
  assert(response.data.discipline === 'structure', 'Discipline mismatch');
  
  uploadedModels.push(response.data);
  log('info', `Uploaded structure model: ${response.data.id}`);
}

async function testUploadIfcMEP() {
  const formData = new FormData();
  const ifcFile = createMockIfcFile('mep-electrical-test.ifc');
  
  formData.append('file', ifcFile, 'mep-electrical-test.ifc');
  formData.append('projectId', testProject.id);
  formData.append('discipline', 'mep_electrical');
  
  const response = await uploadRequest('/api/v1/ifc/upload', formData);
  
  assert(response.ok, `Upload failed: ${response.status}`);
  assert(response.data.discipline === 'mep_electrical', 'Discipline mismatch');
  
  uploadedModels.push(response.data);
  log('info', `Uploaded MEP electrical model: ${response.data.id}`);
}

/**
 * IFC List Tests
 */
async function testListProjectModels() {
  const response = await request('GET', `/api/v1/ifc/project/${testProject.id}`, { auth: true });
  
  assert(response.ok, `List failed: ${response.status}`);
  assert(Array.isArray(response.data), 'Response is not an array');
  assert(response.data.length >= 3, `Expected at least 3 models, got ${response.data.length}`);
  
  // Verify all uploaded models are in the list
  uploadedModels.forEach(uploaded => {
    const found = response.data.find(m => m.id === uploaded.id);
    assert(found, `Model ${uploaded.id} not found in list`);
  });
  
  log('info', `Listed ${response.data.length} models for project`);
}

async function testGetSingleModel() {
  const modelId = uploadedModels[0].id;
  const response = await request('GET', `/api/v1/ifc/${modelId}`, { auth: true });
  
  assert(response.ok, `Get model failed: ${response.status}`);
  assert(response.data.id === modelId, 'Model ID mismatch');
  assert(response.data.originalName, 'No original name');
  assert(response.data.discipline, 'No discipline');
  
  log('info', `Retrieved model: ${response.data.originalName}`);
}

/**
 * IFC Update Tests
 */
async function testUpdateModelMetadata() {
  const modelId = uploadedModels[0].id;
  const updates = {
    description: 'Updated via E2E test',
    phase: 'renovation'
  };
  
  const response = await request('PATCH', `/api/v1/ifc/${modelId}`, {
    auth: true,
    body: updates
  });
  
  assert(response.ok, `Update failed: ${response.status}`);
  assert(response.data.description === updates.description, 'Description not updated');
  assert(response.data.phase === updates.phase, 'Phase not updated');
  
  log('info', `Updated model metadata`);
}

async function testUploadThumbnail() {
  const modelId = uploadedModels[0].id;
  const thumbnailUrl = 'https://example.com/thumbnails/test.jpg';
  
  const response = await request('POST', `/api/v1/ifc/${modelId}/thumbnail`, {
    auth: true,
    body: { thumbnailUrl }
  });
  
  assert(response.ok, `Thumbnail upload failed: ${response.status}`);
  assert(response.data.thumbnailUrl === thumbnailUrl, 'Thumbnail URL mismatch');
  
  log('info', `Uploaded thumbnail URL`);
}

/**
 * IFC Stats Tests
 */
async function testProjectStorageStats() {
  const response = await request('GET', `/api/v1/ifc/project/${testProject.id}/stats`, { auth: true });
  
  assert(response.ok, `Stats failed: ${response.status}`);
  assert(response.data.totalSize >= 0, 'No total size');
  assert(response.data.modelCount >= 3, `Expected at least 3 models, got ${response.data.modelCount}`);
  assert(response.data.byDiscipline, 'No discipline breakdown');
  assert(response.data.byDiscipline.architecture, 'No architecture stats');
  
  log('info', `Storage stats: ${response.data.modelCount} models, ${response.data.totalSize} bytes`);
}

/**
 * IFC Download Tests
 */
async function testDownloadModel() {
  const modelId = uploadedModels[0].id;
  const token = testAuth.accessToken;
  const url = `${baseURL}/api/v1/ifc/${modelId}/download`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  assert(response.ok, `Download failed: ${response.status}`);
  
  const blob = await response.blob();
  assert(blob.size > 0, 'Downloaded file is empty');
  
  const contentDisposition = response.headers.get('content-disposition');
  assert(contentDisposition, 'No Content-Disposition header');
  
  log('info', `Downloaded model: ${blob.size} bytes`);
}

/**
 * IFC Delete Tests
 */
async function testDeleteModel() {
  const modelId = uploadedModels[uploadedModels.length - 1].id; // Delete last one
  
  const response = await request('DELETE', `/api/v1/ifc/${modelId}`, { auth: true });
  
  assert(response.ok, `Delete failed: ${response.status}`);
  assert(response.data.success === true, 'Delete not successful');
  assert(response.data.id === modelId, 'Deleted ID mismatch');
  
  // Verify it's actually deleted
  const getResponse = await request('GET', `/api/v1/ifc/${modelId}`, { auth: true });
  assert(!getResponse.ok, 'Model still exists after deletion');
  
  log('info', `Deleted model: ${modelId}`);
}

/**
 * IFC Error Handling Tests
 */
async function testUploadWithoutAuth() {
  const formData = new FormData();
  const ifcFile = createMockIfcFile('no-auth.ifc');
  
  formData.append('file', ifcFile, 'no-auth.ifc');
  formData.append('projectId', testProject.id);
  formData.append('discipline', 'architecture');
  
  const response = await uploadRequest('/api/v1/ifc/upload', formData, { auth: false });
  
  assert(!response.ok, 'Upload succeeded without auth');
  assert(response.status === 401, `Expected 401, got ${response.status}`);
  
  log('info', 'Upload correctly rejected without auth');
}

async function testUploadInvalidDiscipline() {
  const formData = new FormData();
  const ifcFile = createMockIfcFile('invalid-discipline.ifc');
  
  formData.append('file', ifcFile, 'invalid-discipline.ifc');
  formData.append('projectId', testProject.id);
  formData.append('discipline', 'invalid_discipline_xyz');
  
  const response = await uploadRequest('/api/v1/ifc/upload', formData);
  
  assert(!response.ok, 'Upload succeeded with invalid discipline');
  assert(response.status === 400, `Expected 400, got ${response.status}`);
  
  log('info', 'Upload correctly rejected invalid discipline');
}

async function testGetNonExistentModel() {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const response = await request('GET', `/api/v1/ifc/${fakeId}`, { auth: true });
  
  assert(!response.ok, 'Get succeeded for non-existent model');
  assert(response.status === 404, `Expected 404, got ${response.status}`);
  
  log('info', 'Get correctly returned 404 for non-existent model');
}

/**
 * ========================================
 * TEST EXECUTION
 * ========================================
 */

async function runAllTests() {
  console.log('\n' + colors.bright + colors.cyan + '╔════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║   ArxisVR - IFC E2E Test Suite             ║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╚════════════════════════════════════════════╝' + colors.reset + '\n');
  
  stats.startTime = Date.now();
  
  // Setup
  console.log(colors.bright + '\n📦 SETUP' + colors.reset);
  await runTest('Backend Health Check', 'Setup', testBackendHealth);
  await runTest('Authentication Setup', 'Setup', setupAuthentication);
  await runTest('Test Project Setup', 'Setup', setupTestProject);
  
  // Upload Tests
  console.log(colors.bright + '\n📤 IFC UPLOAD TESTS' + colors.reset);
  await runTest('Upload Architecture Model', 'Upload', testUploadIfcArchitecture);
  await runTest('Upload Structure Model', 'Upload', testUploadIfcStructure);
  await runTest('Upload MEP Electrical Model', 'Upload', testUploadIfcMEP);
  
  // List Tests
  console.log(colors.bright + '\n📋 IFC LIST TESTS' + colors.reset);
  await runTest('List Project Models', 'List', testListProjectModels);
  await runTest('Get Single Model', 'List', testGetSingleModel);
  
  // Update Tests
  console.log(colors.bright + '\n✏️  IFC UPDATE TESTS' + colors.reset);
  await runTest('Update Model Metadata', 'Update', testUpdateModelMetadata);
  await runTest('Upload Thumbnail', 'Update', testUploadThumbnail);
  
  // Stats Tests
  console.log(colors.bright + '\n📊 IFC STATS TESTS' + colors.reset);
  await runTest('Get Project Storage Stats', 'Stats', testProjectStorageStats);
  
  // Download Tests
  console.log(colors.bright + '\n⬇️  IFC DOWNLOAD TESTS' + colors.reset);
  await runTest('Download Model File', 'Download', testDownloadModel);
  
  // Delete Tests
  console.log(colors.bright + '\n🗑️  IFC DELETE TESTS' + colors.reset);
  await runTest('Delete Model', 'Delete', testDeleteModel);
  
  // Error Handling Tests
  console.log(colors.bright + '\n⚠️  ERROR HANDLING TESTS' + colors.reset);
  await runTest('Upload Without Auth', 'Error', testUploadWithoutAuth);
  await runTest('Upload Invalid Discipline', 'Error', testUploadInvalidDiscipline);
  await runTest('Get Non-Existent Model', 'Error', testGetNonExistentModel);
  
  // Summary
  stats.endTime = Date.now();
  printSummary();
}

/**
 * Print test summary
 */
function printSummary() {
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
  
  console.log('\n' + colors.bright + colors.cyan + '╔════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║           TEST SUMMARY                     ║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╚════════════════════════════════════════════╝' + colors.reset + '\n');
  
  console.log(`${colors.bright}Total Tests:${colors.reset}    ${stats.total}`);
  console.log(`${colors.green}Passed:${colors.reset}         ${stats.passed}`);
  console.log(`${colors.red}Failed:${colors.reset}         ${stats.failed}`);
  console.log(`${colors.yellow}Skipped:${colors.reset}        ${stats.skipped}`);
  console.log(`${colors.bright}Duration:${colors.reset}       ${duration}s`);
  console.log(`${colors.bright}Pass Rate:${colors.reset}      ${passRate}%\n`);
  
  if (stats.failed > 0) {
    console.log(colors.red + colors.bright + '❌ TESTS FAILED' + colors.reset + '\n');
    
    console.log(colors.bright + 'Failed Tests:' + colors.reset);
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  ${colors.red}✗${colors.reset} [${r.id}] ${r.category} → ${r.name}`);
      console.log(`    ${colors.gray}Error: ${r.error}${colors.reset}`);
    });
    console.log('');
    
    process.exit(1);
  } else {
    console.log(colors.green + colors.bright + '✅ ALL TESTS PASSED!' + colors.reset + '\n');
    process.exit(0);
  }
}

/**
 * Error handling
 */
process.on('unhandledRejection', (error) => {
  log('error', 'Unhandled rejection', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

/**
 * Run tests
 */
runAllTests().catch((error) => {
  log('error', 'Test suite failed', { error: error.message, stack: error.stack });
  process.exit(1);
});
