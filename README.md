# UnrealFabAssistant

把所有虚幻Fab商城免费资产一键入库

>Note: 代码仅在chrome上测试通过，最好直接使用chrome

### 源码改动要点
直接高速并发上百、上千请求，非常容易触发服务器的反爬虫或 API 限流（返回 429 或断开连接），并提示 "Too many requests."的问题，这个分支增加了以下功能：
- 直接从 Unpkg、jsDelivr、Skypack 等 CDN 拉取 p-limit。
- 封装统一的带重试的 fetch 函数 retryFetch(url, options)：
- 捕获网络或响应码 ≥ 429 且 < 600，执行指数退避后重试。
- 给所有 API 调用都改为用 retryFetch，并在调用前后做 await sleep(...)。
- 引入并发控制：const limit = pLimit(5)，然后 limit(() => safeProcessUid(uid))。
  
这样就能把原先“火力全开”的并发请求，变成“有节奏”“自适应”的限流重试，既保证效率，也最大程度避免 429/5xx。

### 如何使用
1. 打开[run.js](/run.js)复制全部代码到剪切板
2. 打开 https://www.fab.com/ 并登录
4. 点击F12打开调试工具并切换到控制台（Console）tab
5. 粘贴刚才复制的代码到输入框，然后回车
6. 等待日志打印结束即完成入库

### 鸣谢
- https://gist.github.com/jamiephan/0c04986c7f2e62d5c87c4e8c8ce115fc
- https://github.com/RyensX/UnrealFabAssistant
  
### 其他
1. 若有帮助到您，请点击右上角⭐支持一下，感谢使用
1. 如果进行转载，请注明原出处 https://github.com/ismewang/UnrealFabAssistant
