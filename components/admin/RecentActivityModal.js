'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RecentActivityModal({ onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchActivities();
  }, [currentPage]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // First get the total count for pagination
      const { count, error: countError } = await supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;
      
      setTotalPages(Math.ceil(count / itemsPerPage));
      
      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          details,
          created_at,
          admin_user:admin_id (username, full_name)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      if (error) throw error;
      
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching admin activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Helper function to format message preview content
  const formatMessagePreview = (details) => {
    if (!details) return '—';
    
    try {
      // If it's already a string, return it
      if (typeof details === 'string') return details;
      
      // If it's an object, check for message_preview
      if (typeof details === 'object') {
        if (details.message_preview) {
          return details.message_preview;
        }
        
        // Try to parse if it's a stringified JSON
        if (typeof details === 'string') {
          try {
            const parsed = JSON.parse(details);
            if (parsed.message_preview) return parsed.message_preview;
          } catch (e) {
            // Not a valid JSON string, return as is
          }
        }
        
        // Otherwise stringify the object but make it pretty
        return JSON.stringify(details, null, 2)
          .replace(/[{}"]/g, '')
          .replace(/,\n\s*/g, ', ')
          .trim();
      }
      
      // Fallback
      return String(details);
    } catch (e) {
      console.error('Error formatting message preview:', e);
      return '—';
    }
  };

  // Generate empty rows for loading state
  const renderSkeletonRows = () => {
    return Array.from({ length: itemsPerPage }).map((_, index) => (
      <tr key={`skeleton-${index}`} className="animate-pulse">
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
        </td>
        <td className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Admin Recent Activity
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  renderSkeletonRows()
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {activity.admin_user?.full_name || activity.admin_user?.username || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {typeof activity.action === 'string' ? activity.action.replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {activity.entity_type ? (
                          <span className="capitalize">
                            {activity.entity_type.replace(/_/g, ' ')} {activity.entity_id ? `#${activity.entity_id}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs relative group hover:cursor-pointer">
                        <div className="truncate">
                          {formatMessagePreview(activity.details)}
                        </div>
                        
                        {activity.details && activity.details !== '—' && (
                          <div className="hidden group-hover:block absolute z-10 left-0 mt-1 w-72 bg-white dark:bg-gray-700 shadow-lg rounded-md p-3 border border-gray-200 dark:border-gray-600 transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0">
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {formatMessagePreview(activity.details)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {activity.created_at ? formatDate(activity.created_at) : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No activity records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
} 