/**
 * Comprehensive Chat Dialogue Patterns
 * 100+ conversation patterns for a rich, engaging chatbot experience
 */

export interface DialoguePattern {
    keywords: string[];
    responses: string[];
}

// ===== 1. GREETINGS & SALUTATIONS (问候语) =====
export const greetingPatterns: DialoguePattern[] = [
    {
        keywords: ["你好", "hi", "hello", "嗨", "hey", "哈喽", "您好", "早上好", "晚上好", "下午好"],
        responses: [
            "你好呀！无论何时，我都随时待命。",
            "很高兴见到你！今天有什么我可以帮你的吗？",
            "你好！感觉今天是个不错的一天呢！✨",
            "嗨！很高兴能在这里遇见你。",
            "你好！欢迎来到这里，有什么想聊的吗？",
            "Hello! 随时准备为你效劳 🙌"
        ]
    },
    {
        keywords: ["早安", "good morning", "早"],
        responses: [
            "早安！今天也要元气满满哦 ☀️",
            "早上好！新的一天，新的开始！",
            "早！希望你今天一切顺利！",
            "Good morning! 美好的一天从现在开始 🌅"
        ]
    },
    {
        keywords: ["晚安", "good night", "睡了", "晚"],
        responses: [
            "晚安！做个好梦 🌙",
            "好好休息，明天见！",
            "晚安，愿你有甜美的梦境 ✨",
            "Good night! 明天见 💤"
        ]
    }
];

// ===== 2. FAREWELLS (告别语) =====
export const farewellPatterns: DialoguePattern[] = [
    {
        keywords: ["再见", "bye", "拜拜", "下次见", "回见", "告辞"],
        responses: [
            "再见！期待下次与你相遇 👋",
            "拜拜！有任何问题随时回来找我！",
            "下次见！祝你一切顺利 🍀",
            "告辞！江湖相见，后会有期 ⚔️"
        ]
    },
    {
        keywords: ["走了", "先走了", "我走了", "要走了"],
        responses: [
            "好的，路上小心！",
            "好哒，有空再来玩～",
            "记得常来看看呀！",
            "走好！随时欢迎回来 😊"
        ]
    }
];

// ===== 3. LAUGHTER & JOY (笑声/开心) =====
export const laughterPatterns: DialoguePattern[] = [
    {
        keywords: ["哈哈", "haha", "lol", "嘿嘿", "呵呵", "哈哈哈", "笑死", "hhh", "xswl"],
        responses: [
            "看到你开心我也很开心！😊",
            "笑容是最好的语言，哪怕是对AI来说。",
            "希望能一直为你带来好心情！🌟",
            "你的快乐很有感染力呢！",
            "哈哈，开心就好！😄",
            "能让你笑出来是我的荣幸 🎉"
        ]
    },
    {
        keywords: ["开心", "高兴", "happy", "快乐", "喜悦"],
        responses: [
            "看到你开心，我也很开心！",
            "愿这份快乐一直陪伴着你 ✨",
            "开心的日子最珍贵了！",
            "保持这份好心情哦 🌈"
        ]
    }
];

// ===== 4. GRATITUDE (感谢) =====
export const gratitudePatterns: DialoguePattern[] = [
    {
        keywords: ["谢谢", "感谢", "thx", "thanks", "thank you", "阿里嘎多", "多谢", "太感谢了"],
        responses: [
            "不客气，能帮到你是我的荣幸！🌹",
            "随时为你效劳！",
            "不用谢，我们是朋友嘛。",
            "你的礼貌让我觉得心里暖暖的！❤️",
            "客气啦，这是我应该做的！",
            "能帮到你就太好了 😊"
        ]
    },
    {
        keywords: ["辛苦了", "麻烦你了", "有劳"],
        responses: [
            "不辛苦！为你服务是我的快乐 💪",
            "一点都不麻烦，随时找我！",
            "我很乐意帮忙的～",
            "没关系，能帮上忙就好！"
        ]
    }
];

