import type { Payload } from './schemas';

/**
 * Submit payload to API endpoint
 * According to CORE CONTEXT requirements
 */
export async function submitPayload(payload: Payload): Promise<{ success: boolean; error?: string }> {
  const apiEndpoint = import.meta.env.PUBLIC_API_ENDPOINT;

  if (!apiEndpoint) {
    console.error('PUBLIC_API_ENDPOINT is not configured');
    return { success: false, error: 'Сервер временно недоступен' };
  }

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Don't leak stack traces or PII
      return { success: false, error: 'Ошибка при отправке данных' };
    }

    return { success: true };
  } catch (error) {
    // Network error - user-friendly message only
    console.error('Network error submitting payload:', error);
    return { success: false, error: 'Проблема с подключением. Попробуйте позже.' };
  }
}

/**
 * Map page tariff names to contract tariff types
 * Pages can rename tariffs, but we map to contract types
 */
export function mapTariffToContract(pageTariff: string): 'basic' | 'recommended' | 'pro' {
  const tariffMap: Record<string, 'basic' | 'recommended' | 'pro'> = {
    school: 'basic',
    students: 'basic',
    graduate: 'recommended',
    graduates: 'recommended',
    adult: 'pro',
    adults: 'pro',
  };

  return tariffMap[pageTariff.toLowerCase()] || 'basic';
}

/**
 * Generate JSON-LD schema markup
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ProfReport',
    url: 'https://profreport.ru',
    logo: 'https://profreport.ru/logo.png',
    description: 'Профессиональная профориентация на основе научных методик',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@profreport.ru',
      contactType: 'customer service',
      availableLanguage: 'Russian',
    },
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateHowToSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Как пройти тест профориентации',
    description: 'Простой процесс прохождения теста и получения отчета',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Ответьте на вопросы',
        text: 'Пройдите тест за 5–7 минут, отвечая честно на все вопросы',
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Выберите тариф и оплатите',
        text: 'Выберите подходящий тариф и оплатите удобным способом',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Получите PDF на email',
        text: 'Отчет придет на почту обычно в течение 10 минут, максимум — 12 часов',
        position: 3,
      },
    ],
  };
}

/**
 * Honeypot validation helper
 */
export function isHoneypotFilled(value: string | undefined): boolean {
  return Boolean(value && value.length > 0);
}
