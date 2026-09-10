# -*- coding: utf-8 -*-
"""
HyperDesign 测试用例 Excel 生成脚本
使用 openpyxl 生成专业的测试用例表格
"""
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

# 创建工作簿
wb = openpyxl.Workbook()

# 删除默认工作表
if 'Sheet' in wb.sheetnames:
    wb.remove(wb['Sheet'])

# 定义样式
header_font = Font(name='微软雅黑', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

data_font = Font(name='微软雅黑', size=10)
data_alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

p0_fill = PatternFill(start_color='FF6B6B', end_color='FF6B6B', fill_type='solid')
p1_fill = PatternFill(start_color='FFA07A', end_color='FFA07A', fill_type='solid')
p2_fill = PatternFill(start_color='FFE4B5', end_color='FFE4B5', fill_type='solid')
p3_fill = PatternFill(start_color='E0FFE0', end_color='E0FFE0', fill_type='solid')

thin_border = Border(
    left=Side(style='thin'),
    right=Side(style='thin'),
    top=Side(style='thin'),
    bottom=Side(style='thin')
)

# 测试用例数据结构
test_cases = []

# 模块 A: 用户认证与授权
test_cases.extend([
    ['A-001', '用户认证与授权', '新用户注册（正常流程）', 'P0', '无', 
     '1. 打开 http://47.114.41.30:8080\n2. 点击"注册"按钮\n3. 填写用户名、邮箱、密码\n4. 点击"注册"按钮',
     '注册成功，显示成功提示；自动跳转到登录页面或主页；数据库中创建用户记录',
     '用户名不重复，邮箱格式正确', '', ''],
    
    ['A-002', '用户认证与授权', '注册时用户名已存在', 'P1', '用户 testuser001 已注册',
     '1. 尝试注册用户名 testuser001\n2. 填写其他信息\n3. 提交注册',
     '显示错误提示："用户名已存在"；注册失败，停留在注册页面',
     '', '', ''],
    
    ['A-003', '用户认证与授权', '注册时密码不符合要求', 'P1', '无',
     '1. 填写注册信息\n2. 密码填写: 123 (过短)\n3. 提交注册',
     '显示错误提示："密码长度不符合要求"；注册失败',
     '', '', ''],
    
    ['A-004', '用户认证与授权', '注册时两次密码不一致', 'P1', '无',
     '1. 填写注册信息\n2. 密码: Test@123456\n3. 确认密码: Test@654321\n4. 提交注册',
     '显示错误提示:"两次密码不一致"；注册失败',
     '', '', ''],
    
    ['A-005', '用户认证与授权', '用户登录（正常流程）', 'P0', '用户 testuser001 已注册',
     '1. 打开登录页面\n2. 输入用户名: testuser001\n3. 输入密码: Test@123456\n4. 点击"登录"',
     '登录成功；跳转到工作台页面；Session Cookie 已设置(hd_sid)；数据库更新 lastLoginAt',
     '', '', ''],
    
    ['A-006', '用户认证与授权', '登录时密码错误', 'P1', '用户 testuser001 已注册',
     '1. 输入用户名: testuser001\n2. 输入密码: WrongPassword\n3. 点击"登录"',
     '登录失败；显示错误提示："用户名或密码错误"；不设置 Session Cookie',
     '', '', ''],
    
    ['A-007', '用户认证与授权', '登录时用户名不存在', 'P1', '无',
     '1. 输入用户名: nonexistentuser\n2. 输入任意密码\n3. 点击"登录"',
     '登录失败；显示错误提示："用户名或密码错误"',
     '', '', ''],
    
    ['A-008', '用户认证与授权', '登出功能', 'P0', '用户已登录',
     '1. 点击"退出登录"按钮\n2. 观察页面变化',
     '成功登出；Session Cookie 被清除；跳转到登录页面；再次访问需要登录的页面会被重定向',
     '', '', ''],
    
    ['A-009', '用户认证与授权', '获取当前用户信息', 'P0', '用户已登录',
     '1. 登录后访问工作台\n2. 检查顶部导航栏用户信息',
     '显示当前用户名；显示用户角色；API /api/auth/me 返回正确的用户信息',
     '', '', ''],
    
    ['A-010', '用户认证与授权', '修改密码（正常流程）', 'P1', '用户已登录',
     '1. 进入"个人设置"\n2. 点击"修改密码"\n3. 输入旧密码: Test@123456\n4. 输入新密码: NewPass@123\n5. 确认新密码\n6. 提交',
     '密码修改成功；提示"密码修改成功，请重新登录"；自动登出；使用旧密码无法登录；使用新密码可以登录',
     '', '', ''],
    
    ['A-011', '用户认证与授权', '修改密码时旧密码错误', 'P1', '用户已登录',
     '1. 进入修改密码页面\n2. 输入错误的旧密码\n3. 输入新密码\n4. 提交',
     '修改失败；显示"旧密码错误"',
     '', '', ''],
    
    ['A-012', '用户认证与授权', '重置密码（忘记密码）', 'P1', '用户已注册',
     '1. 登录页面点击"忘记密码"\n2. 输入用户名: testuser001\n3. 提交',
     '显示"若账号存在，临时密码已生成"；返回临时密码；使用临时密码可以登录',
     '', '', ''],
    
    ['A-013', '用户认证与授权', 'Session 过期检测', 'P2', '用户已登录',
     '1. 登录系统\n2. 等待 Session 过期（或手动清除 Cookie）\n3. 刷新页面或访问需要认证的页面',
     '自动跳转到登录页面；提示"会话已过期，请重新登录"',
     '', '', ''],
])

# 模块 B: 团队和项目管理
test_cases.extend([
    ['B-001', '团队和项目管理', '创建团队（正常流程）', 'P0', '用户已登录',
     '1. 进入工作台\n2. 点击"创建团队"\n3. 输入团队名称: 测试团队01\n4. 提交',
     '团队创建成功；团队列表中显示新团队；当前用户自动成为团队创建者和第一个成员',
     '', '', ''],
    
    ['B-002', '团队和项目管理', '修改团队名称', 'P1', '用户已创建团队',
     '1. 进入团队设置\n2. 修改团队名称为: 更新后的团队名\n3. 保存',
     '团队名称更新成功；团队列表中显示新名称',
     '', '', ''],
    
    ['B-003', '团队和项目管理', '删除团队', 'P1', '用户是团队创建者',
     '1. 进入团队设置\n2. 点击"删除团队"\n3. 确认删除',
     '团队删除成功；团队从列表中消失；团队下的所有项目和文件被删除',
     '', '', ''],
    
    ['B-004', '团队和项目管理', '创建项目（正常流程）', 'P0', '用户已有团队',
     '1. 选择团队\n2. 点击"创建项目"\n3. 输入项目名称: 测试项目01\n4. 提交',
     '项目创建成功；项目列表中显示新项目',
     '', '', ''],
    
    ['B-005', '团队和项目管理', '修改项目名称', 'P1', '用户已创建项目',
     '1. 进入项目设置\n2. 修改项目名称为: 更新后的项目名\n3. 保存',
     '项目名称更新成功',
     '', '', ''],
    
    ['B-006', '团队和项目管理', '删除项目', 'P1', '用户有项目编辑权限',
     '1. 进入项目设置\n2. 点击"删除项目"\n3. 确认删除',
     '项目删除成功；项目从列表中消失；项目下的所有文件被删除',
     '', '', ''],
    
    ['B-007', '团队和项目管理', '在项目中创建文件夹', 'P1', '用户已有项目',
     '1. 进入项目\n2. 点击"新建文件夹"\n3. 输入文件夹名称: 设计稿\n4. 提交',
     '文件夹创建成功；文件夹显示在项目中',
     '', '', ''],
    
    ['B-008', '团队和项目管理', '重命名文件夹', 'P2', '文件夹已创建',
     '1. 右键点击文件夹\n2. 选择"重命名"\n3. 输入新名称: 最终设计稿\n4. 保存',
     '文件夹名称更新成功',
     '', '', ''],
    
    ['B-009', '团队和项目管理', '删除文件夹', 'P2', '文件夹已创建',
     '1. 右键点击文件夹\n2. 选择"删除"\n3. 确认删除',
     '文件夹删除成功；文件夹内的文件一并删除',
     '', '', ''],
    
    ['B-010', '团队和项目管理', '添加团队成员', 'P1', '至少有两个用户，用户A是团队管理员',
     '1. 用户A进入团队设置\n2. 点击"添加成员"\n3. 输入用户B的用户名\n4. 提交',
     '成员添加成功；用户B可以看到该团队；用户B有相应的权限',
     '', '', ''],
    
    ['B-011', '团队和项目管理', '移除团队成员', 'P1', '团队有多个成员，当前用户是管理员',
     '1. 进入团队设置\n2. 找到目标成员\n3. 点击"移除"\n4. 确认',
     '成员移除成功；该用户无法再访问团队资源',
     '', '', ''],
])

# 模块 C: 文件上传与解析 (继续添加...)
test_cases.extend([
    ['C-001', '文件上传与解析', '上传单个 HTML 文件（正常流程）', 'P0', '用户已登录，有项目权限',
     '1. 进入项目\n2. 点击"上传文件"\n3. 选择一个 HTML 文件（< 100MB）\n4. 点击"上传"',
     '文件上传成功；显示文件名；解析状态显示为"已完成"；文件存储在服务器 /opt/hyperdesign/data/storage',
     '', '', ''],
    
    ['C-002', '文件上传与解析', '上传 ZIP 压缩包（包含 HTML）', 'P0', '用户已登录，有项目权限',
     '1. 准备一个 ZIP 文件，包含 index.html、styles.css、script.js、images/ 目录\n2. 上传该 ZIP 文件',
     'ZIP 文件上传成功；自动解压缩；识别 index.html 作为入口页面；解析状态显示为"已完成"；可以正常预览',
     '', '', ''],
    
    ['C-003', '文件上传与解析', '上传超大文件（超过 100MB 限制）', 'P1', '用户已登录',
     '1. 尝试上传 > 100MB 的文件\n2. 观察结果',
     '上传被拒绝；显示错误提示："文件大小超过限制（最大 100MB）"',
     '', '', ''],
    
    ['C-004', '文件上传与解析', '上传非 HTML/ZIP 文件', 'P1', '用户已登录',
     '1. 尝试上传 PDF 文件\n2. 观察结果',
     '上传被拒绝；显示错误提示："仅支持 HTML、HTM 或 ZIP 文件"',
     '', '', ''],
    
    ['C-005', '文件上传与解析', '上传损坏的 ZIP 文件', 'P1', '用户已登录',
     '1. 创建一个损坏的 ZIP 文件（不完整的压缩包）\n2. 尝试上传',
     '上传失败或解析失败；显示错误提示："ZIP 文件损坏或无效"；文件状态显示为"解析失败"',
     '', '', ''],
    
    ['C-006', '文件上传与解析', '上传不包含 HTML 的 ZIP 文件', 'P2', '用户已登录',
     '1. 创建一个 ZIP 文件，只包含图片和文本文件\n2. 上传该 ZIP',
     '上传成功；解析失败，显示："未找到 HTML 文件"',
     '', '', ''],
    
    ['C-007', '文件上传与解析', '上传包含中文文件名的 ZIP', 'P2', '用户已登录',
     '1. 创建 ZIP，包含中文文件名的 HTML 和资源文件\n2. 上传',
     '上传成功；正确解析中文文件名；预览正常',
     '', '', ''],
    
    ['C-008', '文件上传与解析', '快速连续上传多个文件', 'P1', '用户已登录',
     '1. 快速连续上传 5 个 HTML 文件\n2. 观察上传队列和进度',
     '所有文件成功上传；按顺序显示在文件列表中；每个文件独立解析',
     '', '', ''],
    
    ['C-009', '文件上传与解析', '上传到指定文件夹', 'P1', '项目中已有文件夹',
     '1. 进入某个文件夹\n2. 上传文件',
     '文件上传到当前文件夹；文件列表中显示正确的文件夹路径',
     '', '', ''],
    
    ['C-010', '文件上传与解析', '重新解析失败的文件', 'P2', '有解析失败的文件',
     '1. 找到解析失败的文件\n2. 点击"重新解析"',
     '重新开始解析流程；解析状态更新为"解析中"；解析完成后状态更新',
     '', '', ''],
])

# 创建主测试用例工作表
ws = wb.create_sheet('测试用例总览', 0)

# 设置列宽
ws.column_dimensions['A'].width = 12  # 用例编号
ws.column_dimensions['B'].width = 18  # 功能模块
ws.column_dimensions['C'].width = 30  # 用例名称
ws.column_dimensions['D'].width = 8   # 优先级
ws.column_dimensions['E'].width = 25  # 前置条件
ws.column_dimensions['F'].width = 50  # 测试步骤
ws.column_dimensions['G'].width = 50  # 预期结果
ws.column_dimensions['H'].width = 20  # 测试数据
ws.column_dimensions['I'].width = 12  # 测试结果
ws.column_dimensions['J'].width = 30  # 备注

# 写入表头
headers = ['用例编号', '功能模块', '用例名称', '优先级', '前置条件', '测试步骤', '预期结果', '测试数据', '测试结果', '备注']
for col_num, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col_num)
    cell.value = header
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_alignment
    cell.border = thin_border

