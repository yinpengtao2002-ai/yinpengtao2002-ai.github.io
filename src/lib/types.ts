import { LucideIcon } from "lucide-react";

// Section data type for explore page
export interface SectionData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    href: string;
    gradient: string;
    iconBg: string;
}

// Article data type for AI page
export interface ArticleData {
    id: number;
    title: string;
    description: string;
    icon: LucideIcon;
    category: string;
    date: string;
}

// Navigation item type
export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

// Site configuration type
export interface SiteConfig {
    name: string;
    title: string;
    description: string;
    subtitle: string;
    author: {
        name: string;
        chineseName: string;
        pinyinName: string;
    };
    links?: {
        github?: string;
        email?: string;
        linkedin?: string;
    };
}

// Animation variants
export interface AnimationConfig {
    initial: object;
    animate: object;
    transition?: object;
}
