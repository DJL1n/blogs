# Git 工作流程

本仓库约定：每次有实际变更后，立即提交。  
`push` 不再作为默认动作，只有在你明确要求时再执行。

## 约定分支
- 默认分支：`main`

## 标准流程
1. 查看变更
   - `git status`
   - `git diff`
2. 暂存
   - `git add .`
3. 提交（建议语义化）
   - `git commit -m "feat: add ..."`
   - `git commit -m "fix: ..."`
   - `git commit -m "docs: ..."`
4. 推送（按需）
   - `git push`

## 远端尚未配置时
- 先设置远端：`git remote add origin <你的 GitHub 仓库地址>`
- 首次推送：`git push -u origin main`
- 后续推送：`git push`

## 推荐执行频率
- 一次编辑/修复/新增内容后尽快提交（不要堆积到很大改动）
- 每个 commit 尽量只做一类主题的变更
