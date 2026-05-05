import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { thinkingContent } from "@/lib/data/generated/content";

export default function HomeThinkingSection() {
  const latest = thinkingContent.slice(0, 4);

  return (
    <section id="thinking" className="home-viewport home-section home-thinking-section">
      <div className="home-shell home-thinking-method-index">
        <div className="home-thinking-visual-card">
          <Image
            src="/images/home/thinking-methods-tech.png"
            alt="思考与方法内容预览"
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="home-thinking-visual-image"
          />
          <div className="home-thinking-visual-shade" aria-hidden="true" />
          <div className="home-thinking-visual-copy">
            <p className="home-thinking-kicker">Thinking Lab</p>
            <h2>思考与方法</h2>
            <Link href="/thinking-lab" className="home-thinking-all-link">
              查看全部 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        </div>

        <div className="home-thinking-list">
          {latest.map((article) => (
            <Link key={article.slug} href={article.href} className="home-thinking-item">
              <span>{article.date}</span>
              <h3>{article.title}</h3>
              <p>
                <strong>方法摘句：</strong>
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