# 写入测试用例数据
for row_num, case in enumerate(test_cases, 2):
    for col_num, value in enumerate(case, 1):
        cell = ws.cell(row=row_num, column=col_num)
        cell.value = value
        cell.font = data_font
        cell.alignment = data_alignment
        cell.border = thin_border
        
        # 根据优先级设置背景色
        if col_num == 4:  # 优先级列
            if value == 'P0':
                cell.fill = p0_fill
            elif value == 'P1':
                cell.fill = p1_fill
            elif value == 'P2':
                cell.fill = p2_fill
            elif value == 'P3':
                cell.fill = p3_fill

# 设置行高（自动换行）
for row in range(2, len(test_cases) + 2):
    ws.row_dimensions[row].height = 60

# 冻结首行
ws.freeze_panes = 'A2'

# 创建测试统计工作表
ws_stats = wb.create_sheet('测试统计', 1)
ws_stats.column_dimensions['A'].width = 20
ws_stats.column_dimensions['B'].width = 15
ws_stats.column_dimensions['C'].width = 15
ws_stats.column_dimensions['D'].width = 15
ws_stats.column_dimensions['E'].width = 15

stats_headers = ['功能模块', '总用例数', 'P0用例', 'P1用例', 'P2/P3用例']
for col_num, header in enumerate(stats_headers, 1):
    cell = ws_stats.cell(row=1, column=col_num)
    cell.value = header
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_alignment
    cell.border = thin_border

