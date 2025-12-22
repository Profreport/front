# CloudPayments Integration Documentation

## Overview

This document describes the CloudPayments payment integration implemented for ProfReport.

## Integration Flow

The payment flow follows these steps:

1. **User completes test** - User answers all questionnaire questions
2. **User enters contact details** - Name and email on payment screen
3. **Save to backend** - Frontend sends answers to backend API
4. **Backend returns requestID** - Backend saves data and returns questionnaire ID
5. **Store requestID** - Frontend saves requestID in browser cookie
6. **Open payment widget OR redirect** - Try CloudPayments widget first, fallback to payment link if widget fails
7. **User pays** - User completes payment in CloudPayments widget or payment page
8. **Webhook notification** - CloudPayments sends webhook to backend
9. **Backend processes** - Backend generates and sends report to user email

## Hybrid Payment Approach

The implementation uses a **hybrid approach** that combines the best of both payment methods:

1. **Primary: Widget (Better UX)** - Attempts to open the CloudPayments widget modal for inline payment
2. **Fallback: Payment Link (Reliability)** - If widget fails to load (ad blockers, slow connection, script errors), automatically redirects to CloudPayments payment page

This ensures maximum reliability while providing the best user experience when possible.

## Technical Implementation

### 1. CloudPayments Script

Added to `BaseLayout.astro`:
```html
<script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"></script>
```

### 2. TypeScript Declarations

Created `cloudpayments.d.ts` with CloudPayments widget type definitions.

### 3. Payment Handler (TestFlow.tsx) - Hybrid Approach

The `handlePayment` function implements the hybrid payment integration:

```typescript
const handlePayment = async (data: PaymentFormData) => {
  // 1. Transform answers to API format
  const transformedPayload = transformAnswersToAPI(data.name, data.email, answers, config);

  // 2. Send to backend API
  const response = await fetch(`${apiUrl}/questionnaire/${testType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformedPayload),
  });

  // 3. Get requestID from backend
  const { requestID } = await response.json();

  // 4. Store in cookie
  document.cookie = `requestID=${requestID}; path=/; max-age=86400; SameSite=Strict`;

  // 5. Try widget first, fallback to payment link
  try {
    // Attempt to load and use widget (better UX)
    const widget = await waitForWidget();

    widget.pay('charge', {
      publicId: 'pk_282948d0d59277c437103adf48a92',  // PRODUCTION MODE
      description: config.title,
      amount: config.price,
      currency: 'RUB',
      invoiceId: requestID,
      email: data.email,
      accountId: data.email,
      skin: 'modern',
      language: 'ru-RU',
      requireEmail: false,
      data: {
        testType: config.testType,
        requestID: requestID
      }
    }, {
      onSuccess: () => setStage('success'),
      onFail: (reason) => setError('Оплата не прошла...'),
      onComplete: () => setIsSubmitting(false)
    });
  } catch (widgetError) {
    // Fallback to static payment links from CloudPayments dashboard
    const paymentLinks = {
      schoolchild: 'https://c.cloudpayments.ru/payments/b4f64d0373ed4fa1a5525c4c8ee2e7a9',
      adult: 'https://c.cloudpayments.ru/payments/c5616ce3713f434b8a33ed610977cdc2',
      student: 'https://c.cloudpayments.ru/payments/c5616ce3713f434b8a33ed610977cdc2',
    };

    window.location.href = paymentLinks[config.testType];
  }
}
```

The `waitForWidget()` helper function waits up to 2 seconds for the widget script to load, throwing an error if it fails.

**Static Payment Links:**
- Schoolchildren (490₽): https://c.cloudpayments.ru/payments/b4f64d0373ed4fa1a5525c4c8ee2e7a9
- Adults (890₽): https://c.cloudpayments.ru/payments/c5616ce3713f434b8a33ed610977cdc2

These links are created in CloudPayments dashboard and used as fallback when widget fails to load.

## API Endpoints

### Frontend → Backend

**Save Questionnaire:**
- POST `https://profreport.online/api/v1/questionnaire/adult`
- POST `https://profreport.online/api/v1/questionnaire/schoolchild`

Request body format:
```json
{
  "user": {
    "name": "Имя пользователя",
    "email": "user@example.com"
  },
  "values": [...],
  "RIASEC": [...],
  "objectsOfActivityKlimov": [...],
  "personalQualities": [...]
}
```

Response:
```json
{
  "requestID": "unique-questionnaire-id"
}
```

### CloudPayments → Backend

**Payment Webhook:**
- POST `https://profreport.online/api/v1/callback/cloudpayments/pay`

CloudPayments will send payment notifications here with the `InvoiceId` (which is our requestID).

## Payment Mode

The integration is using **production Public ID** `pk_282948d0d59277c437103adf48a92`.

## Environment Configuration

`.env` file:
```env
PUBLIC_API_BASEURL=https://profreport.online/api/v1
PUBLIC_SITE_URL=https://profreport.online
```

## CloudPayments Configuration

**Public ID (PRODUCTION):** `pk_282948d0d59277c437103adf48a92`

**Payment Type:** `charge` (one-stage payment)

**Widget Settings:**
- Skin: `modern`
- Language: `ru-RU`
- Currency: `RUB`
- Amounts:
  - Teenagers (12-17): 490 ₽
  - Adults: 890 ₽

## Cookie Storage

The requestID is stored in a cookie with these settings:
- Name: `requestID`
- Path: `/`
- Max-Age: 86400 (24 hours)
- SameSite: `Strict`

## Error Handling

The implementation handles several error scenarios:

1. **Backend API failure** - Shows "Ошибка при отправке данных"
2. **No requestID returned** - Shows "Не получен ID запроса от сервера"
3. **CloudPayments not loaded** - Shows "CloudPayments виджет не загружен"
4. **Payment failed** - Shows "Оплата не прошла. Попробуйте снова или используйте другую карту."

## Success Flow

When payment succeeds:
1. `onSuccess` callback fires
2. User sees success screen
3. Message: "Отчет придет на указанный email. Обычно — 10 минут, иногда чуть дольше"
4. Warning to check Spam folder
5. Contact email: info@profreport.online

## Files Modified

1. `src/layouts/BaseLayout.astro` - Added CloudPayments script
2. `src/cloudpayments.d.ts` - TypeScript declarations (NEW)
3. `src/components/islands/TestFlow.tsx` - Payment logic
4. `.env` - Updated API base URL
5. `CLOUDPAYMENTS_INTEGRATION.md` - This documentation (NEW)

## Testing Checklist

Before going live, test:

- [ ] Test completes successfully
- [ ] Payment screen shows correct price
- [ ] Backend API receives questionnaire data
- [ ] Backend returns valid requestID
- [ ] requestID stored in cookie
- [ ] CloudPayments widget opens
- [ ] Payment success shows success screen
- [ ] Payment failure shows error message
- [ ] Webhook receives payment notification
- [ ] Backend generates and sends report

## Support

For payment issues, users should contact: info@profreport.online
