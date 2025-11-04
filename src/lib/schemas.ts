import { z } from 'zod';

/**
 * Test types according to CORE CONTEXT
 */
export const TestTypeSchema = z.enum(['school', 'graduate', 'adult']);
export type TestType = z.infer<typeof TestTypeSchema>;

/**
 * Tariff types according to CORE CONTEXT
 */
export const TariffSchema = z.enum(['basic', 'recommended', 'pro']);
export type Tariff = z.infer<typeof TariffSchema>;

/**
 * Contact form schema
 */
export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  subject: z.string().min(1, 'Выберите тему'),
  message: z.string().min(10, 'Сообщение должно содержать минимум 10 символов'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо дать согласие на обработку данных' }),
  }),
  // Honeypot field for anti-bot
  website: z.string().max(0).optional(),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;

/**
 * Test consent schema
 */
export const TestConsentSchema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо дать согласие на обработку данных' }),
  }),
});

/**
 * Payment form schema
 */
export const PaymentFormSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  code: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо дать согласие с условиями оферты' }),
  }),
});

export type PaymentFormData = z.infer<typeof PaymentFormSchema>;

/**
 * Final payload schema - sent to API
 * According to CORE CONTEXT contract
 */
export const PayloadSchema = z.object({
  testType: TestTypeSchema,
  email: z.string().email(),
  tariff: TariffSchema,
  answers: z.record(z.unknown()),
  consent: z.literal(true),
});

export type Payload = z.infer<typeof PayloadSchema>;

/**
 * Answer schemas for different question types
 */
export const LikertAnswerSchema = z.number().min(1).max(7);
export const RadioAnswerSchema = z.string().min(1);
export const CheckboxAnswerSchema = z.array(z.string()).min(1, 'Выберите хотя бы один вариант');

export type LikertAnswer = z.infer<typeof LikertAnswerSchema>;
export type RadioAnswer = z.infer<typeof RadioAnswerSchema>;
export type CheckboxAnswer = z.infer<typeof CheckboxAnswerSchema>;
