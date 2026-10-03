import Link from "next/link";
import { ArrowUpRight, Linkedin, Mail, MessageCircle, Phone } from "lucide-react";
import CopyValueButton from "@/components/home/CopyValueButton";
import { siteConfig } from "@/lib/config/site";

const WECHAT_ID = "YPT1479239526";
const LINKEDIN_URL = "https://www.linkedin.com/in/lucasyin2002/";

export default function HomeContactSection() {
  return (
    <section id="contact" className="home-section home-contact-section" aria-labelledby="home-contact-title">
      <div className="home-shell home-contact-shell">
        <div className="home-contact-intro">
          <p className="home-contact-eyebrow">Contact</p>
          <h2 id="home-contact-title" className="home-contact-title">Lucas Yin</h2>
          <p className="home-contact-tagline">经营分析 · 财务模型 · AI 实践</p>
          <p className="home-contact-note">欢迎交流财务模型、经营分析和 AI 工具的想法与用法。</p>
        </div>

        <ul className="home-contact-list" aria-label="联系方式">
          <li>
            <a className="home-contact-item" href={`mailto:${siteConfig.links?.email}`}>
              <span className="home-contact-icon" aria-hidden="true">
                <Mail />
              </span>
              <span className="home-contact-text">
                <span className="home-contact-label">邮箱</span>
                <strong className="home-contact-value">{siteConfig.links?.email}</strong>
              </span>
              <ArrowUpRight className="home-contact-arrow" aria-hidden="true" />
            </a>
          </li>
          <li>
            <div className="home-contact-item is-wechat">
              <span className="home-contact-icon" aria-hidden="true">
                <MessageCircle />
              </span>
              <span className="home-contact-text">
                <span className="home-contact-label">微信</span>
                <strong className="home-contact-value">{WECHAT_ID}</strong>
              </span>
              <CopyValueButton value={WECHAT_ID} label="微信号" />
            </div>
          </li>
          <li>
            <a className="home-contact-item is-phone" href={`tel:${siteConfig.links?.phone}`}>
              <span className="home-contact-icon" aria-hidden="true">
                <Phone />
              </span>
              <span className="home-contact-text">
                <span className="home-contact-label">电话</span>
                <strong className="home-contact-value">{siteConfig.links?.phone}</strong>
              </span>
              <ArrowUpRight className="home-contact-arrow" aria-hidden="true" />
            </a>
          </li>
          <li>
            <a className="home-contact-item is-linkedin" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              <span className="home-contact-icon" aria-hidden="true">
                <Linkedin />
              </span>
              <span className="home-contact-text">
                <span className="home-contact-label">LinkedIn</span>
                <strong className="home-contact-value">lucasyin2002</strong>
              </span>
              <ArrowUpRight className="home-contact-arrow" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </div>

      <div className="home-shell home-contact-bottom">
        <span>© Lucas Yin · 殷鹏焘</span>
        <nav className="home-contact-links" aria-label="页脚导航">
          <Link href="/finance">财务模型</Link>
          <Link href="/thinking-lab">工具与思考</Link>
          <a href="#home">回到顶部</a>
        </nav>
      </div>
    </section>
  );
}
