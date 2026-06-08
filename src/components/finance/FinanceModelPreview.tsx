import Image from "next/image";

interface FinanceModelPreviewProps {
  src: string;
  alt: string;
  compact?: boolean;
  priority?: boolean;
}

export default function FinanceModelPreview({ src, alt, compact = false, priority = false }: FinanceModelPreviewProps) {
  return (
    <div className={compact ? "finance-model-preview compact" : "finance-model-preview"}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        draggable={false}
        sizes={compact ? "(max-width: 768px) 120px, 360px" : "(max-width: 768px) 100vw, 520px"}
        className="finance-model-preview-image"
      />
    </div>
  );
}
