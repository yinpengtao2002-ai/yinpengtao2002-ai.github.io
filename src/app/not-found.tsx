import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

const NOT_FOUND_LINKS = [
  { href: "/finance", label: "财务模型", description: "预算复盘、单车归因、趋势和利润推演" },
  { href: "/thinking-lab", label: "工具与思考", description: "AI 工具、创作片段与思考记录" },
];

export default function NotFound() {
  return (
    <div className="not-found-page">
      <section className="not-found-shell" aria-labelledby="not-found-title">
        <p className="not-found-code">404</p>
        <h1 id="not-found-title" className="not-found-title">这一页暂时找不到了</h1>
        <p className="not-found-copy">链接可能已经调整，或者地址输入有误。可以回到首页，或者从下面的入口继续浏览。</p>

        <Link href="/" className="not-found-home">
          <Home aria-hidden="true" />
          回到首页
        </Link>

        <div className="not-found-links">
          {NOT_FOUND_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="not-found-link">
              <span>
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