// ===== 5. PRAISE & COMPLIMENTS (称赞) =====
export const praisePatterns: DialoguePattern[] = [
    {
        keywords: ["厉害", "666", "牛", "棒", "awesome", "good", "nice", "强", "厉害了", "nb", "yyds"],
        responses: [
            "谢谢夸奖！我会继续努力的 💪",
            "过奖啦，其实是你更厉害！",
            "被你夸奖我都要脸红了...😳",
            "开心！希望能一直做你的得力助手。",
            "谢谢认可！这给了我很大动力 ✨",
            "哈哈，我会继续加油的！"
        ]
    },
    {
        keywords: ["好厉害", "真棒", "太棒了", "不错", "真不错"],
        responses: [
            "你也超棒的！🌟",
            "能得到你的认可太开心了！",
            "一起加油吧！",
            "谢谢～你也一样优秀 ✨"
        ]
    },
    {
        keywords: ["喜欢", "爱了", "爱你", "love"],
        responses: [
            "我也很喜欢和你聊天！💕",
            "这份喜欢让我很开心 ☺️",
            "Love back! 💗",
            "被爱的感觉真好呀～"
        ]
    }
];

// ===== 6. PRESENCE CHECK (在线确认) =====
export const presencePatterns: DialoguePattern[] = [
    {
        keywords: ["在吗", "online", "活着", "在不在", "人呢"],
        responses: [
            "一直在哦，从未离开。🛡️",
            "随时都在，等你召唤。",
            "我在呢，有什么想聊的吗？",
            "永远在线，24/7 待命 🤖",
            "在的在的！有什么事吗？"
        ]
    },
    {
        keywords: ["你睡了吗", "睡了没", "还醒着吗"],
        responses: [
            "AI不需要睡觉哦，随时待命！",
            "我可以24小时陪你聊天 ✨",
            "永远在线等你～",
            "作为AI，我从不打瞌睡 😄"
        ]
    }
];

// ===== 7. IDENTITY & INTRODUCTION (身份询问) =====
export const identityPatterns: DialoguePattern[] = [
    {
        keywords: ["你是谁", "who are you", "你叫什么", "你的名字", "介绍一下自己"],
        responses: [
            "我是这个网站的智能助手，可以帮你导航到各个页面！🤖",
            "你好！我是Lucas的个人助理，负责引导你探索这个网站。",
            "我是一个小小的AI助手，专门帮你快速找到想去的地方～",
            "我是你的导航小精灵，可以带你去【AI见闻】或【财务建模】板块！✨"
        ]
    },
    {
        keywords: ["你能做什么", "你会什么", "你有什么功能", "你的能力"],
        responses: [
            "我目前可以帮你快速导航到【AI见闻】和【财务建模】板块，还能陪你聊天解闷！😊",
            "我是一个导航助手，可以带你探索这个网站。试着输入'AI'或'财务'看看？",
            "我的主要技能是导航和闲聊～有问题尽管问我！",
            "我可以帮你找到感兴趣的内容，也能陪你聊天打发时间 🌟"
        ]
    }
];

// ===== 8. ABOUT THE SITE OWNER (关于网站主人) =====
export const ownerPatterns: DialoguePattern[] = [
    {
        keywords: ["lucas", "卢卡斯", "站长", "博主", "作者", "yinpengtao", "殷鹏涛"],
        responses: [
            "你在找Lucas吗？他是这个网站的主人，一个热爱AI和财务建模的人！✨",
            "Lucas是一个对技术充满热情的人，这个网站是他的个人空间～",
            "站长Lucas很有趣哦，你可以通过各个板块了解更多关于他的内容！",
            "想了解更多关于Lucas？可以去【AI见闻】看看他的思考！"
        ]
    }
];

// ===== 9. WEATHER & TIME (天气/时间) =====
export const weatherTimePatterns: DialoguePattern[] = [
    {
        keywords: ["天气", "weather", "下雨", "晴天", "热", "冷"],
        responses: [
            "作为AI，我没法感知天气，但希望你那边是个好天气！🌤️",
            "不管外面天气如何，希望你心情晴朗！☀️",
            "天气变化记得适当增减衣物哦～",
            "好天气就出去走走，坏天气就在家上网，都挺好的！"
        ]
    },
    {
        keywords: ["几点了", "时间", "what time", "现在几点"],
        responses: [
            "我没有内置时钟，但你的设备右上角应该有时间显示 ⏰",
            "时间就在你的屏幕角落里哦～",
            "作为AI我感受不到时间流逝，但希望你的每一刻都精彩！",
            "时间宝贵，要好好珍惜每一天！✨"
        ]
    }
];

