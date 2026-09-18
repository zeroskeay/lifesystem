# Life System / 生活系统

一个极简的个人生活状态记录工具。

核心：**稳 · 活 · 进 · 选**

## 当前功能

- 睡眠
- 身体
- 主要任务
- 主动生活
- 娱乐
- 今日体验 0–10
- 一句话记录
- 最近 7 天趋势
- 数据保存在设备本地

## 自动生成 Android APK

本项目已经配置 GitHub Actions。

### 第一次使用

1. 新建 GitHub 仓库，例如 `life-system`
2. 将本项目全部文件上传到仓库
3. 推送到 `main`
4. 打开 GitHub 仓库的 **Actions**
5. 等待 `Build Android APK` 完成
6. 打开对应运行记录
7. 在 **Artifacts** 下载 `LifeSystem-APK`

### 发布正式版本

创建 GitHub Release，例如：

`v0.1.0`

发布后，GitHub Actions 会自动构建 APK，并将 APK 附加到该 Release。

最终效果：

`Releases → v0.1.0 → LifeSystem-vX.apk`

## 注意

当前工作流生成的是 **debug APK**，适合个人测试和直接安装。

如果以后公开给更多人长期使用，可以再增加：
- release 签名
- 应用图标
- 版本号自动管理
- PWA
- 数据导出/导入
- 正式 Release APK
