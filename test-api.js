const axios = require('axios');

async function testAPI() {
  try {
    // First, let's test if the server is running
    console.log('Testing server connection...');
    const healthCheck = await axios.get('http://localhost:5000/api/auth/me');
    console.log('Server is running');
  } catch (error) {
    console.log('Server connection failed:', error.message);
  }

  try {
    // Test the teacher questions endpoint
    console.log('Testing teacher questions endpoint...');
    const response = await axios.get('http://localhost:5000/api/teacher/student-questions/questions');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Teacher questions endpoint failed:', error.response?.data || error.message);
  }
}

testAPI();