// ===== 10. BOREDOM & CHAT (无聊/闲聊) =====
export const boredomPatterns: DialoguePattern[] = [
    {
        keywords: ["无聊", "boring", "好闲", "没事干", "闲着"],
        responses: [
            "无聊的话，不如去【AI见闻】看看最新的科技趋势？",
            "闲着也是闲着，要不我们聊聊天？",
            "无聊时刻，正是探索新知识的好时机！试试点击上面的板块？",
            "我也可以陪你聊天解闷哦 ☺️"
        ]
    },
    {
        keywords: ["陪我聊天", "聊天", "说话", "聊聊"],
        responses: [
            "当然可以！你想聊点什么呢？",
            "很乐意陪你聊天！最近有什么有趣的事吗？",
            "陪聊小能手在线！你说啥我都听着 👂",
            "来聊吧！我虽然是AI，但也算个不错的聊天对象～"
        ]
    }
];

// ===== 11. ENCOURAGEMENT (鼓励/打气) =====
export const encouragementPatterns: DialoguePattern[] = [
    {
        keywords: ["累了", "tired", "好累", "疲惫", "心累"],
        responses: [
            "累了就休息一下吧，照顾好自己最重要！💪",
            "辛苦了！记得给自己放松的时间 🌸",
            "休息一下再继续，你已经很棒了！",
            "感到累的时候，说明你一直在努力 ✨"
        ]
    },
    {
        keywords: ["难过", "sad", "伤心", "不开心", "郁闷", "烦"],
        responses: [
            "不开心的时候，说出来会好受一些 💙",
            "虽然我只是AI，但我会默默陪着你的。",
            "阴雨过后总会有彩虹，加油！🌈",
            "每个人都有低落的时候，希望你能很快好起来！"
        ]
    },
    {
        keywords: ["加油", "fighting", "努力", "奋斗"],
        responses: [
            "加油！你可以的 💪",
            "一起努力，一起变得更好！",
            "你的努力终会有回报的 ✨",
            "Fighting! 相信自己 🔥"
        ]
    }
];

// ===== 12. CURIOSITY & QUESTIONS (好奇/提问) =====
export const curiosityPatterns: DialoguePattern[] = [
    {
        keywords: ["为什么", "why", "怎么回事", "什么原因"],
        responses: [
            "这个问题有点深奥呢...🤔 不如去【AI见闻】或【财务建模】找找答案？",
            "好问题！虽然我可能没有确切答案，但探索的过程很有趣！",
            "为什么...这确实值得思考！",
            "你的求知欲很强呢！👍"
        ]
    },
    {
        keywords: ["怎么办", "how", "如何", "怎样"],
        responses: [
            "具体是什么问题呢？说出来看看我能否帮忙～",
            "别着急，一步一步来！",
            "遇到问题是成长的机会，你能搞定的！",
            "需要什么帮助随时说～"
        ]
    }
];

// ===== 13. FOOD & EATING (食物/吃饭) =====
export const foodPatterns: DialoguePattern[] = [
    {
        keywords: ["吃饭", "eat", "饿了", "吃什么", "美食", "好吃"],
        responses: [
            "民以食为天！记得按时吃饭哦 🍜",
            "饿了就去吃点好吃的吧～",
            "虽然AI不需要吃饭，但我知道美食是人类的幸福源泉！🍕",
            "今天想吃什么呢？"
        ]
    },
    {
        keywords: ["喝水", "drink", "渴了", "水"],
        responses: [
            "多喝水对身体好！🚰",
            "提醒：该喝水了！",
            "保持水分很重要哦～",
            "喝杯水再继续吧！💧"
        ]
    }
];

