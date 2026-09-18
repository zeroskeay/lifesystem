# 生活系统 Life System

极简个人生活系统：稳 · 活 · 进 · 选。

## 功能

- 单页面记录：睡眠、身体、主要任务、主动生活、娱乐
- 0–10 今日体验评分
- 一句话记录
- 最近 7 天趋势与基础统计
- 本地 localStorage 数据，不需要账号
- 自动检查 GitHub Release 最新版本
- 发现新版本后进入 Release 下载 APK
- Android 应用图标与自适应图标
- 每次推送到 `main` 自动构建 APK 并发布到 GitHub Releases

## 使用

把整个项目上传到 GitHub 仓库，推送到 `main`。

GitHub Actions 会：

1. 安装 Node / Java / Android SDK
2. 创建 Capacitor Android 项目
3. 写入应用图标
4. 构建 APK
5. 自动创建或更新 `v<package.json version>` Release
6. 将 APK 放进 Release 的 Assets

## 发布新版本

修改 `package.json`：

```json
"version": "0.3.1"
```

然后 push 到 `main`，GitHub 会自动生成：

`Life System v0.3.1`

并附上：

`LifeSystem-0.3.1.apk`

应用内的版本检查会自动读取当前 GitHub 仓库的最新 Release。

## 注意

当前“升级”采用安全的基础方案：应用发现新版本后，打开 GitHub Release 页面让用户下载 APK。不会在后台静默安装 APK，也不会要求账号或服务器。
