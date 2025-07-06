'use client';

import { FaBell, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import AdminProfileModal from './AdminProfileModal';

/**
 * Reusable header component for admin pages
 * @param {Object} props
 * @param {string} props.title - The page title to display
 * @param {Object} props.adminData - The admin user data
 * @param {Function} props.onAdminDataUpdate - Optional callback when admin data is updated
 * @param {React.ReactNode} props.extraContent - Optional additional content to display in the header (e.g., filters, date selectors)
 * @param {boolean} props.showThemeToggle - Whether to show the theme toggle button
 */
const AdminHeader = ({ 
  title, 
  adminData = null, 
  onAdminDataUpdate,
  extraContent,
  showThemeToggle = true
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [localAdminData, setLocalAdminData] = useState(adminData);

  // To avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local admin data when prop changes
  useEffect(() => {
    setLocalAdminData(adminData);
  }, [adminData]);

  // Handle theme toggle
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Handle profile updates
  const handleProfileUpdate = (updatedData) => {
    setLocalAdminData(updatedData);
    if (onAdminDataUpdate) {
      onAdminDataUpdate(updatedData);
    }
  };

  // Add truncateText helper if not present
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-8xl mx-auto px-2 sm:px-4 lg:px-">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {extraContent && (
              <div className="mr-2">{extraContent}</div>
            )}
            
            {showThemeToggle && mounted && (
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <FaSun /> : <FaMoon />}
              </button>
            )}
            
            {localAdminData && (
              <div 
                className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 rounded-lg transition-colors"
                onClick={() => setIsProfileModalOpen(true)}
              >
                {/* avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-indigo-500 text-white font-semibold mr-2">
                  {localAdminData?.avatar_url ? (
                    <img 
                      src={localAdminData.avatar_url} 
                      alt="Admin Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(localAdminData?.username || localAdminData?.name || '')?.charAt(0)?.toUpperCase() || 'A'}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {truncateText(localAdminData?.username || localAdminData?.name || 'Admin', 20)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {localAdminData && (
        <AdminProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          adminData={localAdminData}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </header>
  );
};

export default AdminHeader; 