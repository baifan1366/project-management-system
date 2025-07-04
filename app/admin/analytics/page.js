'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaChartLine, FaBell, FaCalendarAlt, FaUsers, FaMoneyBillWave, FaChartPie, FaChartBar } from 'react-icons/fa';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useSelector, useDispatch } from 'react-redux';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';
import { toast } from 'sonner';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler,
  ChartDataLabels
);

export default function AdminAnalytics() {
  const router = useRouter();
  const params = useParams();
  
  // 状态变量
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');  // 默认30天
  const [revenueData, setRevenueData] = useState({ labels: [], datasets: [] });
  const [userGrowthData, setUserGrowthData] = useState({ labels: [], datasets: [] });
  const [paymentMethodData, setPaymentMethodData] = useState({ 
    count: { labels: [], datasets: [] },
    volume: { labels: [], datasets: [] }
  });
  const [planDistributionData, setPlanDistributionData] = useState({ labels: [], datasets: [] });
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    successRate: 0
  });
  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.admin.permissions);
  const [activePaymentView, setActivePaymentView] = useState('count');
  const [activePlanView, setActivePlanView] = useState('count');
  const [planDetails, setPlanDetails] = useState([]);
  const [paymentTotals, setPaymentTotals] = useState({ transactions: 0, volume: 0 });
  const [planTotals, setPlanTotals] = useState({ subscribers: 0, revenue: 0 });

  // initialize the page
  useEffect(() => {
    let isSubscribed = true;  // For cleanup

    const initAdminAnalytics = async () => {
      if (!isSubscribed) return;
      
      try {
        setLoading(true);
        await fetchAnalyticsData(dateRange);
      } catch (error) {
        console.error('Error in fetching analytics data:', error);
        if (isSubscribed) {
          router.replace(`/admin/adminLogin`);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };
    
    initAdminAnalytics();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, [dateRange, router]); // Add router to dependencies

  // Add function to verify permission access TODO: 模块化这个代码
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  // 获取分析数据
  const fetchAnalyticsData = async (days) => {
    // Create loading toast and store its ID
    const loadingToastId = toast.loading('Updating analytics data...', {
      description: `Fetching data for the last ${days} days`,
    });

    try {
      setLoading(true);
      
      // 获取日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days));

      // Clear existing data
      setRevenueData({ labels: [], datasets: [] });
      setUserGrowthData({ labels: [], datasets: [] });
      setPaymentMethodData({ 
        count: { labels: [], datasets: [] },
        volume: { labels: [], datasets: [] }
      });
      setPlanDistributionData({ labels: [], datasets: [] });
      setSummaryStats({
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        successRate: 0
      });
      
      await fetchRevenueData(startDate, endDate);
      
      await fetchUserGrowthData(startDate, endDate);
      
      await fetchPaymentMethodDistribution(startDate, endDate);
      
      await fetchPlanDistribution(startDate, endDate);
      
      await fetchSummaryStatistics(startDate, endDate);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success('Analytics updated', {
        description: `Successfully loaded data for the last ${days} days`,
        duration: 3000, // 3 seconds
      });
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);
      toast.error('Failed to update analytics', {
        description: 'There was an error fetching the analytics data',
        duration: 5000, // 5 seconds for error messages
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRevenueData = async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('amount, created_at, status')
        .gte('created_at', startDate.toISOString())// greater than or equal to
        .lte('created_at', endDate.toISOString())// less than or equal to
        .eq('status', 'COMPLETED')// equal to
        .order('created_at');// order by created_at
        
      if (error) throw error;
      
      const dailyRevenue = {};
      const days = getDaysArray(startDate, endDate);
      
      days.forEach(day => {
        dailyRevenue[day] = 0;
      });
      
      data.forEach(payment => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(payment.amount);
      });
      
      const chartData = {
        labels: Object.keys(dailyRevenue),
        datasets: [
          {
            label: 'Daily Revenue',
            data: Object.values(dailyRevenue),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.5)',
            tension: 0.4,
            fill: true
          }
        ]
      };
      
      setRevenueData(chartData);
      
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };
  
  const fetchUserGrowthData = async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');
        
      if (error) throw error;
      
      const dailySignups = {};
      const days = getDaysArray(startDate, endDate);
      
      days.forEach(day => {
        dailySignups[day] = 0;
      });

      data.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        dailySignups[date] = (dailySignups[date] || 0) + 1;
      });
      
      const chartData = {
        labels: Object.keys(dailySignups),
        datasets: [
          {
            label: 'New Users',
            data: Object.values(dailySignups),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.5)',
            type: 'line',
            tension: 0.4,
          },
          {
            label: 'Daily Signups',
            data: Object.values(dailySignups),
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            type: 'bar'
          }
        ]
      };
      
      setUserGrowthData(chartData);
      
    } catch (error) {
      console.error('Error fetching user growth data:', error);
    }
  };
  
  const fetchPaymentMethodDistribution = async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('payment_method, amount, status')
        .eq('status', 'COMPLETED')
        .not('payment_method', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (error) throw error;
      
      const paymentMethods = {};
      const paymentAmounts = {};
      const paymentColors = {
        'credit_card': 'rgba(255, 99, 132, 0.7)',
        'paypal': 'rgba(54, 162, 235, 0.7)',
        'bank_transfer': 'rgba(255, 206, 86, 0.7)',
        'apple_pay': 'rgba(75, 192, 192, 0.7)',
        'google_pay': 'rgba(153, 102, 255, 0.7)',
        'wechat_pay': 'rgba(255, 159, 64, 0.7)',
        'alipay': 'rgba(201, 203, 207, 0.7)',
        'other': 'rgba(100, 120, 140, 0.7)'
      };
      
      const formatMethodName = (method) => {
        return method
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };
      
      let totalTransactions = 0;
      let totalVolume = 0;
      
      data.forEach(payment => {
        const method = payment.payment_method;
        const amount = parseFloat(payment.amount);
        
        // Count transactions per method
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        totalTransactions += 1;
        
        // Sum amount per method
        paymentAmounts[method] = (paymentAmounts[method] || 0) + amount;
        totalVolume += amount;
      });
      
      // Update totals
      setPaymentTotals({
        transactions: totalTransactions,
        volume: totalVolume
      });
      
      // Prepare chart data
      const labels = Object.keys(paymentMethods).map(formatMethodName);
      const backgroundColors = Object.keys(paymentMethods).map(method => 
        paymentColors[method] || 'rgba(100, 120, 140, 0.7)' // Default color if not in mapping
      );
      
      const chartData = {
        labels: labels,
        datasets: [
          {
            label: 'Transaction Count',
            data: Object.values(paymentMethods),
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1,
            hoverOffset: 4
          }
        ]
      };
      
      // Add a second dataset with payment amounts
      const amountChartData = {
        labels: labels,
        datasets: [
          {
            label: 'Payment Volume',
            data: Object.keys(paymentMethods).map(method => paymentAmounts[method]),
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1,
            hoverOffset: 4
          }
        ]
      };
      
      // Update state with both datasets
      setPaymentMethodData({
        count: chartData,
        volume: amountChartData
      });
      
    } catch (error) {
      console.error('Error fetching payment method distribution:', error);
    }
  };
  
  const fetchPlanDistribution = async (startDate, endDate) => {
    try {
      const { data: planData, error: planError } = await supabase
        .from('subscription_plan')
        .select('id, name, type, price');
        
      if (planError) throw planError;
      
      const plansById = {};
      planData.forEach(plan => {
        plansById[plan.id] = {
          ...plan,
          subscribers: 0,
          revenue: 0
        };
      });
      
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscription_plan')
        .select('plan_id')
        .eq('status', 'ACTIVE')
        .not('plan_id', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (subscriptionError) throw subscriptionError;
      
      let totalSubscribers = 0;
      let totalRevenue = 0;
      
      subscriptionData.forEach(subscription => {
        const planId = subscription.plan_id;
        if (plansById[planId]) {
          plansById[planId].subscribers += 1;
          plansById[planId].revenue += parseFloat(plansById[planId].price || 0);
          
          totalSubscribers += 1;
          totalRevenue += parseFloat(plansById[planId].price || 0);
        }
      });
      
      setPlanTotals({
        subscribers: totalSubscribers,
        revenue: totalRevenue
      });
      
      const planDetailsArray = Object.values(plansById)
        .filter(plan => plan.subscribers > 0)
        .sort((a, b) => b.subscribers - a.subscribers);
      
      setPlanDetails(planDetailsArray);
      const labels = planDetailsArray.map(plan => plan.name);
      const subscriberCounts = planDetailsArray.map(plan => plan.subscribers);
      const revenueValues = planDetailsArray.map(plan => plan.revenue);
      
      const planColors = [
        'rgba(79, 70, 229, 0.9)',  // indigo-600, 90% opacity
        'rgba(79, 70, 229, 0.7)',  // indigo-600, 70% opacity
        'rgba(79, 70, 229, 0.5)',  // indigo-600, 50% opacity
        'rgba(79, 70, 229, 0.3)',  // indigo-600, 30% opacity
        'rgba(79, 70, 229, 0.15)', // indigo-600, 15% opacity
        'rgba(79, 70, 229, 0.1)',  // indigo-600, 10% opacity
        'rgba(79, 70, 229, 0.05)', // indigo-600, 5% opacity
        'rgba(79, 70, 229, 0.025)' // indigo-600, 2.5% opacity
      ];
      
      // Ensure we have enough colors
      const backgroundColors = planColors.slice(0, labels.length);
      
      // Create chart data for subscribers
      const countChartData = {
        labels,
        datasets: [
          {
            label: 'Subscribers',
            data: subscriberCounts,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            hoverOffset: 4
          }
        ]
      };
      
      // Create chart data for revenue
      const revenueChartData = {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueValues,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            hoverOffset: 4
          }
        ]
      };
      
      // Update state with both datasets
      setPlanDistributionData({
        count: countChartData,
        revenue: revenueChartData
      });
      
    } catch (error) {
      console.error('Error fetching plan distribution:', error);
      // Set empty data to avoid rendering errors
      setPlanDistributionData({
        count: { labels: [], datasets: [] },
        revenue: { labels: [], datasets: [] }
      });
      setPlanDetails([]);
    }
  };
  
  const fetchSummaryStatistics = async (startDate, endDate) => {
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment')
        .select('amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (paymentError) throw paymentError;
      
      const completedPayments = paymentData.filter(p => p.status === 'COMPLETED');
      const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const averageOrderValue = completedPayments.length > 0 
        ? totalRevenue / completedPayments.length 
        : 0;
      
      const successRate = paymentData.length > 0 
        ? (completedPayments.length / paymentData.length) * 100 
        : 0;
      
      const { count: totalUsers } = await supabase
        .from('user')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      const { count: payingUsers } = await supabase
        .from('user_subscription_plan')
        .select('id', { count: 'exact', head: true })
        .neq('plan_id', '1')// paid user
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const conversionRate = totalUsers > 0 
        ? (payingUsers / totalUsers) * 100 
        : 0;
      
      setSummaryStats({
        totalRevenue,
        averageOrderValue,
        conversionRate,
        successRate
      });
      
    } catch (error) {
      console.error('Error fetching summary statistics:', error);
    }
  };
  
  const getDaysArray = (start, end) => {
    const arr = [];
    const dt = new Date(start);
    
    while (dt <= end) {
      arr.push(new Date(dt).toISOString().split('T')[0]);
      dt.setDate(dt.getDate() + 1);
    }
    
    return arr;
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };
  
  const lineOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Trend',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'User Growth',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: 'Payment Methods',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold'
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          return percentage > 5 ? `${percentage}%` : '';
        }
      }
    },
    cutout: '50%'
  };
  
  // Create separate options for plan distribution chart
  const planPieOptions = {
    ...pieOptions,
    plugins: {
      ...pieOptions.plugins,
      title: {
        display: true,
        text: 'Plan Distribution',
        font: {
          size: 16
        }
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        
        {/* Analytics Content */}
        {hasPermission('view_analytics') ? (
          <div className="p-6">
            {/* Period Selector - Always visible */}
            <div className="mb-8">
              <div className="flex items-center justify-end">
                <div className="flex items-center space-x-4">
                  <label htmlFor="period" className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Time Period:
                  </label>
                  <select
                    id="period"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200 hover:border-indigo-400 dark:hover:border-indigo-400"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="180">Last 6 Months</option>
                    <option value="365">Last Year</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <>
                {/* Summary Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                          <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {[1, 2].map((chart) => (
                    <div key={chart} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                      <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
                        <div className="h-40 w-40 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse opacity-50"></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map((chart) => (
                    <div key={chart} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                      <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
                        <div className="h-60 w-60 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse opacity-50"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(summaryStats.totalRevenue)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        For the selected period
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Order Value</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(summaryStats.averageOrderValue)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Per successful transaction
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{summaryStats.conversionRate.toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Users to paid subscribers
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Success Rate</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{summaryStats.successRate.toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Completed transactions
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Line and Bar Charts for Revenue and User Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue Trend</h3>
                    {revenueData.labels.length > 0 ? (
                      <div className="h-80">
                        <Line data={revenueData} options={lineOptions} />
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">No revenue data available for the selected period</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Growth</h3>
                    {userGrowthData.labels.length > 0 ? (
                      <div className="h-80">
                        <Bar data={userGrowthData} options={barOptions} />
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">No user growth data available for the selected period</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Pie Charts for Payment Methods and Plan Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Payment Methods</h3>
                    
                    {paymentMethodData && paymentMethodData.count && paymentMethodData.count.labels.length > 0 ? (
                      <div>
                        <div className="flex justify-between mb-4">
                          <div className="flex space-x-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Transactions</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-white">{paymentTotals.transactions}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Volume</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-white">{formatCurrency(paymentTotals.volume)}</p>
                            </div>
                          </div>
                          <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                              type="button"
                              onClick={() => setActivePaymentView('count')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mr-1 ${
                                activePaymentView === 'count'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              Transaction Count
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePaymentView('volume')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                activePaymentView === 'volume'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              Payment Volume
                            </button>
                          </div>
                        </div>
                        <div className="h-80">
                          <Pie data={activePaymentView === 'count' ? paymentMethodData.count : paymentMethodData.volume} options={pieOptions} />
                        </div>
                        
                        <div className="mt-6 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {paymentMethodData.count.labels.map((label, index) => (
                                <tr key={label}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{label}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{paymentMethodData.count.datasets[0].data[index]}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{formatCurrency(paymentMethodData.volume.datasets[0].data[index])}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">No payment method data available for the selected period</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Plan Distribution</h3>
                    {planDistributionData && planDistributionData.count && planDistributionData.count.labels.length > 0 ? (
                      <div>
                        <div className="flex justify-between mb-4">
                          <div className="flex space-x-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Subscribers</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-white">{planTotals.subscribers}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-white">{formatCurrency(planTotals.revenue)}</p>
                            </div>
                          </div>
                          <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                              type="button"
                              onClick={() => setActivePlanView('count')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mr-1 ${
                                activePlanView === 'count'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              Subscribers
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePlanView('revenue')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                activePlanView === 'revenue'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              Revenue
                            </button>
                          </div>
                        </div>
                        <div className="h-80">
                          <Pie 
                            data={activePlanView === 'count' ? planDistributionData.count : planDistributionData.revenue} 
                            options={planPieOptions} 
                          />
                        </div>
                        
                        <div className="mt-6 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subscribers</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {planDetails.map((plan) => (
                                <tr key={plan.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{plan.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {plan.type.charAt(0).toUpperCase() + plan.type.slice(1).toLowerCase()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(plan.price)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{plan.subscribers}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{formatCurrency(plan.revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">No plan distribution data available for the selected period</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <AccessRestrictedModal />
        )}
      </div>
    </div>
  );
}
