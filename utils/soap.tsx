export type BillingCode = {
  code: string;
  type: 'ICD-10' | 'CPT';
  description: string;
  confidence: 'high' | 'medium' | 'low';
};

export const CONFIDENCE_STYLES: Record<BillingCode['confidence'], string> = {
  high: 'bg-sage-primary/15 text-sage-primary border-sage-primary/30',
  medium: 'bg-sage-primary/5 text-sage-primary/80 border-sage-primary/20',
  low: 'bg-slate-100 text-slate-400 border-slate-200',
};

export const formatSoapText = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} className="block mb-2">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </span>
    );
  });
};
