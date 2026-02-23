// Frontend Authentication Service - Connected to Backend API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7078';
const API_TIMEOUT = process.env.REACT_APP_API_TIMEOUT || 10000;

// Helper function to make API requests
const fetchAPI = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.message || `HTTP Error: ${response.status}`,
        data: data,
      };
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw {
        status: 408,
        message: `Request timeout (${API_TIMEOUT}ms)`,
      };
    }
    throw error;
  }
};

// Register new user - returns pending state waiting for OTP verification
export const register = async (data) => {
  try {
    console.log('📤 Sending to backend:', {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: '****',
      confirmPassword: '****',
      dateOfBirth: data.dateOfBirth,
    });

    const response = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        confirmPassword: data.confirmPassword,
        dateOfBirth: data.dateOfBirth,
      }),
    });

    return {
      success: true,
      message: response.message,
      email: data.email,
      phone: data.phoneNumber,
      // No user object or token yet - pending OTP verification
    };
  } catch (error) {
    // Extract detailed error message from backend validation
    let errorMessage = error.message || 'Registration failed';
    
    if (error.data?.errors) {
      // Handle validation errors object
      const errors = Object.values(error.data.errors);
      if (Array.isArray(errors) && errors.length > 0) {
        errorMessage = errors[0];
      }
    } else if (error.data?.message) {
      errorMessage = error.data.message;
    }
    
    console.error('❌ Backend error:', error.data || error);
    throw {
      message: errorMessage,
      details: errorMessage,
    };
  }
};

// Verify OTP and activate account
export const verifyOTP = async (email, otp) => {
  try {
    const response = await fetchAPI('/api/auth/activate', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        otp: otp,
      }),
    });

    return {
      success: true,
      message: response.message,
      statusCode: response.statusCode || 200,
    };
  } catch (error) {
    throw {
      message: error.message || 'OTP verification failed',
      details: error.data?.message || error.message,
      status: error.status,
    };
  }
};

// Login with email or phone
export const login = async (credentials) => {
  try {
    const payload = credentials.email
      ? { email: credentials.email, password: credentials.password }
      : { phoneNumber: credentials.phone, password: credentials.password };

    const response = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      user: {
        id: response.user?.userId || response.userId,
        email: response.user?.email || credentials.email,
        phone: response.user?.phoneNumber || credentials.phone,
        name: response.user?.name || response.name,
        role: response.user?.role || 'user',
        status: response.user?.status || 'active',
      },
      accessToken: response.accessToken || response.token,
      token: response.accessToken || response.token,
      expiresIn: response.expiresIn,
    };
  } catch (error) {
    const errorMsg = error.data?.message || error.message || 'Login failed';
    
    if (error.status === 401) {
      throw { message: 'Invalid credentials' };
    } else if (error.status === 404) {
      throw { message: 'User not found' };
    }
    
    throw { message: errorMsg };
  }
};

// Login with Google OAuth
export const loginWithGoogle = async (credential) => {
  try {
    const response = await fetchAPI('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ token: credential }),
    });

    return {
      user: {
        id: response.user?.userId,
        email: response.user?.email,
        name: response.user?.name,
        role: response.user?.role || 'user',
      },
      accessToken: response.accessToken || response.token,
      token: response.accessToken || response.token,
    };
  } catch (error) {
    throw {
      message: error.message || 'Google login failed',
    };
  }
};

// Refresh access token using refresh token
export const refreshToken = async (token) => {
  try {
    const response = await fetchAPI('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      accessToken: response.accessToken || response.token,
      expiresIn: response.expiresIn,
    };
  } catch (error) {
    throw { message: error.message || 'Token refresh failed' };
  }
};

// Logout (optional - could also just clear local state)
export const logout = async (token) => {
  try {
    await fetchAPI('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { success: true };
  } catch (error) {
    // Logout failures are non-critical
    console.warn('Logout warning:', error.message);
    return { success: true };
  }
};
