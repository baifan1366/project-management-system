'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell, FaFilter, FaSearch, FaEnvelope, FaBuilding, FaUser, FaClock, FaCheck, FaTimes, FaSpinner, FaReply } from 'react-icons/fa';

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
  
  // Verify admin session and fetch admin data
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error('No active session found');
        }
        
        // Check if user is an admin
        const { data: admin, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', sessionData.session.user.email)
          .eq('is_active', true)
          .single();
          
        if (adminError || !admin) {
          throw new Error('Unauthorized access');
        }
        
        setAdminData(admin);
        
        // Fetch support tickets
        await fetchSupportTickets();
        
      } catch (error) {
        console.error('Admin session check failed:', error);
        // Redirect to admin login
        router.replace(`/${locale}/admin/login`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);
  
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
  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    
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
      
      // Refresh ticket list
      fetchSupportTickets();
      
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
      
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };
  
  // Handle reply submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTicket || !replyText.trim()) return;
    
    try {
      // In a real application, you would send an email here
      // This is a placeholder for the email sending logic
      console.log(`Sending reply to ${selectedTicket.email}:`, replyText);
      
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
      
      // Show success message (in a real app, you'd use a toast notification)
      alert('Reply sent successfully!');
      
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };
  
  // Handle admin logout
  const handleLogout = async () => {
    try {
      // Log the logout action
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'logout',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      // Sign out
      await supabase.auth.signOut();
      
      // Redirect to admin login
      router.replace(`/${locale}/admin/login`);
      
    } catch (error) {
      console.error('Error during logout:', error);
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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading support tickets...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Support Tickets</h2>
            
            <div className="flex items-center">
              <button className="p-2 mr-4 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                <FaBell />
              </button>
              
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
                  {adminData?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{adminData?.full_name || adminData?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{adminData?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Support Tickets Content */}
        <main className="p-6">
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
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Reply</h4>
                    <form onSubmit={handleReplySubmit}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 min-h-[120px]"
                        required
                      ></textarea>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center"
                        >
                          <FaReply className="mr-2" />
                          Send Reply
                        </button>
                      </div>
                    </form>
                  </div>
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
        </main>
      </div>
    </div>
  );
}