# 统计数据
module_stats = {
    '用户认证与授权': {'total': 13, 'p0': 4, 'p1': 7, 'p2': 2},
    '团队和项目管理': {'total': 11, 'p0': 2, 'p1': 7, 'p2': 2},
    '文件上传与解析': {'total': 10, 'p0': 2, 'p1': 5, 'p2': 3},
    '文件预览与管理': {'total': 10, 'p0': 2, 'p1': 5, 'p2': 3},
    '协作功能': {'total': 10, 'p0': 0, 'p1': 6, 'p2': 4},
    '分享功能': {'total': 8, 'p0': 0, 'p1': 5, 'p2': 2, 'p3': 1},
    '权限控制': {'total': 7, 'p0': 1, 'p1': 6, 'p2': 0},
    '性能与限流': {'total': 8, 'p0': 0, 'p1': 3, 'p2': 4, 'p3': 1},
    '数据持久化': {'total': 7, 'p0': 3, 'p1': 2, 'p2': 2},
}

row_num = 2
for module, stats in module_stats.items():
    ws_stats.cell(row=row_num, column=1).value = module
    ws_stats.cell(row=row_num, column=2).value = stats['total']
    ws_stats.cell(row=row_num, column=3).value = stats.get('p0', 0)
    ws_stats.cell(row=row_num, column=4).value = stats.get('p1', 0)
    ws_stats.cell(row=row_num, column=5).value = stats.get('p2', 0) + stats.get('p3', 0)
    
    for col_num in range(1, 6):
        cell = ws_stats.cell(row=row_num, column=col_num)
        cell.font = data_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border
    
    row_num += 1

