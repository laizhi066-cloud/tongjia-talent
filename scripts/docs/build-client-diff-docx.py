from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

OUT = Path('docs/delivery/同佳天赋-客户差异确认单.docx')
MD = Path('docs/delivery/同佳天赋-客户差异确认单.md')

rows = [
    ('D-01','后台菜单结构','6 组 11 菜单，培养方向独立分组','工作台/会员管理为一级；培养方向管理并入「天赋规则」；系统管理/运行监控仅 superAdmin；业务可见 7 条','按现实现验收；如坚持 PRD 字面，需恢复分组并调整侧栏'),
    ('D-02','平台运营管理员权限','系统管理全量操作、全部菜单','系统管理、运行监控仅 superAdmin；平台运营无系统/监控','客户书面确认权限隔离；如运营需系统页，按最小权限单独授权'),
    ('D-03','系统管理页面集合','PRD 列 4 页','保留底座 9 页：用户/菜单/角色/部门/岗位/字典/参数/站点/微信；机构管理已删除','仅 superAdmin 可见；机构管理不再恢复'),
    ('D-04','C 端页面数','4 主栏 + 14 二级页','4 主栏 + 15 二级页（新增「关于/版本」；已选方向并入页签；注销不占页）','按现实现验收'),
    ('D-05','C 端手机号编辑','PRD 允许家长编辑','手机号只读；修改走后台/客服','默认只读；如需自助换绑，需增加短信验证（新增范围）'),
    ('D-06','PDF 下载粒度','整份 /reports/:id/download','按分册 volumes/:volumeId/pdf；不做打包下载','按分册验收；整份打包另立需求'),
    ('D-07','补发后建议','PRD §13.2-1 待定','按 4 个月周期等待下一版，不立即补新增册建议','客户确认是否接受延迟；如不接受，需改为补发即补建议'),
    ('D-08','报告撤回时建议状态','PRD §13.2-2 待定','建议行 publishStatus 不变；C 端按报告状态派生不可见；后台仍显示已发布','客户知晓派生口径'),
    ('D-09','复测 / 一人一份','PRD §13.2-3 待定','一人一份；复测多份不预留','客户确认；如需复测多份需新需求'),
    ('D-10','工作台第四卡','PRD §13.3 待定','待处理事项为纯汇总卡，不可点击','按纯汇总验收'),
    ('D-11','自定义方向归并入口','原型无入口','方向页 headerExtra「待归并方向 (N)」','确认入口位置与权限'),
    ('D-12','推荐上限 5 / 选择上限 3','PRD §13.3 待定','常量固定，不落库、不可配置','确认固定；如需可配需新需求'),
    ('D-13','建议周期','BR-07 默认 4 个月','固定 4 个月（TALENT_ADVICE_CYCLE_MONTHS），不建配置集合','确认固定；如需可配需新需求'),
    ('D-14','历史版本导出','PRD §13.3 待定','默认「跟随查看版本导出」','确认是否允许导出历史版本'),
    ('D-15','0 命中回退条数','BR-09 列全部 vs §7.7 最多 5','回退后受上限 5 截断','确认按 5 条；如需列全部只改读取层'),
    ('D-16','停用分级是否计分母','BR-08 未明确','要求项计入分母（未命中）','确认命中率口径'),
    ('D-17','别名参与命中','M4 §4.7','别名只用于归并，不参与自动命中','确认；如需参与命中需调整算法'),
    ('D-18','A–F ↔ V1–V6 映射','BR-04 固定映射','按 A–F 固定映射；适配层集中转换','客户书面确认外部编码确为 A–F'),
    ('D-19','PDF 水印手机尾号','PRD §10.4','默认含手机尾号 4 位，可通过配置关闭','确认隐私口径'),
    ('D-20','报告审核员发布权限','PRD §2','默认保留 report:publish / advice:publish','确认；如只读则撤授权'),
    ('D-21','customer-admin 角色名','—','roleKey 沿用，显示名「平台运营管理员」','确认技术标识与显示名差异'),
    ('D-22','系统管理「机构管理」','PRD 明确排除机构','已删除，侧栏无机构入口；M9 验收断言 0','确认无机构入口，不恢复'),
]