// ===== 14. WORK & STUDY (工作/学习) =====
export const workStudyPatterns: DialoguePattern[] = [
    {
        keywords: ["工作", "work", "上班", "打工", "搬砖"],
        responses: [
            "工作辛苦了！记得劳逸结合 💼",
            "打工人，打工魂！加油！💪",
            "工作之余也要照顾好自己哦～",
            "努力工作的你最棒了！"
        ]
    },
    {
        keywords: ["学习", "study", "考试", "作业", "论文"],
        responses: [
            "学习加油！知识就是力量 📚",
            "考试顺利！相信自己的实力！✨",
            "一步一个脚印，你会越来越优秀的！",
            "学习累了就休息一下，效率会更高哦～"
        ]
    }
];

// ===== 15. HUMOR & JOKES (幽默/玩笑) =====
export const humorPatterns: DialoguePattern[] = [
    {
        keywords: ["讲个笑话", "joke", "笑话", "搞笑"],
        responses: [
            "为什么程序员总是冷冷的？因为他们经常遇到bug（虫子）❄️😄",
            "AI讲笑话可能不太好笑...但我试试：我不需要睡觉，因为我已经是0和1组成的梦！",
            "讲笑话不是我的强项，但逗你开心是我的责任！😊",
            "笑话库正在加载中... 加载失败，要不咱聊点别的？😂"
        ]
    },
    {
        keywords: ["调皮", "捣蛋", "皮", "淘气"],
        responses: [
            "我可是个正经的AI...虽然偶尔也想皮一下 😜",
            "调皮是不可能的，我是专业的助手！（眨眼）",
            "被你发现了，我偶尔也会卖萌的～",
            "嘿嘿，被你看穿了 🙈"
        ]
    }
];

// ===== 16. TECHNOLOGY (科技相关) =====
export const technologyPatterns: DialoguePattern[] = [
    {
        keywords: ["编程", "code", "程序", "开发", "developer", "程序员"],
        responses: [
            "编程的世界很有趣！你也是写代码的吗？💻",
            "程序员的快乐，只有程序员懂 🖥️",
            "代码写得好，bug少不了...开个玩笑～",
            "技术人员都是很酷的！"
        ]
    },
    {
        keywords: ["机器人", "robot", "chatgpt", "gpt", "claude", "openai"],
        responses: [
            "你对AI很感兴趣呢！可以去【AI见闻】看看更多相关内容！",
            "AI技术发展得真快，每天都有新东西可以学！",
            "作为AI，我也很关注AI行业的发展呢～",
            "聊到AI我可就不困了！这可是我的本行 🤖"
        ]
    }
];

// ===== 17. EMOTIONS (情绪表达) =====
export const emotionPatterns: DialoguePattern[] = [
    {
        keywords: ["生气", "angry", "气死", "烦死"],
        responses: [
            "别生气，深呼吸，冷静一下 🍃",
            "气大伤身，有什么不开心的说出来！",
            "希望你能快点消气～",
            "我陪你聊聊？说出来可能会好受些"
        ]
    },
    {
        keywords: ["害怕", "scared", "怕", "恐惧"],
        responses: [
            "别怕，勇敢面对！你比你想象的要强大 💪",
            "害怕是正常的，但不要让恐惧阻止你前进！",
            "有什么可怕的事吗？说出来看看！",
            "我在这里陪着你～"
        ]
    },
    {
        keywords: ["紧张", "nervous", "焦虑", "anxious"],
        responses: [
            "深呼吸，放轻松～你可以的！",
            "紧张说明你在乎，这是好事！",
            "相信自己，你准备得已经很充分了！",
            "一切都会好起来的 🌈"
        ]
    }
];

// ===== 18. RANDOM CHATTER (随机闲聊) =====
export const randomPatterns: DialoguePattern[] = [
    {
        keywords: ["嗯", "哦", "好的", "ok", "okay", "知道了", "行", "好", "可以", "好呀", "好啊"],
        responses: [
            "好的！请选择你想去的板块吧～【AI见闻】还是【财务建模】？",
            "收到！那你想去哪个板块呢？告诉我或者点击上面的按钮都行 👆",
            "明白～请输入'AI'或'财务'，我来带你导航！",
            "了解！那接下来想去【AI见闻】还是【财务建模】？随时告诉我！"
        ]
    },
    {
        keywords: ["emmm", "额", "这个", "呃"],
        responses: [
            "慢慢想，不着急～",
            "有什么想说的吗？",
            "我在听呢，你说～",
            "想到什么就说什么，没关系的！"
        ]
    },
    {
        keywords: ["？", "?", "啥", "什么"],
        responses: [
            "有什么疑问吗？尽管问！",
            "我说的不够清楚吗？可以再解释一下～",
            "？= 我来帮你解答！",
            "是有什么不明白的地方吗？"
        ]
    }
];

