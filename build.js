const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');
const config = require('./_config.yml');

// ====================== 全局统一配置 ======================
const SITE_TITLE = config.site.title;
const SITE_AUTHOR = config.site.author;
const SITE_URL = config.site.url;
const RSS_LIMIT = config.site.rss_limit;
const RANDOM_COVER = config.site.random_cover_api;

// 导航菜单
const navItems = [
  { label: '首页', href: './index.html' },
  { label: '说说', href: './talk.html' },
  { label: '关于', href: './page.html' },
  { label: 'RSS', href: './feed.xml' }
];
let navHtml = '';
navItems.forEach(item => {
  navHtml += `<a href="${item.href}">${item.label}</a>`;
});

// 输出目录
const DIST = './dist';
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 复制静态资源
fs.cpSync('./css', path.join(DIST, 'css'), { recursive: true });

// 读取模板
const tplIndex = fs.readFileSync('./index.html', 'utf8');
const tplPost = fs.readFileSync('./post.html', 'utf8');
const tplTalk = fs.readFileSync('./talk.html', 'utf8');
const tplPage = fs.readFileSync('./page.html', 'utf8');

// ====================== 解析文章 ======================
const postSourceDir = './source/posts';
const postFiles = fs.readdirSync(postSourceDir).filter(f => f.endsWith('.md'));
let posts = [];

postFiles.forEach(file => {
  const raw = fs.readFileSync(path.join(postSourceDir, file), 'utf8');
  const { data, content } = matter(raw);
  const fileId = file.replace('.md', '');
  posts.push({
    id: fileId,
    title: data.title || '无标题',
    date: data.date,
    cover: data.cover || RANDOM_COVER,
    html: marked.parse(content),
    excerpt: marked.parse(content).replace(/<[^>]+>/g, '').slice(0, 100)
  });
});

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// ====================== 解析说说 ======================
const talkSourceDir = './source/talks';
const talkFiles = fs.readdirSync(talkSourceDir).filter(f => f.endsWith('.md'));
let talks = [];

talkFiles.forEach(file => {
  const raw = fs.readFileSync(path.join(talkSourceDir, file), 'utf8');
  const { data, content } = matter(raw);
  talks.push({
    time: data.date,
    html: marked.parse(content)
  });
});

talks.sort((a, b) => new Date(b.time) - new Date(a.time));

// ====================== 1. 首页 index.html ======================
let indexListHtml = '';
posts.forEach(p => {
  indexListHtml += `
<div class="post-card">
  <img class="post-big-img" src="${p.cover}" alt="${p.title}">
  <h2 class="post-title"><a href="posts/${p.id}.html">${p.title}</a></h2>
  <div class="meta">${p.date}</div>
  <div>${p.excerpt}……</div>
</div>
`;
});

let finalIndex = tplIndex
  .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
  .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
  .replace('<!--NAV_LINKS-->', navHtml)
  .replace('<!--REPLACE_POST_LIST-->', indexListHtml);

fs.writeFileSync(path.join(DIST, 'index.html'), finalIndex, 'utf8');

// ====================== 2. 单篇文章静态页 ======================
const postOutDir = path.join(DIST, 'posts');
fs.mkdirSync(postOutDir, { recursive: true });

posts.forEach(p => {
  let articleBlock = `
<img class="post-big-img" src="${p.cover}">
<h1>${p.title}</h1>
<div class="meta">发布于 ${p.date}</div>
<div style="margin-top:2rem;">${p.html}</div>
`;

  let singlePostPage = tplPost
    .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
    .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
    .replace(/<!--ARTICLE_TITLE-->/g, p.title)
    .replace('<!--NAV_LINKS-->', navHtml)
    .replace('<!--REPLACE_ARTICLE_CONTENT-->', articleBlock);

  fs.writeFileSync(path.join(postOutDir, `${p.id}.html`), singlePostPage, 'utf8');
});

// ====================== 3. 说说 talk.html ======================
let talkListHtml = '';
talks.forEach(t => {
  talkListHtml += `
<div class="talk-item">
  <div class="meta">${t.time}</div>
  <div>${t.html}</div>
</div>
`;
});

let finalTalk = tplTalk
  .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
  .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
  .replace('<!--NAV_LINKS-->', navHtml)
  .replace('<!--REPLACE_TALK_LIST-->', talkListHtml);

fs.writeFileSync(path.join(DIST, 'talk.html'), finalTalk, 'utf8');

// ====================== 4. page.html ======================
let finalPage = tplPage
  .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
  .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
  .replace('<!--NAV_LINKS-->', navHtml);

fs.writeFileSync(path.join(DIST, 'page.html'), finalPage, 'utf8');

// ====================== 5. RSS ======================
let rssXml = `<rss version="2.0">
<channel>
<title>${SITE_TITLE}</title>
<link>${SITE_URL}</link>
<description>${config.site.description}</description>
`;

posts.slice(0, RSS_LIMIT).forEach(p => {
  rssXml += `
<item>
<title>${p.title}</title>
<link>${SITE_URL}/posts/${p.id}.html</link>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<description>${p.excerpt}</description>
</item>
`;
});

rssXml += `</channel></rss>`;
fs.writeFileSync(path.join(DIST, 'feed.xml'), rssXml, 'utf8');

