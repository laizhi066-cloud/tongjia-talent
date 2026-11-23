/**
 * @description 验证基础版初始化只操作空数据目录，并按真实索引名判重。
 * @file test/foundation-setup-safety.test.ts
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertEmptyMigrationsDirectory, assertFreshDataDirectory, indexNameFromSql } from '../scripts/setup.mjs'

describe('foundation setup safety', () => {
  it('仅接受新的空 PocketBase 数据目录，拒绝现有数据库文件', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'foundation-setup-test-'))
    try {
      expect(() => assertFreshDataDirectory(dataDir)).not.toThrow()
      writeFileSync(join(dataDir, 'data.db'), '')
      expect(() => assertFreshDataDirectory(dataDir)).toThrow('不会迁移、覆盖或清理现有数据')
    }
    finally {
      rmSync(dataDir, { recursive: true, force: true })
    }
  })

  it('按真实索引名判重，不会把任意 INDEX SQL 误判成已存在', () => {
    expect(indexNameFromSql('CREATE UNIQUE INDEX idx_roles_key ON roles (roleKey)')).toBe('idx_roles_key')
    expect(indexNameFromSql('CREATE INDEX "idx_other" ON roles (status)')).toBe('idx_other')
    expect(indexNameFromSql('CREATE INDEX idx_other ON roles (status)')).not.toBe('idx_roles_key')
  })

  it('迁移目录只允许为空，基础脚本不会删除用户指定的迁移文件', () => {
    for (const file of ['scripts/env.mjs', 'scripts/setup.mjs']) {
      const source = readFileSync(join(import.meta.dirname, '..', file), 'utf8')
      expect(source, `${file} 不应递归删除迁移目录`).not.toContain('rmSync(')
      expect(source, `${file} 应拒绝非空迁移目录`).toContain('迁移目录必须为空')
    }
  })

  it('允许仓库用 .gitkeep 保留空迁移目录，但拒绝真实迁移文件', () => {
    const migrationsDir = mkdtempSync(join(tmpdir(), 'foundation-migrations-test-'))
    try {
      writeFileSync(join(migrationsDir, '.gitkeep'), '')
      expect(() => assertEmptyMigrationsDirectory(migrationsDir)).not.toThrow()
      writeFileSync(join(migrationsDir, '1700000000_created_users.js'), '// migration')
      expect(() => assertEmptyMigrationsDirectory(migrationsDir)).toThrow('迁移目录必须为空')
    }
    finally {
      rmSync(migrationsDir, { recursive: true, force: true })
    }
  })
})
