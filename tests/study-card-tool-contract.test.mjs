import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI vocabulary card tool is exposed as an independent tool route", async () => {
  const page = await readProjectFile("src/app/tools/study-cards/page.tsx");
  const client = await readProjectFile("src/app/tools/study-cards/StudyCardsTool.tsx");
  const content = await readProjectFile("src/lib/data/thinkingLabContent.ts");
  const sitemap = await readProjectFile("src/app/sitemap.ts");
  const navigation = await readProjectFile("src/components/layout/SiteNavigation.tsx");
  const clientShell = await readProjectFile("src/components/ClientShell.tsx");

  assert.match(page, /AI 单词卡/);
  assert.match(page, /StudyCardsTool/);
  assert.match(page, /从英文文章或单词清单生成背诵卡/);
  assert.doesNotMatch(page, /AI 学习卡片生成器/);
  assert.doesNotMatch(page, /逐张翻看的 AI 问答闪卡/);
  assert.match(client, /\/api\/tools\/study-cards/);
  assert.match(client, /背单词卡/);
  assert.match(client, /英文文章/);
  assert.match(client, /逐行单词/);
  assert.match(client, /study-cards-progress/);
  assert.match(client, /progressValue/);
  assert.match(client, /日常阅读/);
  assert.match(client, /考试进阶/);
  assert.match(client, /高阶表达/);
  assert.match(client, /const \[cardCount, setCardCount\] = useState\(10\)/);
  assert.doesNotMatch(client, /考试：/);
  assert.doesNotMatch(client, /独立工具/);
  assert.match(content, /slug:\s*"study-cards"/);
  assert.match(content, /href:\s*"\/tools\/study-cards"/);
  assert.match(content, /AI 单词卡/);
  assert.match(content, /英文文章或单词清单/);
  assert.doesNotMatch(content, /逐张翻看的 AI 问答闪卡/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/study-cards/);
  assert.match(navigation, /\/tools\/study-cards/);
  assert.match(clientShell, /\/tools\/study-cards/);
  assert.doesNotMatch(clientShell.match(/function shouldHideAssistant[\s\S]*?\n}/)?.[0] ?? "", /study-cards/);
});