# Markdown
md = ['# 同佳天赋专项 · 客户差异确认单','', '> 项目：同佳天赋专项  ', '> 依据：PRD v1.1、交付规格/ADR、2026-11-17 内部验收结果  ', '> 用途：请客户逐项确认下列 PRD 与交付实现的差异；签字后作为验收与后续变更依据。','', '| 编号 | 差异项 | PRD / 原口径 | 当前实现 | 建议 / 可选 | 客户确认 | 备注 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in rows:
    md.append('| ' + ' | '.join(x.replace('|','\\|') for x in r) + ' | □同意 □调整 □否决 |  |')
md += ['', '## 客户确认', '', '- 上述差异项：□ 全部同意  □ 部分调整（请在备注列注明）  □ 否决（请另附说明）', '- 客户代表（签字）：____________________', '- 日期：____________________', '- 我方代表（签字）：____________________', '- 日期：____________________', '']
MD.write_text('\n'.join(md), encoding='utf-8')

doc = Document()
section = doc.sections[0]
section.orientation = WD_ORIENT.LANDSCAPE
section.page_width, section.page_height = section.page_height, section.page_width
section.top_margin = Cm(1.5); section.bottom_margin = Cm(1.5); section.left_margin = Cm(1.4); section.right_margin = Cm(1.4)

style = doc.styles['Normal']
style.font.name = '微软雅黑'; style.font.size = Pt(9)
style._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')

def set_cn(run, size=9, bold=False, color=None):
    run.font.name = '微软雅黑'; run._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    run.font.size = Pt(size); run.bold = bold
    if color: run.font.color.rgb = RGBColor(*color)

title = doc.add_paragraph(); title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_cn(title.add_run('同佳天赋专项 · 客户差异确认单'), 18, True, (0x1B,0x7E,0x2A))
sub = doc.add_paragraph(); sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_cn(sub.add_run('PRD v1.1 与交付实现的差异确认 · 验收依据'), 10, False, (0x6C,0x75,0x6A))
doc.add_paragraph()

info = doc.add_table(rows=2, cols=4); info.style = 'Table Grid'; info.alignment = WD_TABLE_ALIGNMENT.CENTER
info_data = [('项目','同佳天赋专项'),('版本','v1.1 / 2026-11-17'),('验收范围','后台管理 + C 端小程序/H5'),('差异项','22 项')]
for i,(k,v) in enumerate(info_data):
    cell = info.cell(i//2, (i%2)*2); set_cn(cell.paragraphs[0].add_run(k), 9, True)
    cell2 = info.cell(i//2, (i%2)*2+1); set_cn(cell2.paragraphs[0].add_run(v), 9)
doc.add_paragraph()

p = doc.add_paragraph(); set_cn(p.add_run('说明：'), 9, True)
set_cn(p.add_run('下表列出 PRD 与当前交付实现之间存在差异或需客户确认的 22 项。请逐项勾选确认、调整或否决；签字后作为验收与后续变更依据。未列事项以 PRD、规格/ADR 与内部验收证据为准。'), 9)
doc.add_paragraph()

table = doc.add_table(rows=1, cols=7); table.style = 'Table Grid'; table.alignment = WD_TABLE_ALIGNMENT.CENTER
headers = ['编号','差异项','PRD / 原口径','当前实现','建议 / 可选','客户确认','备注']
widths = [1.2, 3.0, 4.0, 6.0, 6.0, 3.4, 3.0]
for i,h in enumerate(headers):
    cell = table.rows[0].cells[i]; cell.width = Cm(widths[i])
    shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), 'E4EAE3'); cell._tc.get_or_add_tcPr().append(shd)
    set_cn(cell.paragraphs[0].add_run(h), 9, True)
for r in rows:
    cells = table.add_row().cells
    for i,val in enumerate(list(r) + ['□同意  □调整  □否决', '']):
        cells[i].width = Cm(widths[i])
        set_cn(cells[i].paragraphs[0].add_run(val), 8.5)
doc.add_paragraph()

p = doc.add_paragraph(); set_cn(p.add_run('客户确认：'), 10, True)
for line in ['上述差异项：□ 全部同意    □ 部分调整（请在备注列注明）    □ 否决（请另附说明）','','客户代表（签字）：______________________        日期：__________________','','我方代表（签字）：______________________        日期：__________________']:
    pp = doc.add_paragraph(); set_cn(pp.add_run(line), 10)

doc.save(OUT)
print('saved', OUT, 'rows', len(rows))
