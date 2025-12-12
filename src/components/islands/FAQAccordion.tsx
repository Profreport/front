import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className="bg-surface border border-border rounded-md overflow-hidden transition-all hover:border-primary"
          >
            <button
              onClick={() => toggleItem(index)}
              type="button"
              className="w-full flex items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-primary/5"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
            >
              <span className="text-lg font-semibold text-text-primary flex-1">
                {item.question}
              </span>
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${index}`}
                className="px-6 pb-6 pt-0"
                aria-hidden="false"
              >
                <p className="text-text-secondary leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
