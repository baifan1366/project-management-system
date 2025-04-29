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
import { checkAdminSession } from '@/lib/redux/features/adminSlice';

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
  Filler
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
  const [paymentMethodData, setPaymentMethodData] = useState({ labels: [], datasets: [] });
  const [planDistributionData, setPlanDistributionData] = useState({ labels: [], datasets: [] });
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    successRate: 0
  });
  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.admin.permissions);

  // initialize the page
  useEffect(() => {
    const initAdminAnalytics = async () => {
      try {
        setLoading(true);
        
        // 获取分析数据
        await fetchAnalyticsData(dateRange);
        
      } catch (error) {
        console.error('Errror in fetching analytics data:', error);
        // 重定向到管理员登录
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    initAdminAnalytics();
  }, [dispatch, router]);

  // 当日期范围变化时获取新数据
  useEffect(() => {
    if (adminData) {
      fetchAnalyticsData(dateRange);
    }
  }, [dateRange, adminData]);
  
  // Add function to verify permission access TODO: 模块化这个代码
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  // 获取分析数据
  const fetchAnalyticsData = async (days) => {
    try {
      setLoading(true);
      
      // 获取日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));// how
      
      // 获取收入数据
      await fetchRevenueData(startDate, endDate);
      
      // 获取用户增长数据
      await fetchUserGrowthData(startDate, endDate);
      
      // 获取支付方式分布
      await fetchPaymentMethodDistribution();
      
      // 获取订阅计划分布
      await fetchPlanDistribution();
      
      // 获取摘要统计数据
      await fetchSummaryStatistics(startDate, endDate);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取收入数据
  const fetchRevenueData = async (startDate, endDate) => {
    try {
      // 获取日期范围内的支付数据
      const { data, error } = await supabase
        .from('payment')
        .select('amount, created_at, status')
        .gte('created_at', startDate.toISOString())// greater than or equal to
        .lte('created_at', endDate.toISOString())// less than or equal to
        .eq('status', 'COMPLETED')// equal to
        .order('created_at');// order by created_at
        
      if (error) throw error;
      
      // 按天汇总数据
      const dailyRevenue = {};
      const days = getDaysArray(startDate, endDate);
      
      // 初始化每天的收入为0
      days.forEach(day => {
        dailyRevenue[day] = 0;
      });
      
      // 计算每天的收入
      data.forEach(payment => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(payment.amount);
      });
      
      // 准备图表数据
      const chartData = {
        labels: Object.keys(dailyRevenue),
        datasets: [
          {
            label: 'Daily Revenue',
            data: Object.values(dailyRevenue),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
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
  
  // 获取用户增长数据
  const fetchUserGrowthData = async (startDate, endDate) => {
    try {
      // 获取日期范围内的新用户
      const { data, error } = await supabase
        .from('user')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');
        
      if (error) throw error;
      
      // 按天汇总数据
      const dailySignups = {};
      const days = getDaysArray(startDate, endDate);
      
      // 初始化每天的注册为0
      days.forEach(day => {
        dailySignups[day] = 0;
      });
      
      // 计算每天的注册
      data.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        dailySignups[date] = (dailySignups[date] || 0) + 1;
      });
      
      // 准备图表数据
      const chartData = {
        labels: Object.keys(dailySignups),
        datasets: [
          {
            label: 'New Users',
            data: Object.values(dailySignups),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            type: 'line',
            tension: 0.4,
          },
          {
            label: 'Daily Signups',
            data: Object.values(dailySignups),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            type: 'bar'
          }
        ]
      };
      
      setUserGrowthData(chartData);
      
    } catch (error) {
      console.error('Error fetching user growth data:', error);
    }
  };
  
  // 获取支付方式分布
  const fetchPaymentMethodDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('payment')
        .select('payment_method, count')
        .eq('status', 'COMPLETED')
        .not('payment_method', 'is', null);
        
      if (error) throw error;
      
      // 处理支付方法统计
      const paymentMethods = {};
      
      data.forEach(row => {
        const method = row.payment_method;
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      
      // 准备图表数据
      const labels = Object.keys(paymentMethods);
      const chartData = {
        labels: labels,
        datasets: [
          {
            data: Object.values(paymentMethods),
            backgroundColor: [
              'rgba(255, 99, 132, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)',
            ],
            borderWidth: 1
          }
        ]
      };
      
      setPaymentMethodData(chartData);
      
    } catch (error) {
      console.error('Error fetching payment method distribution:', error);
    }
  };
  
  // 获取订阅计划分布
  const fetchPlanDistribution = async () => {
    try {
      // 获取用户订阅计划统计
      const { data, error } = await supabase
        .from('user_subscription_plan')
        .select(`
          subscription_plan:plan_id (
            name,
            type
          ),
          count
        `)
        .eq('status', 'ACTIVE')
        .not('plan_id', 'is', null);
        
      if (error) throw error;
      
      // 处理计划分布
      const planCounts = {};
      
      data.forEach(subscription => {
        if (subscription.subscription_plan) {
          const planName = subscription.subscription_plan.name;
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        }
      });
      
      // 准备图表数据
      const chartData = {
        labels: Object.keys(planCounts),
        datasets: [
          {
            data: Object.values(planCounts),
            backgroundColor: [
              'rgba(255, 159, 64, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(153, 102, 255, 0.7)',
            ],
            borderWidth: 1
          }
        ]
      };
      
      setPlanDistributionData(chartData);
      
    } catch (error) {
      console.error('Error fetching plan distribution:', error);
    }
  };
  
  // 获取摘要统计数据
  const fetchSummaryStatistics = async (startDate, endDate) => {
    try {
      // 获取支付成功的订单
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment')
        .select('amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (paymentError) throw paymentError;
      
      // 计算总收入
      const completedPayments = paymentData.filter(p => p.status === 'COMPLETED');
      const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
                                            //累计  //累计器sum //累计的项   //从string转换成float       //sum的initial 
      // 计算平均订单价值 (completedPayments.length, totalRevenue)
      const averageOrderValue = completedPayments.length > 0 
        ? totalRevenue / completedPayments.length 
        : 0;
      
      // 计算支付成功率 (paymentData.length, completedPayments.length)
      const successRate = paymentData.length > 0 
        ? (completedPayments.length / paymentData.length) * 100 
        : 0;
      
      // 获取注册用户和付费用户 //todo: 拿正确的user 
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
      
      // 计算转化率
      const conversionRate = totalUsers > 0 
        ? (payingUsers / totalUsers) * 100 
        : 0;
      
      // 更新统计数据
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
  
  // 辅助函数 - 获取日期范围内的所有日期
  const getDaysArray = (start, end) => {
    const arr = [];
    const dt = new Date(start);
    
    while (dt <= end) {
      arr.push(new Date(dt).toISOString().split('T')[0]);
      dt.setDate(dt.getDate() + 1);
    }
    
    return arr;
  };
  
  // 格式化货币
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Chart.js 配置
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
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Payment Methods',
      },
    },
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
    {hasPermission('view_analytics') ? (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Analytics Dashboard</h2>
            
            <div className="flex items-center space-x-4">
              <div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
                  {adminData?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Analytics Content */}
        <main className="p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(summaryStats.totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-500 dark:text-green-300">
                  <FaMoneyBillWave />
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
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500 dark:text-blue-300">
                  <FaChartLine />
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
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-500 dark:text-purple-300">
                  <FaUsers />
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
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-500 dark:text-yellow-300">
                  <FaChartBar />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Completed transactions
                </p>
              </div>
            </div>
          </div>
          
          {/* Charts - Revenue and User Growth */}
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
          
          {/* Charts - Payment Methods and Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Payment Methods</h3>
              {paymentMethodData.labels.length > 0 ? (
                <div className="h-80">
                  <Pie data={paymentMethodData} options={pieOptions} />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No payment method data available</p>
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Subscription Plan Distribution</h3>
              {planDistributionData.labels.length > 0 ? (
                <div className="h-80">
                  <Pie 
                    data={planDistributionData} 
                    options={{
                      ...pieOptions,
                      plugins: {
                        ...pieOptions.plugins,
                        title: {
                          ...pieOptions.plugins.title,
                          text: 'Subscription Plans'
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No subscription plan data available</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    ) : (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page</p>
        </div>
      </div>
    )}
  </div>
  );
}
