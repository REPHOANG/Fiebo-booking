// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faEye, faEyeSlash, faCog, faSignOutAlt, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import '../pages/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState('profile'); // profile, bookings, settings
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // API call to update profile
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };
  
  // Mock bookings data fix cứng
  const mockBookings = [
    {
      id: 1,
      courtName: 'Sân Bóng Đá Milan',
      date: '2026-02-15',
      time: '10:00 - 11:00',
      price: '500,000đ',
      status: 'confirmed'
    },
    {
      id: 2,
      courtName: 'Sân Tennis Premier Club',
      date: '2026-02-20',
      time: '14:00 - 15:30',
      price: '350,000đ',
      status: 'pending'
    }
  ];
  
//   if (!user) {
//     return (
//       <div className="profile-page">
//         <div className="container">
//           <div className="not-logged-in">
//             <h2>Please log in to view your profile</h2>
//             <button onClick={() => navigate('/login')} className="btn-primary">
//               Go to Login
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }
  
  return (
    <div className="profile-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="profile-container"
      >
        {/* Header */}
        <div className="profile-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <h1>My Profile</h1>
          <div></div>
        </div>
        
        {/* Profile Card */}
        <div className="profile-content">
          <div className="profile-sidebar">
            <div className="profile-card">
              <div className="avatar-section">
                <div className="avatar">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2>{user?.firstName || user?.email?.split('@')[0]}</h2>
                <p className="email">{user?.email}</p>
              </div>
              
              <div className="profile-nav">
                <button
                  className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FontAwesomeIcon icon={faEdit} /> Profile Info
                </button>
                <button
                  className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bookings')}
                >
                  📅 My Bookings
                </button>
                <button
                  className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <FontAwesomeIcon icon={faCog} /> Settings
                </button>
              </div>
              
              <button onClick={handleLogout} className="btn-logout">
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </button>
            </div>
          </div>
          
          <div className="profile-main">
            {/* Profile Info Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="tab-content"
              >
                <div className="section-header">
                  <h3>Personal Information</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`btn-edit ${isEditing ? 'cancel' : ''}`}
                  >
                    {isEditing ? 'Cancel' : <><FontAwesomeIcon icon={faEdit} /> Edit</>}
                  </button>
                </div>
                
                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="input-field"
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="input-field"
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                    
                    <button type="submit" disabled={isLoading} className="btn-save">
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                ) : (
                  <div className="info-display">
                    <div className="info-item">
                      <span className="label">First Name</span>
                      <span className="value">{user?.firstName || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Last Name</span>
                      <span className="value">{user?.lastName || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Email</span>
                      <span className="value">{user?.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Phone</span>
                      <span className="value">{user?.phone || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Date of Birth</span>
                      <span className="value">{user?.dateOfBirth || 'Not set'}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="tab-content"
              >
                <h3>My Bookings</h3>
                {mockBookings.length > 0 ? (
                  <div className="bookings-list">
                    {mockBookings.map(booking => (
                      <div key={booking.id} className="booking-card">
                        <div className="booking-info">
                          <h4>{booking.courtName}</h4>
                          <p>📅 {booking.date}</p>
                          <p>🕐 {booking.time}</p>
                        </div>
                        <div className="booking-details">
                          <span className={`status ${booking.status}`}>
                            {booking.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                          </span>
                          <p className="price">{booking.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No bookings yet</p>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="tab-content"
              >
                <h3>Change Password</h3>
                <form className="settings-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter current password"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  <button type="submit" className="btn-save">
                    Update Password
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
