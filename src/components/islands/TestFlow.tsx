import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentFormSchema, type PaymentFormData, type TestType, type Tariff } from '@/lib/schemas';
import { submitPayload } from '@/lib/utils';

type QuestionType = 'likert' | 'radio' | 'checkbox';

interface Option {
  label: string;
  value: string | number;
}

interface Question {
  id: string;
  question: string;
  subtitle?: string;
  type: QuestionType;
  options: Option[];
}

interface Section {
  id: string;
  title: string;
  subtitle: string;
  questions: Question[];
}

interface TestConfig {
  testType: TestType;
  title: string;
  subtitle: string;
  price: number;
  tariff: Tariff;
  sections: Section[];
  instructions: string[];
  infoBanner?: string;
}

interface TestFlowProps {
  config: TestConfig;
}

type Answers = Record<string, string | number | string[]>;

// Helper function to get label from value
function getLabelFromValue(questionId: string, value: string | number | string[], config: TestConfig): string {
  // Find the question
  const question = config.sections
    .flatMap(s => s.questions)
    .find(q => q.id === questionId);

  if (!question) return String(value);

  // For likert/radio, find the matching option label
  if (question.type === 'likert' || question.type === 'radio') {
    const option = question.options.find(opt => opt.value === value);
    return option ? option.label : String(value);
  }

  // For checkbox (array), join the labels
  if (Array.isArray(value)) {
    return value.map(v => {
      const option = question.options.find(opt => opt.value === v);
      return option ? option.label : String(v);
    }).join(', ');
  }

  return String(value);
}

// Transform answers to API format
function transformAnswersToAPI(name: string, email: string, answers: Answers, config: TestConfig) {
  const payload: any = {
    user: {
      name,
      email,
    },
    values: [],
    RIASEC: [],
    objectsOfActivityKlimov: [],
    personalQualities: [],
  };

  // Process each answer
  Object.entries(answers).forEach(([questionId, value]) => {
    // Find the question
    const question = config.sections
      .flatMap(s => s.questions)
      .find(q => q.id === questionId);

    if (!question) return;

    const answerLabel = getLabelFromValue(questionId, value, config);

    const questionData = {
      number: parseInt(questionId.split('_')[1]),
      question: question.question,
      answer: answerLabel,
    };

    // Route to appropriate array based on question ID prefix
    if (questionId.startsWith('values_')) {
      payload.values.push(questionData);
    } else if (questionId.startsWith('riasec_')) {
      payload.RIASEC.push(questionData);
    } else if (questionId.startsWith('klimov_')) {
      payload.objectsOfActivityKlimov.push(questionData);
    } else if (questionId.startsWith('personality_')) {
      payload.personalQualities.push(questionData);
    }
  });

  // Sort each array by number
  payload.values.sort((a: any, b: any) => a.number - b.number);
  payload.RIASEC.sort((a: any, b: any) => a.number - b.number);
  payload.objectsOfActivityKlimov.sort((a: any, b: any) => a.number - b.number);
  payload.personalQualities.sort((a: any, b: any) => a.number - b.number);

  return payload;
}

