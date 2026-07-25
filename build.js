const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');
const config = require('./_config.yml');

// 输出目录
const DIST = './dist';
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 复制静态资源 css js
fs.cpSync('./css', path.join(DIST, 'css'), { recursive: true });
fs.cpSync('./js', path.join(DIST, 'js'), { recursive: true });

// 读取模板外壳
const tplIndex = fs.readFileSync('./index.html', 'utf8');
const tplPost = fs.readFileSync('./post.html', 'utf8');
const tplTalk = fs.readFileSync('./talk.html', 'utf8');
const tplPage = fs.readFileSync('./page.html', 'utf8');

// 1. 解析文章
const postDir = './source/posts';
const postFiles = fs.readdirSync(postDir).filter(f => f.endsWith('.md'));
let posts = [];
postFiles.forEach(file => {
  const raw = fs.readFileSync(path.join(postDir, file), 'utf8');
  const { data, content } = matter(raw);
  const id = file.replace('.md', '');
  posts.push({
    id,
    title: data.title || '无标题',
    date: data.date,
    cover: data.cover || config.site.random_cover_api,
    html: marked.parse(content),
    excerpt: marked.parse(content).replace(/<[^>]+>/g, '').slice(0, 100)
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
