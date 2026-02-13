// Dummy authentication service
// Replace with your actual API calls

export const login = async (credentials) => {
  // Replace with actual API call
  console.log('Login with:', credentials);
  
  // For now, return mock response
  return {
    user: {
      id: '1',
      email: credentials.email || credentials.phone,
      role: 'user'
    },
    accessToken: 'mock_token_123',
    token: 'mock_token_123'
  };
};

export const register = async (data) => {
  // Replace with actual API call
  console.log('Register with:', data);
  
  // For now, return mock response
  return {
    user: {
      id: '1',
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      role: 'user'
    },
    accessToken: 'mock_token_456',
    token: 'mock_token_456'
  };
};

export const loginWithGoogle = async (credential) => {
  // Replace with actual Google OAuth validation
  console.log('Login with Google credential:', credential);
  
  return {
    user: {
      id: '1',
      email: 'user@google.com',
      role: 'user'
    },
    accessToken: 'mock_google_token_123',
    token: 'mock_google_token_123'
  };
};