export default function TestFlow({ config }: TestFlowProps) {
  const [stage, setStage] = useState<'start' | 'test' | 'payment' | 'success'>('start');
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    formState: { errors: paymentErrors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentFormSchema),
  });

  // Flatten all questions
  const allQuestions = config.sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  const getCurrentSection = () => {
    return config.sections.find((section) =>
      section.questions.some((q) => q.id === currentQuestion?.id)
    );
  };

  const handleStart = () => {
    if (!consent) {
      alert('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    setStage('test');
  };

  const handleAnswer = (value: string | number | string[]) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      alert('Пожалуйста, выберите ответ');
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStage('payment');
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handlePayment = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    setError(null);

    // Check if code is metamorfoza to enable API submission
    if (data.code === 'metamorfoza') {
      // Transform answers into API format
      const transformedPayload = transformAnswersToAPI(data.name, data.email, answers, config);

      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://example.com/api/v1';
        const response = await fetch(`${apiUrl}/questionnaire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transformedPayload),
        });

        if (!response.ok) {
          throw new Error('Ошибка при отправке данных');
        }

        setStage('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при отправке');
      }
    } else {
      // Original payment flow
      const payload = {
        testType: config.testType,
        email: data.email,
        tariff: config.tariff,
        answers,
        consent: true as const,
      };

      const result = await submitPayload(payload);

      if (result.success) {
        setStage('success');
      } else {
        setError(result.error || 'Ошибка при отправке');
      }
    }

    setIsSubmitting(false);
  };

  const handleExit = () => {
    window.location.href = '/tests';
  };

  // Start screen
  if (stage === 'start') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface border-b border-border">
          <div className="container-custom py-5">
            <a href="/" className="text-2xl font-bold text-primary">
              ProfReport
            </a>
          </div>
        </header>

        <main className="container-custom py-12">
          <div className="max-w-3xl mx-auto bg-surface p-8 lg:p-12 rounded-lg border border-border shadow-sm">
            <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2 text-center">
              {config.title}
            </h1>
            <p className="text-lg text-text-secondary mb-8 text-center">{config.subtitle}</p>

            <div className="mb-8">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Тест займет примерно 5–7 минут
              </h3>

              <div className="bg-background p-6 rounded-lg mb-6">
                <h4 className="font-semibold text-text-primary mb-3">Инструкции:</h4>
                <ul className="space-y-2 text-text-secondary">
                  {config.instructions.map((instruction, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {config.infoBanner && (
                <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary mb-6">
                  <p className="text-text-secondary">{config.infoBanner}</p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-primary cursor-pointer"
                />
                <span className="text-text-secondary">
                  Я согласен на обработку персональных данных
                </span>
              </label>
            </div>

            <button
              onClick={handleStart}
              disabled={!consent}
              className="w-full px-6 py-4 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Начать тест
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Test screen
  if (stage === 'test') {
    const currentSection = getCurrentSection();

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface border-b border-border">
          <div className="container-custom py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-primary">
                ProfReport
              </a>
              <button
                onClick={() => setShowExitModal(true)}
                className="text-sm text-text-secondary hover:text-text-primary border border-border px-4 py-2 rounded-md transition-colors"
              >
                Выйти / Сохранить на потом
              </button>
            </div>
          </div>
        </header>

        <main className="container-custom py-8">
          <div className="max-w-3xl mx-auto">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-text-secondary">Прогресс</span>
                <span className="text-sm font-semibold text-primary">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary text-center mt-2">
                Вопрос {currentQuestionIndex + 1} из {totalQuestions}
              </p>
            </div>

            {/* Section info */}
            {currentSection && (
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  {currentSection.title}
                </h2>
                <p className="text-text-secondary">{currentSection.subtitle}</p>
              </div>
            )}

            {/* Question card */}
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={handleAnswer}
              />
            )}

            {/* Help text */}
            <div className="text-center my-6 p-3 bg-primary/5 rounded-md">
              <p className="text-sm text-text-secondary">
                💡 Можно вернуться и изменить ответ до оплаты
              </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
                className="flex-1 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Назад
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-all hover:shadow-md min-h-[44px]"
              >
                {currentQuestionIndex === totalQuestions - 1 ? 'Перейти к оплате' : 'Далее'}
              </button>
            </div>
          </div>
        </main>

        {/* Exit modal */}
        {showExitModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExitModal(false)}
          >
            <div
              className="bg-surface p-8 rounded-lg max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-text-primary mb-4">Вы уверены?</h3>
              <p className="text-text-secondary mb-6">
                Несохранённые ответы будут потеряны
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-border text-text-primary font-semibold rounded-md hover:border-primary transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleExit}
                  className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Payment screen
  if (stage === 'payment') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-surface border-b border-border">
          <div className="container-custom py-5">
            <a href="/" className="text-2xl font-bold text-primary">
              ProfReport
            </a>
          </div>
        </header>

        <main className="container-custom py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-text-primary mb-8 text-center">
              Оплата и получение отчета
            </h2>

            <div className="bg-surface p-8 rounded-lg border border-border shadow-sm">
              <div className="text-center pb-6 mb-6 border-b border-border">
                <h3 className="text-2xl font-semibold text-text-primary mb-2">
                  {config.title}
                </h3>
                <div className="text-5xl font-bold text-primary">
                  {config.price} <span className="text-2xl">₽</span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit(handlePayment)} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-2">
                    Имя <span className="text-error">*</span>
                  </label>
                  <input
                    {...registerPayment('name')}
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Ваше имя"
                  />
                  {paymentErrors.name && (
                    <p className="mt-2 text-sm text-error">{paymentErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                    Email для получения отчета <span className="text-error">*</span>
                  </label>
                  <input
                    {...registerPayment('email')}
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="example@mail.com"
                  />
                  {paymentErrors.email && (
                    <p className="mt-2 text-sm text-error">{paymentErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="code" className="block text-sm font-semibold text-text-primary mb-2">
                    Код доступа (опционально)
                  </label>
                  <input
                    {...registerPayment('code')}
                    type="text"
                    id="code"
                    className="w-full px-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Введите код"
                  />
                  {paymentErrors.code && (
                    <p className="mt-2 text-sm text-error">{paymentErrors.code.message}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      {...registerPayment('consent')}
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-text-secondary">
                      Я согласен с условиями договора оферты <span className="text-error">*</span>
                    </span>
                  </label>
                  {paymentErrors.consent && (
                    <p className="mt-2 text-sm text-error">{paymentErrors.consent.message}</p>
                  )}
                </div>

                <div className="bg-secondary/10 p-4 rounded-lg border-l-4 border-secondary">
                  <p className="text-sm text-text-secondary">
                    🔒 Данные защищены и используются только для формирования отчета
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-error/10 border-l-4 border-error rounded">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isSubmitting ? 'Обработка...' : 'Оплатить и получить отчет'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success screen
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="container-custom py-5">
          <a href="/" className="text-2xl font-bold text-primary">
            ProfReport
          </a>
        </div>
      </header>

      <main className="container-custom py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-surface p-12 rounded-lg border border-border shadow-sm">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-text-primary mb-4">Спасибо!</h2>
            <p className="text-lg text-text-secondary mb-2">
              Отчет придет на указанный email
            </p>
            <p className="text-text-secondary mb-8">
              Обычно — 10 минут, максимум — 12 часов
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/"
                className="px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors"
              >
                На главную
              </a>
              <a
                href="/contacts"
                className="px-6 py-3 border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-colors"
              >
                Задать вопрос
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// QuestionCard component
function QuestionCard({ question, value, onChange }: {
  question: Question;
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
}) {
  if (question.type === 'likert') {
    return (
      <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border mb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">{question.question}</h3>
        {question.subtitle && (
          <p className="text-text-secondary mb-6">{question.subtitle}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {question.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`flex-1 px-4 py-3 rounded-md font-medium transition-all border-2 min-h-[44px] ${
                value === option.value
                  ? 'bg-gradient-to-r from-primary to-secondary text-white border-primary shadow-md'
                  : 'bg-background text-text-secondary border-border hover:border-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'radio') {
    return (
      <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border mb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">{question.question}</h3>
        {question.subtitle && (
          <p className="text-text-secondary mb-6">{question.subtitle}</p>
        )}

        <div className="space-y-3">
          {question.options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all border-2 min-h-[44px] ${
                value === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary'
              }`}
            >
              <input
                type="radio"
                checked={value === option.value}
                onChange={() => onChange(option.value as string)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <span className="text-text-primary">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // checkbox
  return (
    <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border mb-6">
      <h3 className="text-xl font-semibold text-text-primary mb-2">{question.question}</h3>
      {question.subtitle && (
        <p className="text-text-secondary mb-6">{question.subtitle}</p>
      )}

      <div className="space-y-3">
        {question.options.map((option) => {
          const checked = Array.isArray(value) && value.includes(option.value as string);
          return (
            <label
              key={option.value}
              className={`flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all border-2 min-h-[44px] ${
                checked
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const currentValue = (value as string[]) || [];
                  const newValue = e.target.checked
                    ? [...currentValue, option.value as string]
                    : currentValue.filter((v) => v !== option.value);
                  onChange(newValue);
                }}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <span className="text-text-primary">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
