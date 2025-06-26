import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getCurrentUser } from '@/lib/auth/auth';

// Support for HEAD requests to verify invoice availability
export async function HEAD(request) {
  try {
    // Get payment ID from URL
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    // Authenticate the user
    const userData = await getCurrentUser();
    if (!userData || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = userData.user.id;
    
    // Check if payment exists and belongs to user
    const { data: payment, error: paymentError } = await supabase
      .from('payment')
      .select('id, user_id')
      .eq('id', paymentId)
      .single();
    
    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Verify that the payment belongs to the authenticated user
    if (payment.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // If we reach here, invoice is available
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error checking invoice availability:', error);
    return NextResponse.json({ error: 'Failed to check invoice availability' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Get payment ID from URL
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }
    
    // Authenticate the user
    const userData = await getCurrentUser();
    if (!userData || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = userData.user.id;
    
    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payment')
      .select(`
        *,
        user:user_id (
          id,
          email,
          name
        )
      `)
      .eq('id', paymentId)
      .single();
      
    // Fetch plan details separately if plan_id exists
    let planName = 'Subscription';
    let planDescription = '';
    
    if (payment && payment.plan_id) {
      const { data: planData } = await supabase
        .from('subscription_plan')
        .select('name, description')
        .eq('id', payment.plan_id)
        .single();
        
      if (planData) {
        planName = planData.name;
        planDescription = planData.description;
      }
    }
    
    if (paymentError || !payment) {
      console.error('Error fetching payment:', paymentError);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Verify that the payment belongs to the authenticated user
    if (payment.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Create PDF invoice
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Add fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Company header
    page.drawText('Project Management System', {
      x: 50,
      y: height - 50,
      size: 24,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Invoice title
    page.drawText('INVOICE', {
      x: 50,
      y: height - 100,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Invoice Details
    const invoiceDate = new Date(payment.created_at).toLocaleDateString();
    const invoiceNumber = `INV-${payment.id}`; // payment.id is a number (SERIAL type in database)
    
    page.drawText(`Invoice Number: ${invoiceNumber}`, {
      x: 50,
      y: height - 140,
      size: 12,
      font: helveticaFont,
    });
    
    page.drawText(`Date: ${invoiceDate}`, {
      x: 50,
      y: height - 160,
      size: 12,
      font: helveticaFont,
    });
    
    page.drawText(`Payment Method: ${payment.payment_method || 'Credit Card'}`, {
      x: 50,
      y: height - 180,
      size: 12,
      font: helveticaFont,
    });
    
    // Customer details
    const customer = payment.user || {};
    page.drawText('Bill To:', {
      x: 300,
      y: height - 140,
      size: 12,
      font: helveticaBold,
    });
    
    page.drawText(`${customer.name || 'N/A'}`, {
      x: 300,
      y: height - 160,
      size: 12,
      font: helveticaFont,
    });
    
    page.drawText(`${customer.email || 'N/A'}`, {
      x: 300,
      y: height - 180,
      size: 12,
      font: helveticaFont,
    });
    
    // No address information available in user table
    
    // Table header
    const tableTop = height - 250;
    page.drawLine({
      start: { x: 50, y: tableTop },
      end: { x: width - 50, y: tableTop },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    
    page.drawText('Description', {
      x: 70,
      y: tableTop - 20,
      size: 12,
      font: helveticaBold,
    });
    
    page.drawText('Amount', {
      x: width - 120,
      y: tableTop - 20,
      size: 12,
      font: helveticaBold,
    });
    
    page.drawLine({
      start: { x: 50, y: tableTop - 30 },
      end: { x: width - 50, y: tableTop - 30 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    
    // Line items
    page.drawText(planName, {
      x: 70,
      y: tableTop - 50,
      size: 11,
      font: helveticaFont,
    });
    
    // Format the amount with currency
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: payment.currency || 'USD',
    });
    const formattedAmount = formatter.format(payment.amount);
    
    page.drawText(formattedAmount, {
      x: width - 120,
      y: tableTop - 50,
      size: 11,
      font: helveticaFont,
    });
    
    // If there's a discount, show it
    let currentY = tableTop - 50;
    
    if (payment.discount_amount && payment.discount_amount > 0) {
      currentY -= 20;
      
      page.drawText(`Discount ${payment.applied_promo_code ? `(${payment.applied_promo_code})` : ''}`, {
        x: 70,
        y: currentY,
        size: 11,
        font: helveticaFont,
      });
      
      const formattedDiscount = formatter.format(-payment.discount_amount);
      
      page.drawText(formattedDiscount, {
        x: width - 120,
        y: currentY,
        size: 11,
        font: helveticaFont,
      });
    }
    
    // Total
    currentY -= 30;
    page.drawLine({
      start: { x: 50, y: currentY + 10 },
      end: { x: width - 50, y: currentY + 10 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    
    page.drawText('Total', {
      x: 70,
      y: currentY - 10,
      size: 12,
      font: helveticaBold,
    });
    
    // Calculate total (amount - discount)
    const total = payment.amount - (payment.discount_amount || 0);
    const formattedTotal = formatter.format(total);
    
    page.drawText(formattedTotal, {
      x: width - 120,
      y: currentY - 10,
      size: 12,
      font: helveticaBold,
    });
    
    // Footer
    page.drawText('Thank you for your business!', {
      x: 50,
      y: 100,
      size: 12,
      font: helveticaFont,
    });
    
    page.drawText(`Payment Status: ${payment.status}`, {
      x: 50,
      y: 80,
      size: 12,
      font: payment.status === 'COMPLETED' ? helveticaBold : helveticaFont,
      color: payment.status === 'COMPLETED' ? rgb(0.2, 0.6, 0.2) : rgb(0.1, 0.1, 0.1),
    });
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    // Return the PDF as a download
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
        'Cache-Control': 'no-store' // Prevent caching to avoid issues with PDF generation
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
} 