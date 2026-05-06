import Image from "next/image";

export default function ProductStageVisual() {
  return (
    <div className="product-stage-visual" aria-label="财务模型、图表输出和 AI 解读组成的产品舞台预览">
      <Image
        src="/images/product-stage/home-hero-stage.png"
        alt="财务模型工作台、图表输出、表格和 AI 解读窗口的产品舞台预览"
        fill
        priority
        sizes="(max-width: 768px) 92vw, 680px"
        className="product-stage-image"
      />
      <div className="product-stage-motion-layer product-stage-motion-shell" aria-hidden="true" />
      <div className="product-stage-motion-layer product-stage-motion-chart" aria-hidden="true" />
      <div className="product-stage-motion-layer product-stage-motion-ai" aria-hidden="true" />
    </div>
  );
}