test("AI vocabulary card results use a one-card spaced-memory flow", async () => {
  const client = await readProjectFile("src/app/tools/study-cards/StudyCardsTool.tsx");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(client, /type VocabularyCard/);
  assert.match(client, /word: string/);
  assert.match(client, /phonetic\?: string/);
  assert.match(client, /translation: string/);
  assert.match(client, /example: string/);
  assert.match(client, /exampleTranslation\?: string/);
  assert.match(client, /source\?: string/);
  assert.match(client, /level\?: string/);
  assert.match(client, /StudyCardResult/);
  assert.match(client, /mode\?: "article" \| "word-list"/);
  assert.match(client, /activeCardIndex/);
  assert.match(client, /answerRevealed/);
  assert.match(client, /has-result/);
  assert.match(client, /PracticeMode/);
  assert.match(client, /"learn" \| "check"/);
  assert.match(client, /practiceMode/);
  assert.match(client, /hasCompletedLearningRound/);
  assert.match(client, /buildLearningQueue/);
  assert.match(client, /transitionToCheckRound/);
  assert.match(client, /先认词/);
  assert.match(client, /回忆检查/);
  assert.match(client, /已认识/);
  assert.match(client, /陌生词会近期复现/);
  assert.match(client, /SAMPLE_RESULT/);
  assert.match(client, /loadSampleContent/);
  assert.match(client, /algorithmic feeds/);
  assert.match(client, /ubiquitous/);
  assert.match(client, /resilience/);
  assert.match(client, /deliberate/);
  assert.match(client, /ambiguity/);
  assert.match(client, /短文高频难词/);
  assert.match(client, /setDifficulty\(DIFFICULTY_OPTIONS\[2\]\)/);
  assert.match(client, /study-cards-empty-preview/);
  assert.match(client, /试试看单词卡/);
  assert.match(client, /先看英文，再翻中文/);
  assert.match(client, /study-cards-empty-word-row/);
  assert.match(client, /study-cards-empty-speak/);
  assert.match(client, /study-cards-empty-example/);
  assert.match(client, /study-cards-empty-speak-label/);
  assert.match(client, /Smartphones have become ubiquitous in modern classrooms\./);
  assert.match(client, /智能手机在现代课堂里已经无处不在。/);
  assert.match(client, /答完后点这里看释义/);
  assert.match(client, /cardMotion/);
  assert.match(client, /dragOffset/);
  assert.match(client, /handleCardPointerDown/);
  assert.match(client, /handleCardPointerMove/);
  assert.match(client, /handleCardPointerUp/);
  assert.match(client, /handleAnswerPanelKeyDown/);
  assert.match(client, /role="button"/);
  assert.match(client, /tabIndex=\{0\}/);
  assert.doesNotMatch(client, /<button\s+type="button"\s+className=\{`study-cards-answer-panel/);
  assert.match(client, /outputPanelRef/);
  assert.match(client, /focusCardsOnMobile/);
  assert.match(client, /mobilePracticeActive/);
  assert.match(client, /is-mobile-practice/);
  assert.match(client, /returnToInputOnMobile/);
  assert.match(client, /编辑内容/);
  assert.match(client, /scrollIntoView/);
  assert.match(client, /getNextCardIndex/);
  assert.match(client, /getPreviousCardIndex/);
  assert.match(client, /advanceActiveCard/);
  assert.match(client, /左滑或点右箭头表示认识/);
  assert.match(client, /type CardTextDensity = "normal" \| "dense" \| "compact"/);
  assert.match(client, /getCardTextDensity/);
  assert.match(client, /activeCardDensity/);
  assert.match(client, /memoryStats/);
  assert.match(client, /reviewQueue/);
  assert.match(client, /rateActiveCard/);
  assert.match(client, /rating === "remembered" && currentMemory\.remembered >= 2/);
  assert.match(client, /return queueWithoutCurrent;/);
  assert.match(client, /isSessionComplete/);
  assert.match(client, /hasCompletedCheckRound/);
  assert.match(client, /BINGO/);
  assert.match(client, /这组单词通关了/);
  assert.match(client, /再复习一轮/);
  assert.match(client, /再记一次/);
  assert.match(client, /认识就继续下一张/);
  assert.match(client, /右滑回看上一张/);
  assert.match(client, /Download/);
  assert.match(client, /Volume2/);
  assert.match(client, /Trophy/);
  assert.match(client, /导出词表/);
  assert.match(client, /downloadVocabularyList/);
  assert.match(client, /buildVocabularyCsv/);
  assert.match(client, /单词\/短语,音标,中文释义,英文例句,例句中文,来源,难度/);
  assert.match(client, /text\/csv;charset=utf-8/);
  assert.match(client, /URL\.createObjectURL/);
  assert.match(client, /playActiveCardPronunciation/);
  assert.match(client, /\/api\/tools\/study-cards\/pronunciation/);
  assert.match(client, /audioObjectUrlCacheRef/);
  assert.match(client, /fallbackToBrowserPronunciation/);
  assert.match(client, /new Audio/);
  assert.match(client, /response\.blob\(\)/);
  assert.match(client, /audio\.play\(\)/);
  assert.match(client, /renderHighlightedExample/);
  assert.match(client, /escapeRegExp/);
  assert.match(client, /study-cards-example-highlight/);
  assert.match(client, /speechSynthesis/);
  assert.match(client, /SpeechSynthesisUtterance/);
  assert.match(client, /HIGH_QUALITY_ENGLISH_VOICE_HINTS/);
  assert.match(client, /getPreferredEnglishVoice/);
  assert.match(client, /voiceschanged/);
  assert.match(client, /utterance\.voice = preferredVoice/);
  assert.match(client, /utterance\.rate = 0\.82/);
  assert.match(client, /utterance\.pitch = 1\.02/);
  assert.match(client, /朗读单词/);
  assert.match(client, /study-cards-speak-label/);
  assert.doesNotMatch(client, /compactText\(activeCard\.source,\s*160\)/);
  assert.match(client, /study-cards-example-line/);
  assert.match(client, /deep work/);
  assert.match(client, /analytical weight/);
  assert.match(client, /study-cards-example-translation/);
  assert.match(client, /formatCardBack/);
  assert.match(client, /compactText\(activeCard\.word,\s*48\)/);
  assert.match(client, /compactText\(activeCard\.translation,\s*120\)/);
  assert.doesNotMatch(client, /compactText\(activeCard\.example,\s*180\)/);
  assert.match(client, /正在补充中文释义/);
  assert.doesNotMatch(client, /AI 学习卡片生成器/);
  assert.doesNotMatch(client, /输入知识内容/);
  assert.doesNotMatch(client, /生成学习卡片/);
  assert.doesNotMatch(client, /问答卡片/);
  assert.doesNotMatch(client, /参考答案/);
  assert.doesNotMatch(client, /不熟练/);
  assert.doesNotMatch(client, /记住了/);
  assert.doesNotMatch(client, /study-cards-practice-actions/);
  assert.doesNotMatch(client, /复制 Anki TSV/);
  assert.match(styles, /\.study-cards-deck::before/);
  assert.match(styles, /\.study-cards-deck::after/);
  assert.match(styles, /\.study-cards-card-stage/);
  assert.match(styles, /\.study-cards-practice-card/);
  assert.match(styles, /\.study-cards-answer-panel/);
  assert.match(styles, /\.study-cards-memory-actions/);
  assert.match(styles, /\.study-cards-empty-word-row/);
  assert.match(styles, /\.study-cards-empty-speak/);
  assert.match(styles, /\.study-cards-empty-speak-label/);
  assert.match(styles, /\.study-cards-empty-example/);
  assert.match(styles, /\.study-cards-result-actions/);
  assert.match(styles, /\.study-cards-speak-button/);
  assert.match(styles, /\.study-cards-speak-label/);
  assert.match(styles, /\.study-cards-bingo/);
  assert.match(styles, /\.study-cards-example-line/);
  assert.match(styles, /\.study-cards-example-highlight/);
  assert.match(styles, /\.study-cards-example-translation/);
  assert.match(styles, /aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(styles, /cursor: grab/);
  assert.match(styles, /\.study-cards-page\.is-mobile-practice/);
  assert.match(styles, /@keyframes study-cards-card-exit-next/);
  assert.match(styles, /@keyframes study-cards-answer-reveal/);

  const sampleCards = Array.from(
    client.matchAll(/word: "([^"]+)",\s+phonetic: "([^"]*)",\s+translation: "([^"]+)",\s+example: "([^"]+)",\s+exampleTranslation: "([^"]+)",\s+source: "([^"]+)",\s+level: "([^"]+)"/g),
    ([, word, phonetic, translation, example, exampleTranslation, source, level]) => ({
      word,
      phonetic,
      translation,
      example,
      exampleTranslation,
      source,
      level,
    }),
  );
  assert.equal(sampleCards.length, 10);
  for (const card of sampleCards) {
    assert.match(card.word, /^[A-Za-z][A-Za-z' -]*$/);
    assert.ok(card.phonetic.length > 0, `sample phonetic is missing: ${card.word}`);
    assert.ok(card.translation.length <= 80, `sample translation is too long: ${card.translation}`);
    assert.ok(card.example.length <= 180, `sample example is too long: ${card.example}`);
    assert.ok(card.exampleTranslation.length <= 120, `sample example translation is too long: ${card.exampleTranslation}`);
    assert.ok(card.source.length <= 180, `sample source is too long: ${card.source}`);
    assert.match(card.level, /CET-6|雅思|托福|GRE|学术|高阶/);
  }
});

test("AI vocabulary card endpoint asks for article extraction and word-list enrichment", async () => {
  const route = await readProjectFile("src/app/api/tools/study-cards/route.ts");

  assert.match(route, /cards/);
  assert.match(route, /JSON/);
  assert.match(route, /getChatProviders/);
  assert.match(route, /if \(!Number\.isFinite\(numberValue\)\) return 10/);
  assert.doesNotMatch(route, /CHAT_API_KEY/);
  assert.doesNotMatch(route, /CHAT_API_URL/);
  assert.doesNotMatch(route, /gpt-5\.2/);
  assert.doesNotMatch(route, /gpt-5\.4/);
  assert.doesNotMatch(route, /884819/);
  assert.match(route, /response_format/);
  assert.match(route, /60000/);
  assert.match(route, /errorCode/);
  assert.match(route, /API_NOT_CONFIGURED/);
  assert.match(route, /英文单词或短语卡/);
  assert.match(route, /英文单词或短语卡/);
  assert.match(route, /逐行单词模式/);
  assert.match(route, /英文文章模式/);
  assert.match(route, /挑选难度最高且值得记忆的单词或短语/);
  assert.match(route, /不要选择专有名词、数字、缩写、过于常见的基础词/);
  assert.match(route, /word/);
  assert.match(route, /phonetic/);
  assert.match(route, /translation/);
  assert.match(route, /example/);
  assert.match(route, /exampleTranslation/);
  assert.match(route, /source/);
  assert.match(route, /level/);
  assert.match(route, /中文释义/);
  assert.match(route, /英文例句/);
  assert.match(route, /例句中文翻译/);
  assert.match(route, /如果用户每行基本是一个英文单词/);
  assert.match(route, /保留用户给出的单词/);
  assert.match(route, /如果用户输入的是英文文章/);
  assert.match(route, /只从原文中出现过的单词或短语里选择/);
  assert.match(route, /高价值短语/);
  assert.match(route, /2 到 4 个英文词/);
  assert.match(route, /type StudyCardMode = "article" \| "word-list"/);
  assert.match(route, /expectedMode: StudyCardMode/);
  assert.match(route, /mode: expectedMode/);
  assert.match(route, /const expectedMode = isLikelyWordList\(content\) \? "word-list" : "article"/);
  assert.match(route, /normalizeStudyCardResult\(parsed, cardCount, expectedMode\)/);
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /问答闪卡/);
  assert.doesNotMatch(route, /概念之间的关系/);
  assert.doesNotMatch(route, /因果链/);
  assert.doesNotMatch(route, /front 可以是一句具体问题/);
});

test("AI vocabulary card pronunciation uses server-side high quality audio first", async () => {
  const client = await readProjectFile("src/app/tools/study-cards/StudyCardsTool.tsx");
  const route = await readProjectFile("src/app/api/tools/study-cards/pronunciation/route.ts");
  const providers = await readProjectFile("src/lib/ai/providers.ts");

  assert.match(providers, /type SpeechProvider/);
  assert.match(providers, /AI_PRIMARY_TTS_MODEL/);
  assert.match(providers, /AI_PRIMARY_TTS_VOICE/);
  assert.match(providers, /normalizeSpeechUrl/);
  assert.match(providers, /getSpeechProvider/);
  assert.match(providers, /\/v1\/audio\/speech/);

  assert.match(route, /getSpeechProvider/);
  assert.match(route, /PUBLIC_STUDY_CARDS_PRONUNCIATION_API_URL/);
  assert.match(route, /export async function POST/);
  assert.match(route, /sanitizePronunciationInput/);
  assert.match(route, /DICTIONARY_API_URL/);
  assert.match(route, /fetchDictionaryPronunciation/);
  assert.match(route, /selectDictionaryAudio/);
  assert.match(route, /WIKIMEDIA_COMMONS_API_URL/);
  assert.match(route, /fetchWikimediaCommonsPronunciation/);
  assert.match(route, /selectWikimediaAudio/);
  assert.match(route, /En-us-/);
  assert.match(route, /LL-Q1860/);
  assert.match(route, /Content-Type":\s*contentType/);
  assert.match(route, /api\.dictionaryapi\.dev/);
  assert.match(route, /media\/pronunciations/);
  assert.match(route, /callSpeechProviderWithFallbackModels/);
  assert.match(route, /TTS_FALLBACK_MODELS/);
  assert.match(route, /response_format:\s*"mp3"/);
  assert.match(route, /Accept:\s*"audio\/\*"/);
  assert.match(route, /"Content-Type":\s*contentType/);
  assert.match(route, /errorCode:\s*"TTS_NOT_CONFIGURED"/);
  assert.match(route, /errorCode:\s*"TTS_UPSTREAM_FAILED"/);
  assert.doesNotMatch(route, /CHAT_API_KEY/);
  assert.doesNotMatch(route, /CHAT_API_URL/);

  assert.match(client, /\/api\/tools\/study-cards\/pronunciation/);
  assert.match(client, /audioObjectUrlCacheRef/);
  assert.match(client, /currentPronunciationAudioRef/);
  assert.match(client, /playServerPronunciation/);
  assert.match(client, /fallbackToBrowserPronunciation/);
  assert.match(client, /response\.blob\(\)/);
  assert.match(client, /new Audio\(audioUrl\)/);
  assert.match(client, /audio\.play\(\)/);
});
