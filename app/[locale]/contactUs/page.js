'use client'; // 使用客户端组件
import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import clsx from 'clsx';

export default function ContactUs(){

    const [selectedOption, setSelectedOption] = useState('general');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedTimeline, setSelectedTimeline] = useState('')
    const [selectedUserQty, setSelectedUserQty] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [messageSent, setMessageSent] = useState(false)

    {/* dummy data : roles*/}
    const roles = [
        {
            id: 1, 
            name: 'Executive'
        },
        { 
            id: 2, 
            name: 'Manager'
        },
        { 
            id: 3, 
            name: 'Team Member/Individual Contributor'
        }, 
        {
            id: 4, 
            name: 'Freelancer'},
        {
            id: 5, 
            name:'Business Owner'},
        {
            id: 6, 
            name: 'Director'
        }
    ];

    const timeLines = [
        {
            id: 1,
            name: 'immediately'
        },
        {
            id: 2,
            name: 'Within this month'
        },
        {
            id: 3,
            name: 'Within the next 3 months'
        }
    ];

    const userQty = [
        {
            id: 1,
            name: '1-5'
        },
        {
            id: 2,
            name: '6-10'
        },
        {
            id: 3,
            name: '11-20'
        },
        {
            id: 4,
            name: '21-50'
        },
        {
            id: 5,
            name: '50+'
        }


    ]

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
            }

            console.log('Sending form data:', formData); // Debug log

            // Call API route - make sure the URL is lowercase to match the API route
            const response = await fetch('/api/contactUs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                // Handle non-JSON response
                const textResponse = await response.text();
                console.error('Non-JSON response:', textResponse);
                throw new Error('Server returned non-JSON response');
            }

            // Parse JSON response
            const result = await response.json();

            // Handle response
            if (!response.ok) {
                console.error('Error submitting form:', result.error);
                setErrorMessage(result.error || 'There was an error submitting your form. Please try again.');
            } else {
                console.log('Form submitted successfully:', result);
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
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            setErrorMessage('An unexpected error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    

    return(
        <div className="min-h-screen bg-black text-white">
            {/* Header navigation */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
                <Link href="/" className="flex items-center">
                <span className="text-xl font-bold">Back to Home</span>
                </Link>
                <div className="flex space-x-4">
                <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-300">Terms</Link>
                <Link href="/contact" className="hover:text-gray-300">Contact</Link>
                </div>
            </div>
        
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


                {/*Enquiry Type Change*/}
                <div className="flex justify-center mb-8">
                    <div className="relative inline-flex rounded-full p-1 bg-gray-100">
                    <div
                        className={clsx(
                        'absolute inset-0 w-1/2 rounded-full bg-indigo-600 transition-transform duration-200 ease-in-out',
                        selectedOption === 'enterprise' ? 'translate-x-full' : 'translate-x-0'
                        )}
                    />
                    
                    <button
                        onClick={() => setSelectedOption('general')}
                        className={clsx(
                        'relative z-10 px-8 py-2 rounded-full transition-colors duration-200 min-w-[121px]',
                        selectedOption === 'general' 
                            ? 'text-white' 
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setSelectedOption('enterprise')}
                        className={clsx(
                        'relative z-10 px-8 py-2 rounded-full transition-colors duration-200 min-w-[121px]',
                        selectedOption === 'enterprise' 
                            ? 'text-white' 
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Enterprise
                    </button>
                    </div>
                </div>
                


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