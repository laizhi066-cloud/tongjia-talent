/**
 * @file 根目录提交信息校验配置。
 * @description 供 .husky/commit-msg 调用的 commitlint 自动发现配置；保持与 Conventional Commits 一致。
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
}
