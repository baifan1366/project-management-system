'use client'; // 使用客户端组件
import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { supabase } from '@/lib/supabase';
import { useGetUser } from '../../../lib/hooks/useGetUser';
import { toast } from 'sonner';
import { selectCurrentPlan } from '@/lib/redux/features/planSlice';

export default function ContactUs(){
    const router = useRouter();
    const { user, isLoading: userLoading } = useGetUser();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userSubscription, setUserSubscription] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const currentUserPlan = useSelector(selectCurrentPlan);

    // Move all state declarations to the top
    const [selectedOption, setSelectedOption] = useState('general');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedTimeline, setSelectedTimeline] = useState('');
    const [selectedUserQty, setSelectedUserQty] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [messageSent, setMessageSent] = useState(false);
    const [targetPlan, setTargetPlan] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            // Only check subscription if user is authenticated
            if (user?.id) {
                setIsAuthenticated(true);
                try {
                    const { data: subscriptionData, error } = await supabase
                        .from('user_subscription_plan')
                        .select(`
                            *,
                            subscription_plan:plan_id (
                                id,
                                type,
                                name
                            )
                        `)
                        .eq('user_id', user.id)
                        .eq('status', 'ACTIVE')
                        .single();

                    if (!error && subscriptionData) {
                        setUserSubscription(subscriptionData);
                        
                        // Fetch available downgrade plans based on current plan type
                        if (subscriptionData.subscription_plan) {
                            const currentPlanType = subscriptionData.subscription_plan.type;
                            const { data: plans, error: plansError } = await supabase
                                .from('subscription_plan')
                                .select('id, name, type')
                                .eq('is_active', true)
                                .in('type', getAvailableDowngradePlans(currentPlanType))
                                .order('price', { ascending: true });

                            if (!plansError && plans) {
                                setAvailablePlans(plans);
                            }
                        }

                        if (user.email) {
                            setEmail(user.email);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching subscription:', error);
                    toast.error('Failed to fetch subscription details');
                }
            } else {
                setIsAuthenticated(false);
                setUserSubscription(null);
                setAvailablePlans([]);
            }
        };

        // Only run checkAuth if user loading is complete
        if (!userLoading) {
            checkAuth();
        }
    }, [user, userLoading]);

    // Helper function to determine available downgrade plans
    const getAvailableDowngradePlans = (currentPlanType) => {
        switch (currentPlanType) {
            case 'ENTERPRISE':
                return ['PRO', 'FREE'];
            case 'PRO':
                return ['FREE'];
            default:
                return [];
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            // Prepare data based on form type
            const formData = {
                type: selectedOption,
                email: email,
            };
            
            if(selectedOption === 'general'){
                formData.message = message;
            } else if(selectedOption === 'enterprise'){
                formData.firstName = firstName;
                formData.lastName = lastName;
                formData.companyName = companyName;
                formData.role = selectedRole;
                formData.timeline = selectedTimeline;
                formData.userQty = selectedUserQty;
            } else if(selectedOption === 'downgrade'){
                if (!user?.id) {
                    throw new Error('You must be logged in to submit a downgrade request');
                }
                if (!userSubscription?.id) {
                    throw new Error('No active subscription found');
                }
                if (!targetPlan) {
                    throw new Error('Please select a target plan');
                }

                formData.userId = user.id;
                formData.currentSubscriptionId = userSubscription.id;
                formData.targetPlanId = targetPlan;
                formData.reason = reason;
            }

            console.log('Sending form data:', formData);

            const response = await fetch('/api/contactUs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit form');
            }

            const result = await response.json();
            setMessageSent(true);
            
            // Reset form fields
            setEmail('');
            setMessage('');
            setFirstName('');
            setLastName('');
            setCompanyName('');
            setSelectedRole('');
            setSelectedTimeline('');
            setSelectedUserQty('');
            setTargetPlan('');
            setReason('');

            toast.success('Your message has been sent successfully!');

        } catch (error) {
            console.error('Error submitting form:', error);
            setErrorMessage(error.message || 'An unexpected error occurred. Please try again later.');
            toast.error(error.message || 'Failed to submit form');
        } finally {
            setLoading(false);
        }
    };
    
    const renderContactOptions = () => {
        // Base options always available
        const options = [
            { id: 'general', label: 'General' },
            { id: 'enterprise', label: 'Enterprise' }
        ];

        // Add downgrade option only for authenticated users with active paid subscription
        if (isAuthenticated && userSubscription?.status === 'ACTIVE' && 
            userSubscription.subscription_plan?.type !== 'FREE') {
            options.push({ id: 'downgrade', label: 'Downgrade' });
        }

        return (
            <div className="flex justify-center mb-8">
                <div className="relative inline-flex rounded-full p-1 bg-gray-100">
                    <div
                        className={clsx(
                            'absolute inset-0 rounded-full bg-indigo-600 transition-transform duration-200 ease-in-out',
                            {
                                'w-1/2': options.length === 2,
                                'w-1/3': options.length === 3,
                                'translate-x-full': selectedOption === 'enterprise',
                                'translate-x-[200%]': selectedOption === 'downgrade',
                                'translate-x-0': selectedOption === 'general'
                            }
                        )}
                    />
                    
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedOption(option.id)}
                            className={clsx(
                                'relative z-10 px-8 py-2 rounded-full transition-colors duration-200 min-w-[121px]',
                                selectedOption === option.id
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // Show minimal loading state only while checking user auth
    if (userLoading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <div className="max-w-4xl mx-auto py-12 px-4">
                    <h1 className="text-4xl font-bold text-center mb-8">Contact Us</h1>
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                </div>
            </div>
        );
    }

    return(
        <div className="min-h-screen bg-black text-white">
        
            {/* Main content */}
            <div className="max-w-4xl mx-auto py-12 px-4">
                <h1 className="text-4xl font-bold text-center mb-8">Contact Us</h1>
                
                <p className="text-center mb-2">
                For sales and general inquiries, message us below or explore our{' '}
                <Link href="/help" className="text-pink-500 hover:underline">help center</Link>.
                </p>
                <p className="text-center mb-8">
                For larger organizations with specialized needs, please{' '}
                <Link href="/demo" className="text-pink-500 hover:underline">request a demo</Link>.
                </p>
        
                {/* Success message */}
                {messageSent && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                    Your message has been sent! We will reply you within 2 business days.
                </div>
                )}

                {/* Error message display */}
                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {errorMessage}
                    </div>
                )}

                {/* Render contact options */}
                {renderContactOptions()}

                {/* General form */}
                {selectedOption === 'general' && (
                    <div>
                        {/* Contact form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block mb-2">Email</label>
                        <input
                        type="email"
                        id="email"
                        value={email} onChange={(e)=>{
                            setEmail(e.target.value)
                        }}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        placeholder="Who should we contact?"
                        />
                    </div>
            
                    <div>
                        <label htmlFor="message" className="block mb-2">Message</label>
                        <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded h-32"
                        required
                        placeholder="What would you like to discuss?"
                        />
                    </div>
            
                    <button
                        type="submit"
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded"
                    >
                        Send Message
                    </button>
                    </form>
                    </div>
                )}

                {/* Enterprise form */}
                {selectedOption === 'enterprise' && (
                    <div>
                    {/* Contact form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <span className="text-2xl font-bold mb-6">Tell us about yourself?</span>
                    <div>
                        <label htmlFor="" className="block mb-2">First Name</label>
                        <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        />
                    </div>
                    <div>
                        <label htmlFor="" className="block mb-2">Last Name</label>
                        <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block mb-2">Email</label>
                        <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e)=>{
                            setEmail(e.target.value)
                        }}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        />
                    </div>
                    <div>
                        <label htmlFor="" className="block mb-2">Company Name</label>
                            <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                            required
                            />
                    </div>

                    {/*what is your role?*/}
                    <div>
                        <label htmlFor="" className="block mb-2">What is your role?</label>
                        <div className="flex flex-wrap gap-2">
                                
                                {roles.map((item)=>(
                                    <div 
                                    key={item.id} 
                                    className={clsx(
                                         "border border-gray-700 rounded p-2 cursor-pointer transition-colors duration-200",
                                        selectedRole === item.name ? "bg-white text-black" : "bg-gray-900"
                                    )}

                                    onClick={()=>{setSelectedRole(item.name)}}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                        </div>

                    </div>
                    {/*timeline of making purchase decision*/}
                    <div>
                        <label htmlFor="" className="block mb-2">What is your timeline of making a purchase decision</label>
                        <div className="flex flex-wrap gap-2">
                            {timeLines.map(item => (
                                <div 
                                    key={item.id} 
                                    className={clsx(
                                        "border border-gray-700 rounded p-2 cursor-pointer transition-colors duration-200",
                                        selectedTimeline === item.name ? "bg-white text-black" : "bg-gray-900"
                                    )}
                                    onClick={() => {setSelectedTimeline(item.name)}}
                                >
                                    {item.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/*how many users are you looking to onboard?*/}
                    <div>
                        <label htmlFor="" className="block mb-2">How many users are you looking to onboard?</label>
                        <div className="flex flex-wrap gap-2">
                            {userQty.map(item=>(
                                <div key={item.id} className={clsx(
                                    "border border-gray-700 rounded p-2 cursor-pointer transition-colors duration-200",
                                    selectedUserQty === item.name ? "bg-white text-black" : "bg-gray-900"
                                )}
                                onClick={()=> {setSelectedUserQty(item.name)}}
                                >
                                    {item.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded"
                    >
                        Submit
                    </button>
                    </form>
                    </div>
                )}

                {/* Add Downgrade Request Form */}
                {selectedOption === 'downgrade' && (
                    <div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <span className="text-2xl font-bold mb-6">Request Plan Downgrade</span>
                    
                    <div>
                        <label htmlFor="email" className="block mb-2">Email</label>
                        <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        placeholder="Your account email"
                        disabled
                        />
                    </div>

                    <div>
                        <label htmlFor="currentPlan" className="block mb-2">Current Plan</label>
                        <div className="space-y-2">
                            <div>
                                <label className="text-sm text-gray-400">Plan Name</label>
                                <div className="w-full p-3 bg-gray-800 border border-gray-700 rounded">
                                    {userSubscription?.subscription_plan?.name}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Plan Type</label>
                                <div className="w-full p-3 bg-gray-800 border border-gray-700 rounded">
                                    {userSubscription?.subscription_plan?.type}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="targetPlan" className="block mb-2">Target Plan</label>
                        <select
                        id="targetPlan"
                        value={targetPlan}
                        onChange={(e) => setTargetPlan(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded"
                        required
                        >
                            <option value="">Select desired plan</option>
                            {availablePlans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name} ({plan.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="reason" className="block mb-2">Reason for Downgrade</label>
                        <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded h-32"
                        required
                        placeholder="Please explain why you want to downgrade your plan"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded"
                    >
                        Submit Downgrade Request
                    </button>
                    </form>
                    </div>
                )}

                {/* Contact information */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Contact teamsync</h2>
                    
                    <div className="space-y-4">
                        <p>
                        <strong>Support:</strong>{' '}
                        <a href="#" className="text-pink-500 hover:underline">
                            support@teamsync.com
                        </a>
                        <br />
                        Reach out for assistance with technical or account-related issues.
                        </p>
                        
                        <p>
                        <strong>Sales:</strong>{' '}
                        <a href="#" className="text-pink-500 hover:underline">
                            hello@teamsync.com
                        </a>
                        <br />
                        Connect with our team for inquiries about plans or partnerships.
                        </p>
                        
                        <p>
                        <strong>Feedback:</strong>{' '}
                        <a href="/feedback" className="text-pink-500 hover:underline">
                            Share your thoughts
                        </a>
                        <br />
                        We value your input to help improve Taskade.
                        </p>
                    </div>
                </div>
        
                {/* Office locations */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Office Locations</h2>
                    
                    <div className="space-y-6">
                        <div>
                        <h3 className="font-bold mb-1">San Francisco Office</h3>
                        <p>1160 Battery Street East, Suite 100</p>
                        <p>San Francisco, California 94111, USA</p>
                        </div>
                        
                        <div>
                        <h3 className="font-bold mb-1">Singapore Office</h3>
                        <p>73A Ayer Rajah Crescent</p>
                        <p>Singapore 139957, Singapore</p>
                        </div>
                    </div>
                </div>
        
                {/* Enterprise support */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Enterprise Support</h2>
                    
                    <p className="mb-2">Phone: (415) 888-9177</p>
                    <p className="mb-4">Phone support is exclusively available for enterprise customers.</p>
                    <Link 
                        href="/contact-sales" 
                        className="text-pink-500 hover:underline"
                    >
                        Contact Sales
                    </Link> to explore the Enterprise plan and schedule a call with our team.
                </div>
            </div>
        </div>
    );
}