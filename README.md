# Life System / 生活系统

极简个人生活状态记录工具。

## 这版解决了什么

GitHub Actions 会自动：

1. 安装 Node.js
2. 安装 Capacitor
3. 创建 Android 工程
4. 同步 Web 页面
5. 构建 Android Debug APK
6. 将 APK 保存到 Actions Artifacts
7. 发布 GitHub Release 时自动把 APK 附加到 Release

## 上传方式

把本目录的全部内容上传到 GitHub 仓库，然后进入：

**Actions → Build Android APK**

第一次运行完成后，在运行记录底部：

**Artifacts → LifeSystem-APK**

下载 APK。

## 正式 Release

创建一个 GitHub Release，例如 `v0.1.1` 并发布。

Actions 会自动把 APK 附加到该 Release。

## 技术

- HTML
- CSS
- JavaScript
- Capacitor
- Android
- GitHub Actions

当前 APK 是 Debug 版本，适合个人安装测试。
