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
6. **Open payment widget** - CloudPayments widget opens with requestID as InvoiceId
7. **User pays** - User completes payment in CloudPayments widget
8. **Webhook notification** - CloudPayments sends webhook to backend
9. **Backend processes** - Backend generates and sends report to user email

## Technical Implementation

### 1. CloudPayments Script

Added to `BaseLayout.astro`:
```html
<script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"></script>
```

### 2. TypeScript Declarations

Created `cloudpayments.d.ts` with CloudPayments widget type definitions.

### 3. Payment Handler (TestFlow.tsx)

The `handlePayment` function implements the integration:

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

  // 5. Open CloudPayments widget
  window.cp.pay('charge', {
    publicId: 'pk_282948d0d59277c437103adf48a92',
    description: config.title,
    amount: config.price,
    currency: 'RUB',
    invoiceId: requestID,
    email: data.email,
    accountId: data.email,
    // ... other options
  }, {
    onSuccess: () => setStage('success'),
    onFail: (reason) => setError('Оплата не прошла...'),
    onComplete: () => setIsSubmitting(false)
  });
}
```

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

## Test Mode

To enable CloudPayments test mode, enter one of these codes in the "Код доступа" field:
- `test`
- `testmode`

This will add `CloudPayments: { TestMode: true }` to the payment widget data.

## Environment Configuration

`.env` file:
```env
PUBLIC_API_BASEURL=https://profreport.online/api/v1
PUBLIC_SITE_URL=https://profreport.online
```

## CloudPayments Configuration

**Public ID:** `pk_282948d0d59277c437103adf48a92`

**Payment Type:** `charge` (one-stage payment)

**Widget Settings:**
- Skin: `modern`
- Language: `ru-RU`
- Currency: `RUB`
- Amounts:
  - Teenagers (14-18): 490 ₽
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
- [ ] Test mode works (with code: test/testmode)
- [ ] Payment success shows success screen
- [ ] Payment failure shows error message
- [ ] Webhook receives payment notification
- [ ] Backend generates and sends report

## Support

For payment issues, users should contact: info@profreport.online
