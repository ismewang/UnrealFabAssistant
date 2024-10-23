# UnrealFabItemsAllAdd
把所有Fab Quixel全部重新入库

>Note: 代码仅在chrome上测试通过，最后直接使用chrome

### 如何使用
1. 打开[run.js]()复制全部代码到剪切板
2. 打开并登录 https://www.fab.com/
3. 点击F12打开调试工具并切换到控制台（Console）tab
4. 粘贴刚才复制的代码上去，然后回车
5. 等待日志打印结束即完成入库

### 已知问题
- 请求过多提示 "Too many requests."
    - 如果已经完成所有入库则无需理会
    - 如果没有，则等待几分钟，然后重试

### 鸣谢
- https://gist.github.com/jamiephan/0c04986c7f2e62d5c87c4e8c8ce115fc