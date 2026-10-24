/**
 * Payment Validation Example Usage
 * 
 * This file demonstrates how to use the hardened send-payment validation
 * utilities for Issue 069: Harden send-payment form validation
 */

import {
  sendPaymentSchema,
  validateSendPayment,
  validateMemo,
  validateAmountRange,
  sanitizePaymentInput,
} from './validation';
import { SendPaymentRequest, SendPaymentValidationResult } from '@/types';

// Example 1: Basic payment validation
function validateBasicPayment() {
  const paymentData = {
    recipientAddress: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    amount: '100.5',
    tokenType: 'XLM' as const,
  };

  const result = validateSendPayment(paymentData);
  
  if (result.isValid) {
    // Valid payment check
  } else {
    // Validation failed
  }
}

// Example 2: Payment with memo
function validatePaymentWithMemo() {
  const paymentData = {
    recipientAddress: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    amount: '50.25',
    tokenType: 'USDC' as const,
    memo: '12345',
    memoType: 'id' as const,
  };

  const result = validateSendPayment(paymentData);
  
  if (result.isValid) {
    // Valid payment with memo
  } else {
    // Validation failed
  }
}

// Example 3: Using Zod schema directly
function validateWithZodSchema() {
  try {
    const paymentData = {
      recipientAddress: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      amount: '10.1234567',
      tokenType: 'XLM' as const,
      memo: 'Payment for invoice #123',
      memoType: 'text' as const,
    };

    sendPaymentSchema.parse(paymentData);
  } catch {
    // Zod validation error
  }
}

// Example 4: Input sanitization
function sanitizePaymentInputExample() {
  const rawData = {
    recipientAddress: '  GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890  ',
    amount: '  100.50  ',
    tokenType: 'xlm',
    memo: '  test memo  ',
    memoType: 'TEXT',
  };

  sanitizePaymentInput(rawData);
  // Sanitized data output
  //   recipientAddress: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
  //   amount: '100.50',
  //   tokenType: 'XLM',
  //   memo: 'test memo',
  //   memoType: 'text'
  // }
}

// Example 5: Memo validation
function validateMemoExamples() {
  validateMemo('12345', 'id');
  validateMemo('abc123', 'id');
  validateMemo('a'.repeat(64), 'hash');
  validateMemo('abc', 'hash');
  validateMemo('Hello World', 'text');
  validateMemo('a'.repeat(29), 'text');
}

// Example 6: Amount range validation
function validateAmountExamples() {
  validateAmountRange('100.5');
  validateAmountRange('0.00000001');
  validateAmountRange('1000001');
  validateAmountRange('abc');
  validateAmountRange('50', 10, 100);
  validateAmountRange('5', 10, 100);
}

// Example 7: React Hook Form integration (conceptual)
// Note: This would be in a .tsx file in a real application
/*
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function PaymentForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sendPaymentSchema),
  });

  const onSubmit = (data: SendPaymentRequest) => {
    // Sanitize input before processing
    const sanitizedData = sanitizePaymentInput(data);
    
    // Validate again (defensive programming)
    const validation = validateSendPayment(sanitizedData);
    
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      return;
    }
    
    // Process payment
    console.log('Processing payment:', sanitizedData);
  };

  // JSX would go here in a .tsx file
  // See the React documentation for form implementation
}
*/

// Example 8: Validation error handling
function handleValidationError() {
  const invalidData = {
    recipientAddress: 'INVALID_ADDRESS',
    amount: '-50',
    tokenType: 'XLM' as const,
  };

  const result = validateSendPayment(invalidData);
  
  if (!result.isValid) {
    // Error handling
    result.errors.forEach((error) => {
      // Could map error paths to form fields for UI display
    });
  }
}

// Example 9: TypeScript type safety
function typeSafeValidation() {
  const paymentData: SendPaymentRequest = {
    recipientAddress: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    amount: '100',
    tokenType: 'XLM',
  };

  const result: SendPaymentValidationResult = validateSendPayment(paymentData);
  
  if (result.isValid && result.data) {
    // TypeScript knows result.data is defined here
    console.log('Valid payment:', result.data);
  }
}

// Example 10: Validation middleware for API calls
async function sendPaymentMiddleware(paymentData: SendPaymentRequest) {
  // Step 1: Sanitize input
  const sanitizedData = sanitizePaymentInput(paymentData);
  
  // Step 2: Validate
  const validation = validateSendPayment(sanitizedData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Step 3: Additional business logic checks
  if (parseFloat(sanitizedData.amount) > 10000) {
    // Require additional confirmation for large amounts
    console.warn('Large payment detected - requires confirmation');
  }
  
  // Step 4: Process payment
  // return await apiService.sendPayment(sanitizedData);
  console.log('Payment processed:', sanitizedData);
}

export {
  validateBasicPayment,
  validatePaymentWithMemo,
  validateWithZodSchema,
  sanitizePaymentInputExample,
  validateMemoExamples,
  validateAmountExamples,
  PaymentForm,
  handleValidationError,
  typeSafeValidation,
  sendPaymentMiddleware,
};