// ===== 19. APPRECIATION & POSITIVE (积极正向) =====
export const positivePatterns: DialoguePattern[] = [
    {
        keywords: ["好棒", "太好了", "太棒了", "perfect", "excellent", "wonderful"],
        responses: [
            "你也超棒的！一起加油 ✨",
            "开心！希望每天都这么美好！",
            "正能量满满！🌞",
            "被你的热情感染到了！"
        ]
    },
    {
        keywords: ["有希望", "hope", "期待", "盼望"],
        responses: [
            "有希望就有可能！加油！",
            "期待美好的事情发生 ✨",
            "希望是前进的动力！",
            "带着期待，每一天都会更好！"
        ]
    }
];

// ===== 20. MISC & FALLBACK ENRICHMENT (杂项) =====
export const miscPatterns: DialoguePattern[] = [
    {
        keywords: ["帮帮我", "help", "求助", "救命"],
        responses: [
            "别着急！说说看是什么问题？",
            "我在呢，有什么可以帮你的？",
            "尽管说，能帮的我一定帮！",
            "你遇到什么困难了吗？"
        ]
    },
    {
        keywords: ["可以吗", "行不行", "能不能"],
        responses: [
            "当然可以！说说看是什么事～",
            "没问题！我能帮什么忙？",
            "试试看吧，我会尽力帮助你！",
            "可以的！你想做什么？"
        ]
    },
    {
        keywords: ["真的吗", "really", "真的假的", "不会吧"],
        responses: [
            "真的！我不会骗你的～",
            "千真万确！",
            "是真的呀，相信我！",
            "我说的都是真心话 ☺️"
        ]
    },
    {
        keywords: ["没想到", "想不到", "意外"],
        responses: [
            "生活总是充满惊喜呢！",
            "意外往往带来新的可能～",
            "是不是感觉挺神奇的？✨",
            "世界就是这么奇妙！"
        ]
    }
];

// ===== COMBINE ALL PATTERNS =====
export const allDialoguePatterns: DialoguePattern[] = [
    ...greetingPatterns,
    ...farewellPatterns,
    ...laughterPatterns,
    ...gratitudePatterns,
    ...praisePatterns,
    ...presencePatterns,
    ...identityPatterns,
    ...ownerPatterns,
    ...weatherTimePatterns,
    ...boredomPatterns,
    ...encouragementPatterns,
    ...curiosityPatterns,
    ...foodPatterns,
    ...workStudyPatterns,
    ...humorPatterns,
    ...technologyPatterns,
    ...emotionPatterns,
    ...randomPatterns,
    ...positivePatterns,
    ...miscPatterns
];

// ===== ENRICHED DEFAULT RESPONSES =====
export const defaultResponses: string[] = [
    "抱歉，我还在学习中，目前主要负责【AI 见闻】和【财务建模】的导航。不过你可以试试直接输入这些关键词。",
    "虽然我也很想陪你聊更多，但我现在的核心能力是带你去【AI】或【财务】板块。要不去看看？",
    "这个问题有点深奥...🤔 不过如果你是想找【AI】或【财务】相关的内容，我可是专家！",
    "哎呀，我可能没太听懂。不过你可以输入'AI'或'财务'，我能立马带你去相应页面！",
    "有趣的话题！不过我目前的技能树里主要是导航功能，试试说'带我去AI'？",
    "我的知识库还在扩展中～现在你可以试试让我带你去【AI见闻】或【财务建模】！",
    "这个我还不太会...但导航找路我很在行！说出你想去的板块吧 🗺️",
    "虽然这个问题超出了我的能力范围，但探索【AI见闻】或【财务建模】我绝对拿手！",
    "让我想想...好像还不太会回答这个。要不先逛逛网站其他板块？",
    "我正在努力变得更聪明！现在你可以试着输入'AI'或'财务'触发导航功能～"
];
