// 获取URL参数
function getUrlParam(key) {
  const url = new URL(location.href);
  return url.searchParams.get(key);
}

// 加载文章列表
async function loadPosts() {
  const res = await fetch("./temp/posts.json");
  return await res.json();
}

// 加载说说列表
async function loadTalks() {
  const res = await fetch("./temp/talks.json");
  return await res.json();
}
