/**
 * CloudPayments Widget TypeScript Declarations
 * https://developers.cloudpayments.ru/#tipy-platezhey
 */

interface CloudPaymentsWidgetOptions {
  publicId: string;
  description: string;
  amount: number;
  currency: string;
  invoiceId?: string;
  accountId?: string;
  email?: string;
  skin?: 'classic' | 'modern' | 'mini';
  language?: 'ru-RU' | 'en-US' | 'lv' | 'az' | 'kk' | 'kk-KZ' | 'uk' | 'pl' | 'pt';
  requireEmail?: boolean;
  data?: Record<string, any>;
  configuration?: {
    common?: {
      successRedirectUrl?: string;
      failRedirectUrl?: string;
    };
  };
  payer?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    birth?: string;
    address?: string;
    street?: string;
    city?: string;
    country?: string;
    phone?: string;
    postcode?: string;
  };
}

interface CloudPaymentsWidget {
  pay(
    type: 'charge' | 'auth',
    options: CloudPaymentsWidgetOptions,
    callbacks: {
      onSuccess?: (options: any) => void;
      onFail?: (reason: string, options: any) => void;
      onComplete?: (paymentResult: any, options: any) => void;
    }
  ): void;
}

interface Window {
  cp?: CloudPaymentsWidget;
}

declare const cp: CloudPaymentsWidget;
