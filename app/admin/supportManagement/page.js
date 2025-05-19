'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell, FaFilter, FaSearch, FaEnvelope, FaBuilding, FaUser, FaClock, FaCheck, FaTimes, FaSpinner, FaReply, FaFile } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';
import { toast } from 'sonner';

export default function AdminSupport() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketReplies, setTicketReplies] = useState([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.admin.permissions);
  const adminState = useSelector((state) => state.admin);

  // initialize the page
  useEffect(() => {
    const initAdminSupport = async () => {
      try {
        setLoading(true);
        
        // Set admin data from redux store
        if (adminState.admin) {
          setAdminData(adminState.admin);
        }
        
        // Fetch support tickets
        await fetchSupportTickets();
        
      } catch (error) {
        console.error('Errror in fetching support tickets:', error);
        // Redirect to admin login
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    initAdminSupport();
  }, [dispatch, router, adminState.admin]);
  
  // Add useEffect to fetch tickets when filter changes
  useEffect(() => {
    if (adminData) {
      fetchSupportTickets();
    }
  }, [filter]);

  // Add function to verify permission access
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };
  
  // Fetch support tickets
  const fetchSupportTickets = async () => {
    try {
      let query = supabase
        .from('contact')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply status filter if not 'all'
      if (filter !== 'all') {
        query = query.eq('status', filter.toUpperCase());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTickets(data || []);
      
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedTicket(null);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle ticket selection
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    
    // Fetch replies for this ticket
    await fetchTicketReplies(ticket.id);
    
    // Log activity
    if (adminData) {
      supabase.from('admin_activity_log').insert({
        admin_id: adminData.id,
        action: 'view_ticket',
        entity_type: 'contact',
        entity_id: ticket.id,
        ip_address: '127.0.0.1',
        user_agent: navigator.userAgent
      });
    }
  };
  
  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    
    try {
      const { error } = await supabase
        .from('contact')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
      
      // Update local state
      setSelectedTicket({
        ...selectedTicket,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // Show toast notification based on status
      if (newStatus === 'IN_PROGRESS') {
        toast.success(`Ticket #${selectedTicket.id} marked as Active`);
      } else if (newStatus === 'COMPLETED') {
        toast.success(`Ticket #${selectedTicket.id} marked as Closed`);
      } else if (newStatus === 'SPAM') {
        toast.warning(`Ticket #${selectedTicket.id} marked as Spam`);
      } else {
        toast.success(`Ticket #${selectedTicket.id} status updated to ${newStatus}`);
      }
      
      // Log activity
      if (adminData) {
        supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'update_ticket_status',
          entity_type: 'contact',
          entity_id: selectedTicket.id,
          details: { new_status: newStatus },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      // Refresh tickets to update the list with the new status
      fetchSupportTickets();
      
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error(`Failed to update ticket status: ${error.message}`);
    }
  };
  
  // Handle reply submission
  const handleReplySendEmail = async (e) => {
    e.preventDefault();
    
    if (!selectedTicket || !replyText.trim()) return;
    
    try {
      setIsSendingReply(true);
      const loadingToastId = toast.loading('Sending reply...'); // Store the loading toast ID

      // First save the reply to the database
      const { data: replyData, error: replyError } = await supabase
        .from('contact_reply')
        .insert({
          contact_id: selectedTicket.id,
          content: replyText,
          admin_id: adminData.id,
          is_from_contact: false,
          is_internal_note: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (replyError) throw replyError;

      // Send email using the API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedTicket.email,
          subject: `Re: Your Support Request #${selectedTicket.id}`,
          text: replyText,
          supportDetails: {
            responseText: replyText,
            originalMessage: selectedTicket.message || 'No message provided.',
            ticketId: selectedTicket.id
          }
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      // Update ticket status to IN_PROGRESS if it's NEW
      if (selectedTicket.status === 'NEW') {
        await handleStatusChange('IN_PROGRESS');
      }
      
      // Log the reply activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'reply_to_ticket',
          entity_type: 'contact',
          entity_id: selectedTicket.id,
          details: { message_preview: replyText.substring(0, 100) },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      // Clear reply text
      setReplyText('');
      
      // Refresh replies
      await fetchTicketReplies(selectedTicket.id);
      
      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToastId);
      toast.success(`Reply sent to ${selectedTicket.email} successfully!`);
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.dismiss(); // Dismiss any existing toasts
      toast.error(`Error sending reply: ${error.message}`);
    } finally {
      setIsSendingReply(false); // Reset sending state
    }
  };
  
  // Format date for display
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
  
  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'SPAM':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  // Filter tickets by search query
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (ticket.email && ticket.email.toLowerCase().includes(query)) ||
      (ticket.first_name && ticket.first_name.toLowerCase().includes(query)) ||
      (ticket.last_name && ticket.last_name.toLowerCase().includes(query)) ||
      (ticket.company_name && ticket.company_name.toLowerCase().includes(query)) ||
      (ticket.message && ticket.message.toLowerCase().includes(query))
    );
  });
  
  // Add this function after fetchSupportTickets
  const fetchTicketReplies = async (ticketId) => {
    try {
      const { data, error } = await supabase
        .from('contact_reply')
        .select(`
          *,
          admin_user:admin_id (
            username,
            full_name
          )
        `)
        .eq('contact_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setTicketReplies(data || []);
      
    } catch (error) {
      console.error('Error fetching ticket replies:', error);
      toast.error(`Failed to load replies: ${error.message}`);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Tickets List Skeleton */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                <div className="flex items-center mb-4">
                  <div className="relative flex-1">
                    <div className="w-full h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </div>
                  <div className="ml-2 p-2 w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                </div>
                
                <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex-1 py-2">
                      <div className="h-5 mx-auto w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                      </div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="flex items-center mt-2">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Ticket Details Skeleton */}
            <div className="w-full md:w-2/3 lg:w-3/4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="h-7 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-start mb-3">
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded mr-3"></div>
                          <div className="flex-1">
                            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
                            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((item) => (
                          <div key={item}>
                            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                </div>
                
                <div>
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                  <div className="flex justify-end">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        
        {/* Support Tickets Content */}
        {(hasPermission('view_support_tickets') || 
          hasPermission('reply_to_tickets') || 
          hasPermission('mark_support_tickets')) ? (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Tickets List */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
                <div className="flex items-center mb-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  <button className="ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                    <FaFilter />
                  </button>
                </div>
                
                <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`flex-1 py-2 text-sm font-medium ${filter === 'all' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleFilterChange('new')}
                    className={`flex-1 py-2 text-sm font-medium ${filter === 'new' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    New
                  </button>
                  <button
                    onClick={() => handleFilterChange('in_progress')}
                    className={`flex-1 py-2 text-sm font-medium ${filter === 'in_progress' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleFilterChange('completed')}
                    className={`flex-1 py-2 text-sm font-medium ${filter === 'completed' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    Closed
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id
                            ? 'bg-indigo-50 dark:bg-indigo-900'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {ticket.first_name && ticket.last_name
                              ? `${ticket.first_name} ${ticket.last_name}`
                              : ticket.email.split('@')[0]}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(ticket.status)}`}>
                            {ticket.status === 'IN_PROGRESS' ? 'Active' : ticket.status === 'NEW' ? 'New' : ticket.status === 'COMPLETED' ? 'Closed' : ticket.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {ticket.type === 'ENTERPRISE' ? 'Enterprise Inquiry' : 'General Support'}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <FaClock className="mr-1" />
                          {formatDate(ticket.created_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FaTicketAlt className="mx-auto text-3xl mb-2 opacity-30" />
                      <p>No tickets found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Ticket Details */}
            <div className="w-full md:w-2/3 lg:w-3/4">
              {selectedTicket ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedTicket.type === 'ENTERPRISE' ? 'Enterprise Inquiry' : 'General Support Request'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ticket #{selectedTicket.id} • Created {formatDate(selectedTicket.created_at)}
                      </p>
                    </div>
                    
                    {hasPermission('mark_support_tickets') && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={selectedTicket.status === 'IN_PROGRESS'}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          selectedTicket.status === 'IN_PROGRESS'
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                        }`}
                      >
                        <FaSpinner className="inline mr-1" />
                        Mark as Active
                      </button>
                      
                      <button
                        onClick={() => handleStatusChange('COMPLETED')}
                        disabled={selectedTicket.status === 'COMPLETED'}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          selectedTicket.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                        }`}
                      >
                        <FaCheck className="inline mr-1" />
                        Mark as Closed
                      </button>
                      
                      <button
                        onClick={() => handleStatusChange('SPAM')}
                        disabled={selectedTicket.status === 'SPAM'}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          selectedTicket.status === 'SPAM'
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                        }`}
                      >
                        <FaTimes className="inline mr-1" />
                        Mark as Spam
                      </button>
                    </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Contact Information</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start mb-3">
                          <FaEnvelope className="text-gray-400 mt-1 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{selectedTicket.email}</p>
                          </div>
                        </div>
                        
                        {selectedTicket.type === 'ENTERPRISE' && (
                          <>
                            <div className="flex items-start mb-3">
                              <FaUser className="text-gray-400 mt-1 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Name</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {selectedTicket.first_name} {selectedTicket.last_name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start mb-3">
                              <FaBuilding className="text-gray-400 mt-1 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Company</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {selectedTicket.company_name || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {selectedTicket.type === 'ENTERPRISE' && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Enterprise Details</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Role</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {selectedTicket.role || 'Not specified'}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Purchase Timeline</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {selectedTicket.purchase_timeline || 'Not specified'}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">User Quantity</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {selectedTicket.user_quantity || 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Message</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {selectedTicket.message || 'No message provided.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Reply History */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Reply History</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4 max-h-[400px] overflow-y-auto">
                      {ticketReplies.length > 0 ? (
                        ticketReplies.map((reply) => (
                          <div 
                            key={reply.id} 
                            className={`p-4 rounded-lg ${
                              reply.is_internal_note 
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800'
                                : reply.is_from_contact
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  reply.is_internal_note
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                    : reply.is_from_contact
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100'
                                }`}>
                                  {reply.is_from_contact 
                                    ? selectedTicket.first_name?.charAt(0).toUpperCase() || selectedTicket.email.charAt(0).toUpperCase()
                                    : reply.admin_user?.full_name?.charAt(0).toUpperCase() || reply.admin_user?.username?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {reply.is_from_contact 
                                      ? (selectedTicket.first_name && selectedTicket.last_name 
                                          ? `${selectedTicket.first_name} ${selectedTicket.last_name}`
                                          : selectedTicket.email)
                                      : (reply.admin_user?.full_name || reply.admin_user?.username || 'Admin')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(reply.created_at)}
                                  </p>
                                </div>
                              </div>
                              {reply.is_internal_note && (
                                <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                                  Internal Note
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line pl-11">
                              {reply.content}
                            </div>
                            
                            {reply.attachment_urls && reply.attachment_urls.length > 0 && (
                              <div className="mt-2 pl-11">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Attachments:</p>
                                <div className="flex flex-wrap gap-2">
                                  {reply.attachment_urls.map((url, index) => (
                                    <a
                                      key={index}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                                    >
                                      <FaFile className="mr-1" />
                                      {url.split('/').pop()}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <FaReply className="mx-auto text-3xl mb-2 opacity-30" />
                          <p>No replies yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {hasPermission('reply_to_tickets') && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Reply</h4>
                    <form onSubmit={handleReplySendEmail}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 min-h-[120px]"
                        required
                        disabled={isSendingReply}
                      ></textarea>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSendingReply || !replyText.trim()}
                          className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center ${
                            (isSendingReply || !replyText.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isSendingReply ? (
                            <>
                              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                              Sending...
                            </>
                          ) : (
                            <>
                              <FaReply className="mr-2" />
                              Send Reply
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>  
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col items-center justify-center h-[calc(100vh-180px)]">
                  <FaTicketAlt className="text-5xl text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Ticket Selected</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                    Select a ticket from the list to view details and respond to customer inquiries.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="min-h-screen flex items-center justify-center w-full">
          <AccessRestrictedModal />
        </div>
        )}
      </div>
    </div>
  );
}