console.log('✅ 全站静态页面构建完成，输出目录：dist');
posts.forEach(p => {
  let articleBlock = `
<img class="post-big-img" src="${p.cover}">
<h1>${p.title}</h1>
<div class="meta">发布于 ${p.date}</div>
<div style="margin-top:2rem;">${p.html}</div>
`;

  let singlePostPage = tplPost
    .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
    .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
    .replace(/<!--ARTICLE_TITLE-->/g, p.title)
    .replace('<!--NAV_LINKS-->', navHtml)
    .replace('<!--REPLACE_ARTICLE_CONTENT-->', articleBlock);

  fs.writeFileSync(path.join(postOutDir, `${p.id}.html`), singlePostPage, 'utf8');
});

// ====================== 3. 渲染说说 talk.html ======================
let talkListHtml = '';
talks.forEach(t => {
  talkListHtml += `
<div class="talk-item">
  <div class="meta">${t.time}</div>
  <div>${t.html}</div>
</div>
`;
});

let finalTalk = tplTalk
  .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
  .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
  .replace('<!--NAV_LINKS-->', navHtml)
  .replace('<!--REPLACE_TALK_LIST-->', talkListHtml);

fs.writeFileSync(path.join(DIST, 'talk.html'), finalTalk, 'utf8');

// ====================== 4. 渲染通用页面 page.html ======================
let finalPage = tplPage
  .replace(/<!--SITE_TITLE-->/g, SITE_TITLE)
  .replace(/<!--SITE_AUTHOR-->/g, SITE_AUTHOR)
  .replace('<!--NAV_LINKS-->', navHtml);

fs.writeFileSync(path.join(DIST, 'page.html'), finalPage, 'utf8');

// ====================== 5. 生成 RSS feed.xml ======================
let rssXml = `<rss version="2.0">
<channel>
<title>${SITE_TITLE}</title>
<link>${SITE_URL}</link>
<description>${config.site.description}</description>
`;

posts.slice(0, RSS_LIMIT).forEach(p => {
  rssXml += `
<item>
<title>${p.title}</title>
<link>${SITE_URL}/posts/${p.id}.html</link>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<description>${p.excerpt}</description>
</item>
`;
});

rssXml += `</channel></rss>`;
fs.writeFileSync(path.join(DIST, 'feed.xml'), rssXml, 'utf8');

console.log('✅ 全站静态页面构建完成，输出目录：dist');
  });
});
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// 2. 解析说说
const talkDir = './source/talks';
const talkFiles = fs.readdirSync(talkDir).filter(f => f.endsWith('.md'));
let talks = [];
talkFiles.forEach(file => {
  const raw = fs.readFileSync(path.join(talkDir, file), 'utf8');
  const { data, content } = matter(raw);
  talks.push({
    time: data.date,
    html: marked.parse(content)
  });
});
talks.sort((a, b) => new Date(b.time) - new Date(a.time));

// ========== 渲染首页 index.html（直接生成成品，不再前端拉接口）
let indexListHtml = '';
posts.forEach(p => {
  indexListHtml += `
<div class="post-card">
  <img class="post-big-img" src="${p.cover}" alt="${p.title}">
  <h2 class="post-title"><a href="posts/${p.id}.html">${p.title}</a></h2>
  <div class="meta">${p.date}</div>
  <div>${p.excerpt}……</div>
</div>
`;
});
const finalIndex = tplIndex.replace('<!--REPLACE_POST_LIST-->', indexListHtml);
fs.writeFileSync(path.join(DIST, 'index.html'), finalIndex, 'utf8');

// ========== 批量渲染每一篇独立文章静态页 posts/xxx.html
const postOutDir = path.join(DIST, 'posts');
fs.mkdirSync(postOutDir, { recursive: true });
posts.forEach(p => {
  let articleHtml = `
<img class="post-big-img" src="${p.cover}">
<h1>${p.title}</h1>
<div class="meta">发布于 ${p.date}</div>
<div style="margin-top:2rem;">${p.html}</div>
`;
  const pageContent = tplPost.replace('<!--REPLACE_ARTICLE_CONTENT-->', articleHtml);
  fs.writeFileSync(path.join(postOutDir, `${p.id}.html`), pageContent, 'utf8');
});

// ========== 渲染说说页面 talk.html
let talkListHtml = '';
talks.forEach(t => {
  talkListHtml += `
<div class="talk-item">
  <div class="meta">${t.time}</div>
  <div>${t.html}</div>
</div>
`;
});
const finalTalk = tplTalk.replace('<!--REPLACE_TALK_LIST-->', talkListHtml);
fs.writeFileSync(path.join(DIST, 'talk.html'), finalTalk, 'utf8');

// ========== 渲染通用页面 page.html
fs.writeFileSync(path.join(DIST, 'page.html'), tplPage, 'utf8');

// ========== 生成 RSS feed.xml
let rss = `<rss version="2.0">
<channel>
<title>${config.site.title}</title>
<link>${config.site.url}</link>
<description>${config.site.description}</description>
`;
posts.slice(0, config.site.rss_limit).forEach(p => {
  rss += `
<item>
<title>${p.title}</title>
<link>${config.site.url}/posts/${p.id}.html</link>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<description>${p.excerpt}</description>
</item>
`;
});
rss += `</channel></rss>`;
fs.writeFileSync(path.join(DIST, 'feed.xml'), rss, 'utf8');

console.log('✅ 全部静态页面构建完成，输出至 dist/');