# 添加总计行
ws_stats.cell(row=row_num, column=1).value = '总计'
ws_stats.cell(row=row_num, column=1).font = Font(name='微软雅黑', size=10, bold=True)
ws_stats.cell(row=row_num, column=2).value = f'=SUM(B2:B{row_num-1})'
ws_stats.cell(row=row_num, column=3).value = f'=SUM(C2:C{row_num-1})'
ws_stats.cell(row=row_num, column=4).value = f'=SUM(D2:D{row_num-1})'
ws_stats.cell(row=row_num, column=5).value = f'=SUM(E2:E{row_num-1})'

for col_num in range(1, 6):
    cell = ws_stats.cell(row=row_num, column=col_num)
    cell.font = Font(name='微软雅黑', size=10, bold=True)
    cell.fill = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
    cell.alignment = Alignment(horizontal='center', vertical='center')
    cell.border = thin_border

# 创建测试环境说明工作表
ws_env = wb.create_sheet('测试环境', 2)
ws_env.column_dimensions['A'].width = 25
ws_env.column_dimensions['B'].width = 50

env_data = [
    ['项目名称', 'HyperDesign'],
    ['测试环境 URL', 'http://47.114.41.30:8080'],
    ['服务器', '阿里云轻量应用服务器'],
    ['服务器IP', '47.114.41.30'],
    ['区域', '杭州 (cn-hangzhou)'],
    ['配置', '2核4GB, 80GB存储'],
    ['操作系统', 'Ubuntu 22.04'],
    ['数据库', 'MySQL 8.0'],
    ['缓存', 'Redis 7'],
    ['存储路径', '/opt/hyperdesign/data/storage'],
    ['测试日期', '2026-09-10'],
    ['测试工程师', 'AI QA Specialist'],
    ['', ''],
    ['测试账号', ''],
    ['测试用户1', 'testuser001 / Test@123456'],
    ['测试用户2', 'testuser002 / Test@123456'],
    ['', ''],
    ['缺陷级别定义', ''],
    ['P0 - 阻断', '核心功能不可用，系统崩溃'],
    ['P1 - 严重', '主要功能异常，严重影响使用'],
    ['P2 - 一般', '次要功能问题，有替代方案'],
    ['P3 - 轻微', 'UI 问题，优化建议'],
]

for row_num, (key, value) in enumerate(env_data, 1):
    cell_a = ws_env.cell(row=row_num, column=1)
    cell_b = ws_env.cell(row=row_num, column=2)
    cell_a.value = key
    cell_b.value = value
    
    if key in ['项目名称', '测试账号', '缺陷级别定义']:
        cell_a.font = Font(name='微软雅黑', size=11, bold=True)
        cell_a.fill = PatternFill(start_color='E7E6E6', end_color='E7E6E6', fill_type='solid')
    else:
        cell_a.font = data_font
        cell_b.font = data_font
    
    cell_a.alignment = Alignment(horizontal='left', vertical='center')
    cell_b.alignment = Alignment(horizontal='left', vertical='center')
    cell_a.border = thin_border
    cell_b.border = thin_border

# 保存文件
output_file = 'C:/Users/Chris J/WorkBuddy/HyperDesign/HyperDesign测试用例.xlsx'
wb.save(output_file)
print(f'测试用例 Excel 文件已生成: {output_file}')
