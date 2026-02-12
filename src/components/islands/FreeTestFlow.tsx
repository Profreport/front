import { useState } from 'react';
import { calculateMBTIType } from '@/data/mbti-types';
import { calculateKlimovScores, klimovTypes, type KlimovTypeData } from '@/data/klimov-types';
import { calculateDISCScores, discTypes, type DISCTypeData } from '@/data/disc-types';
import { calculateCareerAnchor, type CareerAnchorResult } from '@/data/career-anchors-types';
import { calculateInterestMapScores, type InterestMapScores } from '@/data/interest-map-types';
import { calculateProfessionMatrix, type ProfessionMatrixResult } from '@/data/profession-matrix-types';

type QuestionType = 'binary' | 'likert' | 'most_least';

interface Option {
  label: string;
  value: string | number;
  dimension?: string; // For MBTI: 'E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'
}

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options: Option[];
  dimension?: string; // Which MBTI dimension this question tests
}

interface Section {
  id: string;
  title: string;
  subtitle?: string;
  questions: Question[];
}

interface TestConfig {
  testId: string;
  title: string;
  subtitle: string;
  sections?: Section[]; // For backward compatibility
  sectionsAdult?: Section[];
  sectionsTeen?: Section[];
  instructions: string[];
}

interface TestResult {
  type: string;
  title: string;
  description: string;
  traits: Array<{ label: string; value: string }>;
  professions: string[];
  strengths: string[];
  recommendations: string[];
  historicalFigures?: string[];
  culturalCharacters?: string[];
  klimovResults?: Array<{
    type: KlimovTypeData;
    score: number;
    maxScore: number;
    level: string;
  }>;
  discResults?: Array<{
    type: DISCTypeData;
    score: number;
    maxScore: number;
    percentage: number;
    level: string;
  }>;
  careerAnchorResults?: CareerAnchorResult;
  interestMapResults?: InterestMapScores;
  professionMatrixResult?: ProfessionMatrixResult;
}

interface FreeTestFlowProps {
  config: TestConfig;
}

type Answers = Record<string, string | number | { most: string; least: string }>;

