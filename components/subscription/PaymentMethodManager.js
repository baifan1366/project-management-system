'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2, Trash } from 'lucide-react';

export default function PaymentMethodManager() {
  const t = useTranslations('profile');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Fetch all payment methods for the current user
  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payment-methods');
      
      if (!response.ok) {
        throw new Error(t('subscription.payments.fetchError'));
      }
      
      const data = await response.json();
      setPaymentMethods(data.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error(t('subscription.payments.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new payment method
  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe not initialized:', { stripe, elements });
      toast.error(t('subscription.payments.stripeNotInitialized'));
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      console.error('Card element not found');
      toast.error(t('subscription.payments.cardElementNotFound'));
      return;
    }
    
    setProcessingAction(true);
    
    try {
      console.log('Creating payment method with Stripe...');
      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (error) {
        console.error('Stripe createPaymentMethod error:', error);
        throw error;
      }
      
      console.log('Payment method created successfully:', paymentMethod.id);
      
      // Save payment method to database
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          setAsDefault: paymentMethods.length === 0, // Set as default if it's the first one
          enableAutoRenew: true // Enable auto-renew by default for new payment methods
        }),
      });
      
      const responseData = await response.json();
      console.log('API response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || t('subscription.payments.saveError'));
      }
      
      // Reset the form
      cardElement.clear();
      setIsAddingCard(false);
      toast.success(t('subscription.payments.addSuccess'));
      
      // Refresh payment methods
      fetchPaymentMethods();
      
      // Refresh subscription status to update auto-renewal toggle
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error.message || t('subscription.payments.addError'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Set a payment method as default
  const handleSetDefault = async (paymentMethodId) => {
    setProcessingAction(true);
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });
      
      if (!response.ok) {
        throw new Error(t('subscription.payments.defaultError'));
      }
      
      toast.success(t('subscription.payments.defaultSuccess'));
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error(error.message || t('subscription.payments.defaultError'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete a payment method
  const handleDelete = async (paymentMethodId) => {
    if (!confirm(t('subscription.payments.confirmDelete'))) {
      return;
    }
    
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/payment-methods?id=${paymentMethodId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(t('subscription.payments.deleteError'));
      }
      
      toast.success(t('subscription.payments.deleteSuccess'));
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error(error.message || t('subscription.payments.deleteError'));
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="text-lg font-semibold text-foreground">{t('subscription.payments.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('subscription.payments.description')}
        </p>
      </div>
      
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Payment Methods List */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-4 mb-6">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.stripe_payment_method_id}
                    className={`border rounded-md p-4 flex justify-between items-center ${method.is_default ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-foreground font-medium">
                          {method.card_brand ? method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1) : t('subscription.payments.card')}
                        </span>
                        <span className="mx-2 text-muted-foreground">•••• {method.card_last4}</span>
                        {method.is_default && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                            {t('subscription.payments.default')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t('subscription.payments.expires')} {method.card_exp_month}/{method.card_exp_year}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!method.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.stripe_payment_method_id)}
                          disabled={processingAction}
                          className="text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {t('subscription.payments.setDefault')}
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(method.stripe_payment_method_id)}
                        disabled={processingAction}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">{t('subscription.payments.remove')}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                {t('subscription.payments.noMethods')}
              </p>
            )}
            
            {/* Add New Payment Method */}
            {isAddingCard ? (
              <form onSubmit={handleAddPaymentMethod} className="mt-4 space-y-4">
                <div className="rounded-md border border-border p-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('subscription.payments.cardInformation')}
                  </label>
                  <div className="bg-background p-3 border border-input rounded-md">
                    <CardElement 
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#374151',
                            '::placeholder': {
                              color: '#9CA3AF',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingCard(false)}
                    disabled={processingAction}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={processingAction}
                  >
                    {processingAction ? t('subscription.payments.processing') : t('subscription.payments.addMethod')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-center">
                <Button
                  variant="default" 
                  onClick={() => setIsAddingCard(true)}
                  disabled={processingAction}
                  className="mt-2"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('subscription.payments.addMethod')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 