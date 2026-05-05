import Link from "next/link";
import { thinkingContent } from "@/lib/data/generated/content";

const METHOD_NOTES = [
  {
    title: "拆问题",
    body: "先确认问题的经营含义，再判断需要数据、模型还是文字分析。",
  },
  {
    title: "找证据",
    body: "把直觉放到数据、资料和反例里校验，避免只凭感觉下结论。",
  },
  {
    title: "做取舍",
    body: "在时间、精度和可执行性之间选择能推进工作的表达方式。",
  },
];

export default function HomeThinkingSection() {
  const latest = thinkingContent.slice(0, 4);

  return (
    <section id="thinking" className="home-viewport home-section home-thinking-section">
      <div className="home-shell home-thinking-method-index">
        <div className="home-thinking-note">
          <p className="home-thinking-kicker">Thinking Lab</p>
          <h2>思考与方法</h2>
          <p>
            这里不是经历罗列，而是一些判断如何形成的样本：我如何拆问题、查证据、做取舍，以及如何把 AI 放进真实工作流。
          </p>
          <div className="home-thinking-note-grid">
            {METHOD_NOTES.map((note) => (
              <div key={note.title}>
                <strong>{note.title}</strong>
                <span>{note.body}</span>
              </div>
            ))}
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