export default function FreeTestFlow({ config }: FreeTestFlowProps) {
  // Only show audience selection for MBTI test with both sectionsAdult and sectionsTeen
  const hasAudienceSelection = config.sectionsAdult && config.sectionsTeen;
  const [stage, setStage] = useState<'audience' | 'start' | 'test' | 'result'>(
    hasAudienceSelection ? 'audience' : 'start'
  );
  const [audience, setAudience] = useState<'teen' | 'adult' | null>(null);
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  // Get sections based on audience or use default sections for backward compatibility
  const sections = config.sections
    ? config.sections
    : (audience === 'teen' ? config.sectionsTeen : config.sectionsAdult) || [];

  // Flatten all questions
  const allQuestions = sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  const getCurrentSection = () => {
    return sections.find((section) =>
      section.questions.some((q) => q.id === currentQuestion?.id)
    );
  };

  const handleAudienceSelect = (selectedAudience: 'teen' | 'adult') => {
    setAudience(selectedAudience);
    setStage('start');
  };

  const handleStart = () => {
    if (!consent) {
      alert('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    setStage('test');
  };

  const handleAnswer = (value: string | number | { most: string; least: string }) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
    setQuestionError(null);
  };

  const handleNext = () => {
    const answer = answers[currentQuestion.id];

    // Validate answer based on question type
    if (!answer) {
      setQuestionError('Пожалуйста, выберите ответ');
      return;
    }

    if (currentQuestion.type === 'most_least') {
      if (typeof answer === 'object' && 'most' in answer && 'least' in answer) {
        if (!answer.most || !answer.least) {
          setQuestionError('Пожалуйста, выберите НАИБОЛЕЕ и НАИМЕНЕЕ подходящее утверждение');
          return;
        }
        if (answer.most === answer.least) {
          setQuestionError('НАИБОЛЕЕ и НАИМЕНЕЕ подходящее не могут быть одинаковыми');
          return;
        }
      } else {
        setQuestionError('Пожалуйста, выберите НАИБОЛЕЕ и НАИМЕНЕЕ подходящее утверждение');
        return;
      }
    }

    setQuestionError(null);
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Test completed - calculate results
      let testResult: TestResult;

      // Choose calculation method based on test type
      if (config.testId === 'mbti') {
        // Filter only string/number answers for MBTI
        const filteredAnswers: Record<string, string | number> = {};
        Object.entries(answers).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            filteredAnswers[key] = value;
          }
        });

        const mbtiResult = calculateMBTIType(filteredAnswers);
        testResult = {
          type: mbtiResult.code,
          title: mbtiResult.title,
          description: mbtiResult.description,
          traits: mbtiResult.traits,
          professions: mbtiResult.professions,
          strengths: mbtiResult.strengths,
          recommendations: mbtiResult.recommendations,
          historicalFigures: mbtiResult.historicalFigures,
          culturalCharacters: mbtiResult.culturalCharacters
        };
      } else if (config.testId === 'klimov') {
        // Filter only string/number answers for Klimov
        const filteredAnswers: Record<string, string | number> = {};
        Object.entries(answers).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            filteredAnswers[key] = value;
          }
        });

        const { scores } = calculateKlimovScores(filteredAnswers);

        // Calculate results for all types
        const klimovResults = Object.entries(scores).map(([typeKey, score]) => {
          const type = klimovTypes[typeKey];
          let level = 'низкая склонность';
          if (score >= 11) level = 'ярко выраженная склонность';
          else if (score >= 6) level = 'средне выраженная склонность';

          return {
            type,
            score,
            maxScore: 16, // Total questions per type in 40 questions
            level
          };
        });

        // Sort by score descending
        klimovResults.sort((a, b) => b.score - a.score);

        testResult = {
          type: 'Климов',
          title: 'Результаты теста Климова (ДДО)',
          description: 'Тест определяет сферу по вашим предпочтениям. И если, например, вы хотите стать экономистом, а по типу «человек-знаковая система» набрали низкие баллы, то это еще не значит, что в данной профессии вы не сможете добиться успеха. Все возможно! Только не факт, что такая деятельность будет доставлять вам удовольствие и будет удовлетворять вас в дальнейшем.',
          traits: [],
          professions: [],
          strengths: [],
          recommendations: [],
          klimovResults
        };
      } else if (config.testId === 'disc') {
        const { scores } = calculateDISCScores(answers);

        // Calculate results for all types
        // In most_least format: 24 questions × 2 points (most) = 48 max per type
        // Also can have negative scores from least selections
        const maxPossibleScore = 48;

        const discResults = Object.entries(scores)
          .map(([typeKey, score]) => {
            const type = discTypes[typeKey];
            // Calculate absolute percentage from max possible score (48)
            // Ensure percentage is at least 0 (for negative scores)
            const percentage = Math.max(0, Math.round((score / maxPossibleScore) * 100));

            // Determine level based on percentage
            let level = 'Не характерен';
            if (percentage >= 51) level = 'Ярко выражен';
            else if (percentage >= 26) level = 'Средне выражен';
            else if (percentage >= 11) level = 'Слабо выражен';

            return {
              type,
              score,
              maxScore: maxPossibleScore,
              percentage,
              level
            };
          });

        // Sort by score descending
        discResults.sort((a, b) => b.score - a.score);

        testResult = {
          type: 'DISC',
          title: 'Результаты DISC-профиля',
          description: 'DISC — это инструмент для оценки поведения, который измеряет четыре основных измерения: Доминирование (D), Влияние (I), Стабильность (S) и Добросовестность (C). Ваш профиль показывает, какие стили поведения наиболее характерны для вас.',
          traits: [],
          professions: [],
          strengths: [],
          recommendations: [],
          discResults
        };
      } else if (config.testId === 'career-anchors') {
        // Filter only string/number answers for Career Anchors
        const filteredAnswers: Record<string, string | number> = {};
        Object.entries(answers).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            filteredAnswers[key] = value;
          }
        });

        const anchorResult = calculateCareerAnchor(filteredAnswers);
        const primaryAnchor = anchorResult.primaryAnchor;

        testResult = {
          type: primaryAnchor.code,
          title: primaryAnchor.title,
          description: primaryAnchor.description,
          traits: primaryAnchor.characteristics.map((char, index) => ({
            label: `Характеристика ${index + 1}`,
            value: char
          })),
          professions: primaryAnchor.professions,
          strengths: primaryAnchor.strengths,
          recommendations: primaryAnchor.recommendations,
          careerAnchorResults: anchorResult
        };
      } else if (config.testId === 'interest-map') {
        // Filter only numeric answers for interest map
        const numericAnswers: Record<string, string | number> = {};
        Object.entries(answers).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            numericAnswers[key] = value;
          }
        });

        const interestMapResult = calculateInterestMapScores(numericAnswers);

        testResult = {
          type: 'Карта интересов',
          title: 'Результаты теста "Карта интересов"',
          description: 'Данный тест выявляет сферы профессиональных интересов. Результаты показывают уровень заинтересованности в различных областях деятельности. Высокие баллы указывают на сферы, которые могут быть наиболее подходящими для выбора профессии.',
          traits: [],
          professions: [],
          strengths: [],
          recommendations: [],
          interestMapResults: interestMapResult
        };
      } else if (config.testId === 'profession-matrix') {
        // Filter only string/number answers for profession matrix
        const stringAnswers: Record<string, string | number> = {};
        Object.entries(answers).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            stringAnswers[key] = value;
          }
        });

        const matrixResult = calculateProfessionMatrix(stringAnswers);

        testResult = {
          type: `${matrixResult.objectTitle} × ${matrixResult.activityTitle}`,
          title: `Направление: ${matrixResult.objectTitle} (${matrixResult.activityTitle} характер)`,
          description: matrixResult.description,
          traits: matrixResult.characteristics.map((char) => ({
            label: 'Характеристика',
            value: char,
          })),
          professions: matrixResult.professions,
          strengths: [],
          recommendations: matrixResult.recommendations,
          professionMatrixResult: matrixResult,
        };
      } else {
        // Default fallback
        testResult = {
          type: 'Unknown',
          title: 'Результат',
          description: 'Спасибо за прохождение теста!',
          traits: [],
          professions: [],
          strengths: [],
          recommendations: []
        };
      }

      setResult(testResult);
      setStage('result');
    }
  };

  const handleBack = () => {
    setQuestionError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    setStage(hasAudienceSelection ? 'audience' : 'start');
    setAudience(null);
    setConsent(false);
  };

  const handleExit = () => {
    window.location.href = '/free-tests';
  };

  // Audience selection screen
  if (stage === 'audience') {
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
            <p className="text-lg text-text-secondary mb-12 text-center">
              Выберите для кого предназначен тест
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleAudienceSelect('teen')}
                className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-border hover:border-primary rounded-lg transition-all hover:shadow-lg group"
              >
                <div className="text-6xl mb-4 text-center">🎓</div>
                <h2 className="text-2xl font-bold text-text-primary mb-3 text-center group-hover:text-primary transition-colors">
                  Для подростка
                </h2>
                <p className="text-text-secondary text-center">
                  Вопросы адаптированы для школьников и студентов (14-18 лет)
                </p>
              </button>

              <button
                onClick={() => handleAudienceSelect('adult')}
                className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-border hover:border-primary rounded-lg transition-all hover:shadow-lg group"
              >
                <div className="text-6xl mb-4 text-center">💼</div>
                <h2 className="text-2xl font-bold text-text-primary mb-3 text-center group-hover:text-primary transition-colors">
                  Для взрослого
                </h2>
                <p className="text-text-secondary text-center">
                  Вопросы про работу, карьеру и профессиональное развитие
                </p>
              </button>
            </div>

            <div className="mt-8 text-center">
              <a
                href="/free-tests"
                className="text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                <span>←</span>
                <span>Назад к списку тестов</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

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

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
                <p className="text-green-800 flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <span className="font-semibold">Тест полностью бесплатный! Результаты сразу на экране.</span>
                </p>
              </div>

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
              Начать тест бесплатно
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
                Выйти
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
                {currentSection.subtitle && (
                  <p className="text-text-secondary">{currentSection.subtitle}</p>
                )}
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

            {/* Validation error */}
            {questionError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-md">
                <p className="text-sm text-red-600 font-medium">
                  {questionError}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
                className="flex-1 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
              >
                Назад
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-all hover:shadow-md min-h-[44px] cursor-pointer"
              >
                {currentQuestionIndex === totalQuestions - 1 ? 'Узнать результат' : 'Далее'}
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

  // Result screen
  if (stage === 'result' && result) {
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
          <div className="max-w-4xl mx-auto">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              {result.klimovResults || result.discResults ? (
                <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                  {result.title}
                </h1>
              ) : (
                <>
                  <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                    Ваш результат: {result.type}
                  </h1>
                  <p className="text-xl text-text-secondary">
                    {result.title}
                  </p>
                </>
              )}
            </div>

            {/* Result Cards */}
            <div className="space-y-6">
              {/* DISC-specific results */}
              {result.discResults && result.discResults.length > 0 ? (
                <>
                  {/* All DISC Types Profile */}
                  <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-text-primary mb-6">
                      Ваш DISC-профиль поведения
                    </h2>
                    <p className="text-text-secondary mb-6">
                      DISC измеряет четыре основных поведенческих стиля. Каждый тип оценивается в процентах. Ваш профиль показывает уникальную комбинацию этих стилей.
                    </p>
                    <div className="space-y-4">
                      {result.discResults.map((discResult, index) => {
                        const isTop = index === 0;

                        // Determine level based on percentage
                        let levelText = '';
                        let levelDescription = '';
                        let levelColor = '';
                        let barColor = '';

                        if (discResult.percentage >= 51) {
                          levelText = 'Ярко выражен';
                          levelDescription = 'Доминирующий стиль';
                          levelColor = 'text-green-700';
                          barColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
                        } else if (discResult.percentage >= 26) {
                          levelText = 'Средне выражен';
                          levelDescription = 'Значимый стиль';
                          levelColor = 'text-blue-700';
                          barColor = 'bg-gradient-to-r from-blue-500 to-cyan-500';
                        } else if (discResult.percentage >= 11) {
                          levelText = 'Слабо выражен';
                          levelDescription = 'Умеренно присутствует';
                          levelColor = 'text-yellow-700';
                          barColor = 'bg-gradient-to-r from-yellow-500 to-orange-500';
                        } else {
                          levelText = 'Не характерен';
                          levelDescription = 'Не выражен';
                          levelColor = 'text-gray-600';
                          barColor = 'bg-gradient-to-r from-gray-400 to-gray-500';
                        }

                        return (
                          <div key={discResult.type.title} className={`p-4 rounded-lg border-2 transition-all ${
                            isTop ? 'bg-primary/5 border-primary' : 'bg-background border-border'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className={`text-lg font-semibold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {index + 1}. {discResult.type.title}
                                  {isTop && discResult.percentage >= 51 && (
                                    <span className="ml-2 text-sm bg-primary text-white px-2 py-1 rounded">
                                      Доминирующий
                                    </span>
                                  )}
                                </h3>
                                <div className="mt-1">
                                  <span className={`text-sm font-semibold ${levelColor}`}>
                                    {levelText}
                                  </span>
                                  <span className="text-xs text-text-secondary ml-2">
                                    • {levelDescription}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className={`text-2xl font-bold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {discResult.percentage}%
                                </div>
                                <div className="text-sm text-text-secondary">{discResult.score} баллов</div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${discResult.percentage}%` }}
                              />
                            </div>

                            <p className="text-sm text-text-secondary leading-relaxed">
                              {discResult.type.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 p-4 bg-background rounded-lg border border-border">
                      <h4 className="text-sm font-semibold text-text-primary mb-3">Интерпретация процентов:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>51-100%:</strong> Ярко выражен</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>26-50%:</strong> Средне выражен</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>11-25%:</strong> Слабо выражен</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>0-10%:</strong> Не характерен</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed information for each type */}
                  {result.discResults
                    .filter(discResult => discResult.percentage >= 11)
                    .map((discResult, index) => {
                      const isTop = index === 0;

                      return (
                        <div key={discResult.type.title} className={`p-6 lg:p-8 rounded-lg border shadow-sm ${
                          isTop ? 'bg-gradient-to-br from-primary/5 to-secondary/5 border-primary' : 'bg-surface border-border'
                        }`}>
                          <h2 className={`text-2xl font-bold mb-4 ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                            {discResult.type.title} {isTop && '(Ваш доминирующий стиль)'}
                          </h2>

                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Характеристики</h3>
                              <ul className="space-y-2">
                                {discResult.type.characteristics.map((char, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span className="text-text-secondary">{char}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Сильные стороны</h3>
                              <ul className="space-y-2">
                                {discResult.type.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-secondary mt-1">✓</span>
                                    <span className="text-text-secondary">{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Подходящие профессии</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {discResult.type.professions.map((profession, idx) => (
                                  <div key={idx} className="px-3 py-2 bg-white rounded-md text-sm text-text-primary border border-border">
                                    {profession}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Рекомендации по развитию</h3>
                              <ul className="space-y-2">
                                {discResult.type.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">💡</span>
                                    <span className="text-text-secondary">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                              <h3 className="text-lg font-semibold text-text-primary mb-2">Стиль работы</h3>
                              <p className="text-text-secondary">
                                {discResult.type.workStyle}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* General description */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                    <p className="text-yellow-800 leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </>
              ) : result.klimovResults && result.klimovResults.length > 0 ? (
                <>
                  {/* All Klimov Types Profile */}
                  <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-text-primary mb-6">
                      Ваш профиль профессиональных склонностей
                    </h2>
                    <p className="text-text-secondary mb-6">
                      Каждый тип оценивается по количеству набранных баллов. Чем выше балл, тем сильнее выражена склонность к данному типу профессий.
                    </p>
                    <div className="space-y-4">
                      {result.klimovResults.map((klimovResult, index) => {
                        const percentage = Math.round((klimovResult.score / klimovResult.maxScore) * 100);
                        const isTop = index === 0;

                        // Determine level based on score
                        let levelText = '';
                        let levelDescription = '';
                        let levelColor = '';
                        let barColor = '';

                        if (klimovResult.score >= 11) {
                          levelText = 'Ярко выраженная склонность';
                          levelDescription = 'Доминирующий тип';
                          levelColor = 'text-green-700';
                          barColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
                        } else if (klimovResult.score >= 6) {
                          levelText = 'Средне выраженная склонность';
                          levelDescription = 'Значимый тип';
                          levelColor = 'text-blue-700';
                          barColor = 'bg-gradient-to-r from-blue-500 to-cyan-500';
                        } else {
                          levelText = 'Низкая склонность';
                          levelDescription = 'Не характерен';
                          levelColor = 'text-gray-600';
                          barColor = 'bg-gradient-to-r from-gray-400 to-gray-500';
                        }

                        return (
                          <div key={klimovResult.type.title} className={`p-4 rounded-lg border-2 transition-all ${
                            isTop ? 'bg-primary/5 border-primary' : 'bg-background border-border'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className={`text-lg font-semibold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {index + 1}. {klimovResult.type.title}
                                  {isTop && klimovResult.score >= 11 && (
                                    <span className="ml-2 text-sm bg-primary text-white px-2 py-1 rounded">
                                      Доминирующий
                                    </span>
                                  )}
                                </h3>
                                <div className="mt-1">
                                  <span className={`text-sm font-semibold ${levelColor}`}>
                                    {levelText}
                                  </span>
                                  <span className="text-xs text-text-secondary ml-2">
                                    • {levelDescription}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className={`text-2xl font-bold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {klimovResult.score}
                                </div>
                                <div className="text-sm text-text-secondary">из {klimovResult.maxScore}</div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            <p className="text-sm text-text-secondary leading-relaxed">
                              {klimovResult.type.description}
                            </p>

                            {klimovResult.type.courses && klimovResult.score >= 6 && (
                              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <p className="text-sm text-text-primary">
                                  <strong>💡 Рекомендуем:</strong> {klimovResult.type.courses}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 p-4 bg-background rounded-lg border border-border">
                      <h4 className="text-sm font-semibold text-text-primary mb-3">Интерпретация баллов:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>11-16:</strong> Ярко выраженная склонность</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>6-10:</strong> Средне выраженная склонность</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>0-5:</strong> Низкая склонность</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General description */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                    <p className="text-yellow-800 leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Description */}
                  <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">
                      Описание вашего типа
                    </h2>
                    <p className="text-text-secondary leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </>
              )}

              {/* Career Anchors specific results */}
              {result.careerAnchorResults && (
                <>
                  {/* All Career Anchors Profile */}
                  <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-text-primary mb-6">
                      Ваш профиль карьерных якорей
                    </h2>
                    <p className="text-text-secondary mb-6">
                      Каждый якорь оценивается по шкале от 0 до 10 баллов. Чем выше балл, тем сильнее этот мотив влияет на ваши карьерные решения.
                    </p>
                    <div className="space-y-4">
                      {result.careerAnchorResults.dominantAnchors.map((item, index) => {
                        const percentage = (item.score / 10) * 100;
                        const isTop = index === 0;

                        // Determine level based on classic Schein interpretation
                        let levelText = '';
                        let levelDescription = '';
                        let levelColor = '';
                        let barColor = '';

                        if (item.score >= 8.0) {
                          levelText = 'Очень высокая выраженность';
                          levelDescription = 'Доминирующий карьерный мотив';
                          levelColor = 'text-green-700';
                          barColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
                        } else if (item.score >= 6.0) {
                          levelText = 'Высокая выраженность';
                          levelDescription = 'Значимый карьерный мотив';
                          levelColor = 'text-blue-700';
                          barColor = 'bg-gradient-to-r from-blue-500 to-cyan-500';
                        } else if (item.score >= 4.0) {
                          levelText = 'Средняя выраженность';
                          levelDescription = 'Умеренно важен';
                          levelColor = 'text-yellow-700';
                          barColor = 'bg-gradient-to-r from-yellow-500 to-orange-500';
                        } else {
                          levelText = 'Низкая выраженность';
                          levelDescription = 'Не характерен';
                          levelColor = 'text-gray-600';
                          barColor = 'bg-gradient-to-r from-gray-400 to-gray-500';
                        }

                        return (
                          <div key={item.anchor.code} className={`p-4 rounded-lg border-2 transition-all ${
                            isTop ? 'bg-primary/5 border-primary' : 'bg-background border-border'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className={`text-lg font-semibold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {index + 1}. {item.anchor.title}
                                  {isTop && item.score >= 8.0 && (
                                    <span className="ml-2 text-sm bg-primary text-white px-2 py-1 rounded">
                                      Доминирующий
                                    </span>
                                  )}
                                </h3>
                                <div className="mt-1">
                                  <span className={`text-sm font-semibold ${levelColor}`}>
                                    {levelText}
                                  </span>
                                  <span className="text-xs text-text-secondary ml-2">
                                    • {levelDescription}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className={`text-2xl font-bold ${isTop ? 'text-primary' : 'text-text-primary'}`}>
                                  {item.score.toFixed(1)}
                                </div>
                                <div className="text-sm text-text-secondary">из 10</div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            <p className="text-sm text-text-secondary leading-relaxed">
                              {item.anchor.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 p-4 bg-background rounded-lg border border-border">
                      <h4 className="text-sm font-semibold text-text-primary mb-3">Интерпретация баллов:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>8.0-10.0:</strong> Очень высокая выраженность</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>6.0-7.9:</strong> Высокая выраженность</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>4.0-5.9:</strong> Средняя выраженность</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"></div>
                          <span className="text-text-secondary"><strong>1.0-3.9:</strong> Низкая выраженность</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Anchor Details */}
                  <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">
                      Ваш доминирующий якорь: {result.title}
                    </h2>

                    <div className="space-y-6">
                      {/* Characteristics */}
                      {result.traits.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary mb-3">Характеристики</h3>
                          <ul className="space-y-2">
                            {result.traits.map((trait, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span className="text-text-secondary">{trait.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Strengths */}
                      {result.strengths.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary mb-3">Сильные стороны</h3>
                          <ul className="space-y-2">
                            {result.strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-secondary mt-1">✓</span>
                                <span className="text-text-secondary">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Professions */}
                      {result.professions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary mb-3">Подходящие профессии</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {result.professions.map((profession, idx) => (
                              <div key={idx} className="px-3 py-2 bg-white rounded-md text-sm text-text-primary border border-border">
                                {profession}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {result.recommendations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary mb-3">Рекомендации</h3>
                          <ul className="space-y-2">
                            {result.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">💡</span>
                                <span className="text-text-secondary">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Interest Map specific results */}
              {result.interestMapResults && (
                <>
                  {result.interestMapResults.dominantSpheres.map((sphereResult, index) => {
                    const isLowInterest = sphereResult.percentage < 20;

                    // Get level badge color
                    const getLevelColor = (level: string) => {
                      if (level === 'Очень высокий интерес') return 'bg-green-100 text-green-800 border-green-300';
                      if (level === 'Высокий интерес') return 'bg-blue-100 text-blue-800 border-blue-300';
                      if (level === 'Средний интерес') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                      if (level === 'Низкий интерес') return 'bg-orange-100 text-orange-800 border-orange-300';
                      return 'bg-gray-100 text-gray-600 border-gray-300';
                    };

                    return (
                      <div key={index} className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-text-primary mb-2">
                              {index + 1}. {sphereResult.sphere.title}
                            </h2>
                            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getLevelColor(sphereResult.level)}`}>
                              {sphereResult.level}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{sphereResult.percentage}%</div>
                            <div className="text-sm text-text-secondary">{sphereResult.score} из {sphereResult.maxScore} баллов</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-6">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                            style={{ width: `${sphereResult.percentage}%` }}
                          />
                        </div>

                        {/* Show content based on interest level */}
                        {isLowInterest ? (
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-2">Описание</h3>
                              <p className="text-text-secondary leading-relaxed">
                                {sphereResult.sphere.description}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">
                                Данная сфера деятельности вызывает у вас низкий интерес. Это нормально — каждый человек имеет свои уникальные склонности и предпочтения.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-2">Описание</h3>
                              <p className="text-text-secondary leading-relaxed">
                                {sphereResult.sphere.description}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Подходящие профессии</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {sphereResult.sphere.professions.map((profession, idx) => (
                                  <div key={idx} className="px-3 py-2 bg-primary/5 rounded-md text-sm text-text-primary">
                                    {profession}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-3">Рекомендации по развитию</h3>
                              <ul className="space-y-2">
                                {sphereResult.sphere.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">💡</span>
                                    <span className="text-text-secondary">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* General description */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                    <p className="text-yellow-800 leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </>
              )}

              {/* Standard test results (not for Klimov or DISC or Career Anchors or Interest Map) */}
              {!result.klimovResults && !result.discResults && !result.careerAnchorResults && !result.interestMapResults && (
                <>
                  {/* Traits */}
                  {result.traits.length > 0 && (
                    <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                      <h2 className="text-2xl font-bold text-text-primary mb-4">
                        Ваши характеристики
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.traits.map((trait, index) => (
                          <div key={index} className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <div>
                              <span className="font-semibold text-text-primary">{trait.label}:</span>
                              <span className="text-text-secondary ml-2">{trait.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {result.strengths.length > 0 && (
                    <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                      <h2 className="text-2xl font-bold text-text-primary mb-4">
                        Ваши сильные стороны
                      </h2>
                      <ul className="space-y-3">
                        {result.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                            </div>
                            <span className="text-text-secondary leading-tight">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Professions */}
                  {result.professions.length > 0 && (
                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                      <h2 className="text-2xl font-bold text-text-primary mb-4">
                        Подходящие профессии
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.professions.map((profession, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-white rounded-lg">
                            <span className="text-primary font-semibold">✓</span>
                            <span className="text-text-primary">{profession}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                      <h2 className="text-2xl font-bold text-text-primary mb-4">
                        Рекомендации
                      </h2>
                      <ul className="space-y-3">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="text-primary text-xl">💡</span>
                            <span className="text-text-secondary leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Historical Figures */}
              {(result.historicalFigures && result.historicalFigures.length > 0) && (
                <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                  <h2 className="text-2xl font-bold text-text-primary mb-4">
                    Известные личности этого типа
                  </h2>
                  <ul className="space-y-3">
                    {result.historicalFigures.map((figure, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-secondary text-xl">🌟</span>
                        <span className="text-text-secondary leading-relaxed">{figure}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cultural Characters */}
              {(result.culturalCharacters && result.culturalCharacters.length > 0) && (
                <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border shadow-sm">
                  <h2 className="text-2xl font-bold text-text-primary mb-4">
                    Персонажи из культуры и кино
                  </h2>
                  <ul className="space-y-3">
                    {result.culturalCharacters.map((character, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-secondary text-xl">🎬</span>
                        <span className="text-text-secondary leading-relaxed">{character}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer (only for non-Klimov, non-DISC, non-Career-Anchors and non-Interest-Map tests) */}
              {!result.klimovResults && !result.discResults && !result.careerAnchorResults && !result.interestMapResults && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                  <p className="text-yellow-800 leading-relaxed">
                    <strong>Важно:</strong> Результаты, полученные без участия специалиста, не воспринимайте слишком серьезно. Этот тест дает общее представление о вашем типе личности, но для точной диагностики рекомендуется консультация с психологом.
                  </p>
                </div>
              )}
            </div>

            {/* CTA Section */}
            <div className="mt-12 bg-gradient-to-br from-primary/10 to-secondary/10 p-8 rounded-lg border border-border">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-3">
                  Хотите получить более детальный анализ?
                </h2>
                <p className="text-text-secondary">
                  Пройдите комплексный платный тест и получите полный PDF-отчет с 15-20 профессиями,
                  детальным планом развития карьеры и персональными рекомендациями от ИИ
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/tests"
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-md hover:opacity-90 transition-all hover:shadow-md text-center"
                >
                  Платные тесты
                </a>
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-all"
                >
                  Пройти тест снова
                </button>
                <a
                  href="/free-tests"
                  className="px-6 py-3 border-2 border-border text-text-primary font-semibold rounded-md hover:border-primary transition-all text-center"
                >
                  Другие тесты
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

// QuestionCard component
function QuestionCard({ question, value, onChange }: {
  question: Question;
  value: string | number | { most: string; least: string } | undefined;
  onChange: (value: string | number | { most: string; least: string }) => void;
}) {
  // Handle most_least type
  if (question.type === 'most_least') {
    const mostLeastValue = typeof value === 'object' && value !== null && 'most' in value ? value : { most: '', least: '' };

    const handleOptionClick = (optionValue: string, type: 'most' | 'least') => {
      const newValue = { ...mostLeastValue, [type]: optionValue };
      onChange(newValue);
    };

    return (
      <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border mb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-6">{question.question}</h3>

        <div className="space-y-4">
          {question.options.map((option) => {
            const isMost = mostLeastValue.most === option.value;
            const isLeast = mostLeastValue.least === option.value;
            const isSelected = isMost || isLeast;

            return (
              <div key={option.value} className="flex items-center gap-3">
                {/* Most button */}
                <button
                  onClick={() => handleOptionClick(String(option.value), 'most')}
                  className={`flex-shrink-0 w-10 h-10 rounded-md font-bold transition-all border-2 ${
                    isMost
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-border hover:border-green-500 text-text-secondary'
                  }`}
                  title="Наиболее подходящее"
                >
                  ✓
                </button>

                {/* Option label */}
                <div className={`flex-1 p-3 rounded-md border-2 transition-all ${
                  isSelected
                    ? isMost
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-border'
                }`}>
                  <span className={`${isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                    {option.label}
                  </span>
                </div>

                {/* Least button */}
                <button
                  onClick={() => handleOptionClick(String(option.value), 'least')}
                  className={`flex-shrink-0 w-10 h-10 rounded-md font-bold transition-all border-2 ${
                    isLeast
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-border hover:border-red-500 text-text-secondary'
                  }`}
                  title="Наименее подходящее"
                >
                  ✗
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-background rounded-lg border border-border">
          <div className="flex items-center justify-around text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-md flex items-center justify-center font-bold">✓</div>
              <span className="text-text-secondary">НАИБОЛЕЕ подходящее</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 text-white rounded-md flex items-center justify-center font-bold">✗</div>
              <span className="text-text-secondary">НАИМЕНЕЕ подходящее</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (question.type === 'binary' || question.type === 'likert') {
    return (
      <div className="bg-surface p-6 lg:p-8 rounded-lg border border-border mb-6">
        <h3 className="text-xl font-semibold text-text-primary mb-6">{question.question}</h3>

        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-md font-medium transition-all border-2 min-h-[44px] cursor-pointer text-left ${
                value === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === option.value
                  ? 'border-primary bg-primary'
                  : 'border-border'
              }`}>
                {value === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <span className={value === option.value ? 'text-text-primary font-semibold' : 'text-text-secondary'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
