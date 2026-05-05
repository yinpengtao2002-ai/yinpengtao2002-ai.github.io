import Image from "next/image";

interface FinanceModelPreviewProps {
  src: string;
  alt: string;
  compact?: boolean;
}

export default function FinanceModelPreview({ src, alt, compact = false }: FinanceModelPreviewProps) {
  return (
    <div className={compact ? "finance-model-preview compact" : "finance-model-preview"}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={compact ? "(max-width: 768px) 100vw, 280px" : "(max-width: 768px) 100vw, 380px"}
        className="finance-model-preview-image"
      />
    </div>
  );
}
