import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactFormSchema, type ContactFormData } from '@/lib/schemas';
import { isHoneypotFilled } from '@/lib/utils';
import { useState } from 'react';

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    // Honeypot check
    if (isHoneypotFilled(data.website)) {
      console.log('Bot detected');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Здесь будет реальная отправка на API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock delay

      // Show success toast
      setShowToast(true);
      reset();

      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      setError('Ошибка при отправке сообщения. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-2">
            Имя <span className="text-error">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="Ваше имя"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-error">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
            Email <span className="text-error">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="example@mail.com"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-error">{errors.email.message}</p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-text-primary mb-2">
            Тема <span className="text-error">*</span>
          </label>
          <select
            {...register('subject')}
            id="subject"
            className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="">Выберите тему</option>
            <option value="test">Вопрос о тестировании</option>
            <option value="report">Проблема с отчетом</option>
            <option value="refund">Возврат средств</option>
            <option value="support">Техническая поддержка</option>
            <option value="partnership">Сотрудничество</option>
            <option value="other">Другое</option>
          </select>
          {errors.subject && (
            <p className="mt-2 text-sm text-error">{errors.subject.message}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-text-primary mb-2">
            Сообщение <span className="text-error">*</span>
          </label>
          <textarea
            {...register('message')}
            id="message"
            rows={6}
            className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            placeholder="Опишите ваш вопрос или проблему"
          />
          {errors.message && (
            <p className="mt-2 text-sm text-error">{errors.message.message}</p>
          )}
        </div>

        {/* Honeypot field - hidden from users */}
        <input
          {...register('website')}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px]"
        />

        {/* Consent */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              {...register('consent')}
              type="checkbox"
              className="mt-1 w-5 h-5 accent-primary cursor-pointer"
            />
            <span className="text-sm text-text-secondary">
              Я согласен на обработку персональных данных <span className="text-error">*</span>
            </span>
          </label>
          {errors.consent && (
            <p className="mt-2 text-sm text-error">{errors.consent.message}</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-error/10 border-l-4 border-error rounded">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </button>
      </form>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-success text-white px-6 py-4 rounded-md shadow-xl animate-slide-up z-50">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Сообщение отправлено!</span>
          </div>
        </div>
      )}
    </>
  );
}
