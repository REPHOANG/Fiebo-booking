// src/pages/Profile.jsx - Integrated with Backend API
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, setProfile, updateProfile } from '../store/authSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faEye,
  faEyeSlash,
  faCog,
  faSignOutAlt,
  faArrowLeft,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from '../services/authService';
import '../pages/Profile.css';
import AnimatedBallBackground from '../components/AnimatedBallBackground';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, profile } = useSelector((state) => state.auth);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    // Load profile data on mount
    loadProfile();
  }, [user, token, navigate]);

  const [activeTab, setActiveTab] = useState('profile'); // profile, settings
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: profile?.fullName || user?.name || '',
    email: profile?.email || user?.email || '',
    phoneNumber: profile?.phoneNumber || user?.phone || '',
    dateOfBirth: profile?.dateOfBirth || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load profile from backend
  const loadProfile = async () => {
    try {
      const profileInfo = await getProfile(token);
      console.log('✅ Profile loaded:', profileInfo);
      dispatch(setProfile(profileInfo));
      setProfileData({
        fullName: profileInfo.fullName || '',
        email: profileInfo.email || '',
        phoneNumber: profileInfo.phoneNumber || '',
        dateOfBirth: profileInfo.dateOfBirth || '',
      });
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      // Don't show error toast as it might just mean profile endpoint not implemented yet
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!profileData.fullName || !profileData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Updating profile...');
      await updateProfileAPI(token, profileData);
      console.log('✅ Profile updated successfully');
      dispatch(updateProfile(profileData));
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('❌ Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(passwordData.newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(passwordData.newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(passwordData.newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (!/[\W_]/.test(passwordData.newPassword)) {
      toast.error('Password must contain at least one special character (!@#$%^&*)');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Changing password...');
      await changePasswordAPI(token, passwordData);
      console.log('✅ Password changed successfully');
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
    } catch (error) {
      console.error('❌ Password change error:', error);
      if (error.message.toLowerCase().includes('incorrect')) {
        toast.error('Current password is incorrect');
      } else {
        toast.error(error.message || 'Failed to change password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      console.log('📤 Logging out...');
      dispatch(logout());
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  return (
    <div className="profile-page">
    <AnimatedBallBackground />
      <div class="bg-element football"></div>
      <div class="bg-element basketball"></div>
      <div class="bg-element tennis"></div>
      <div class="bg-element shuttlecock"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="profile-container"
      >
        {/* Header */}
        <div className="profile-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <h1>My Account</h1>
          <button className="logout-btn" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FontAwesomeIcon icon={faEdit} /> Profile
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <FontAwesomeIcon icon={faCog} /> Settings
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="profile-content"
          >
            {!isEditingProfile ? (
              <>
                <div className="profile-info">
                  <div className="info-section">
                    <h3>Name</h3>
                    <p>{profileData.fullName || 'Not set'}</p>
                  </div>

                  <div className="info-section">
                    <h3>Email</h3>
                    <p>{profileData.email}</p>
                  </div>

                  <div className="info-section">
                    <h3>Phone Number</h3>
                    <p>{profileData.phoneNumber || 'Not set'}</p>
                  </div>

                  <div className="info-section">
                    <h3>Date of Birth</h3>
                    <p>{profileData.dateOfBirth || 'Not set'}</p>
                  </div>
                </div>

                <button
                  className="edit-btn"
                  onClick={() => setIsEditingProfile(true)}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faEdit} /> Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={profileData.fullName}
                    onChange={handleProfileChange}
                    disabled={isLoading}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    disabled={isLoading}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={handleProfileChange}
                    disabled={isLoading}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={handleProfileChange}
                    disabled={isLoading}
                    className="input-field"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="save-btn"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isLoading}
                    className="cancel-btn"
                  >
                    <FontAwesomeIcon icon={faTimes} /> Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="settings-content"
          >
            <h2>Security Settings</h2>

            {!isEditingPassword ? (
              <button
                className="change-password-btn"
                onClick={() => setIsEditingPassword(true)}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faCog} /> Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-wrapper">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      disabled={isLoading}
                      className="input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="toggle-password"
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-wrapper">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      disabled={isLoading}
                      className="input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="toggle-password"
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                  <p className="hint-text">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-wrapper">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={isLoading}
                      className="input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="toggle-password"
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="save-btn"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                    disabled={isLoading}
                    className="cancel-btn"
                  >
                    <FontAwesomeIcon icon={faTimes} /> Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
