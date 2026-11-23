import { escapeHtml, helpButton, scopeBanner, statusBadge, terminalHref } from './terminal-shared.js?v=talent-1.0.8'

const currentConsultationUser = (state, query = {}) => query.actor || state.terminalDemo?.consultation?.viewer || '陈医生'

const participantsFor = appointment => {
  if (Array.isArray(appointment?.participants)) return appointment.participants
  return String(appointment?.participants || appointment?.expert || '').split(/[，,、;；]/).map(item => item.trim()).filter(Boolean)
}

const appointmentFor = (state, id) => (state.resources?.['consultation-appointment'] || []).find(item => item.id === id)
const invitationFor = (state, id) => (state.resources?.['consultation-invitation'] || []).find(item => item.id === id)

function filteredAppointments(state, query) {
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const selectedStatus = query.status || '全部'
  const selectedDate = String(query.date || '').trim()
  const selectedInitiator = String(query.initiator || '').trim().toLowerCase()
  const currentUser = currentConsultationUser(state)
  const customerScope = query.scope === 'customer' && query.customerId
  return (state.resources?.['consultation-appointment'] || []).filter(record => {
    const mine = record.initiator === currentUser || participantsFor(record).includes(currentUser)
    const matchesScope = customerScope ? record.customerId === query.customerId : mine
    const values = [record.name, record.topic, record.question, record.customer, record.expert, record.id]
    const matchesKeyword = !keyword || values.some(value => String(value || '').toLowerCase().includes(keyword))
    const matchesDate = !selectedDate || String(record.time || '').startsWith(selectedDate)
    const matchesInitiator = !selectedInitiator || String(record.initiator || '').toLowerCase().includes(selectedInitiator)
    const matchesStatus = selectedStatus === '全部' || record.status === selectedStatus
    return matchesScope && matchesKeyword && matchesDate && matchesInitiator && matchesStatus
  })
}

function invitationDetail(state, invitation) {
  const appointment = appointmentFor(state, invitation.appointmentId) || {}
  const message = (state.resources?.['approval-message'] || []).find(item => item.invitationId === invitation.id)
  const start = new Date(appointment.time)
  start.setMinutes(start.getMinutes() - 14)
  const demoAt = Number.isFinite(start.getTime()) ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}T${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}:00` : ''
  const responseStatus = ['待确认', '待处理', '已发送', '已通知'].includes(invitation.status)
    ? '已通知'
    : invitation.status === '已接受' ? '已参与' : (invitation.status || '已通知')
  const detailHref = `${terminalHref('service', 'consultation')}&record=${encodeURIComponent(appointment.id)}&mode=detail&actor=${encodeURIComponent(invitation.expert)}&demoAt=${encodeURIComponent(demoAt)}`
  return `<section class="terminal-card consultation-invitation-detail"><header><div><span class="eyebrow">专家消息 · 会诊通知</span><h2>${escapeHtml(appointment.customer || '当前客户')} · ${escapeHtml(appointment.topic || appointment.name || '-')}</h2><p>消息${message?.unread ? '未读' : '已读'}；本期不在系统内接受或拒绝邀请，预约信息由发起医生维护。</p></div><div class="terminal-action-row"><a class="btn secondary" href="${terminalHref('service', 'consultation')}">返回我的会诊</a>${statusBadge(responseStatus)}</div></header><div class="consultation-invitation-grid"><div><b>客户</b><span>${escapeHtml(appointment.customer || '-')}（${escapeHtml(appointment.customerId || '-')}）</span></div><div><b>会诊主题</b><span>${escapeHtml(appointment.topic || appointment.name || '-')}</span></div><div><b>预约时间</b><span>${escapeHtml(appointment.time || '-')} 至 ${escapeHtml(appointment.endTime || '-')}</span></div><div><b>资料权限</b><span>仅可查看预约开始前的客户资料</span></div><div><b>参与人</b><span>${escapeHtml(participantsFor(appointment).join('、') || '-')}</span></div><div><b>当前响应状态</b><span>${escapeHtml(responseStatus)}</span></div></div><div class="terminal-action-row consultation-role-actions"><a class="btn primary" href="${detailHref}">查看会诊详情</a></div></section>`
}

export function consultationDetailContentV2(state, query = {}) {
  if (query.invitation) {
    const invitation = invitationFor(state, query.invitation)
    return invitation ? invitationDetail(state, invitation) : '<section class="terminal-card"><div class="empty-state"><b>未找到会诊邀请</b></div></section>'
  }
  const appointment = appointmentFor(state, query.record) || (state.resources?.['consultation-appointment'] || [])[0] || {}
  const invitations = (state.resources?.['consultation-invitation'] || []).filter(item => item.appointmentId === appointment.id)
  const room = (state.resources?.['consultation-room'] || []).find(item => item.appointmentId === appointment.id)
  const conclusion = (state.resources?.['consultation-conclusion'] || []).find(item => item.appointmentId === appointment.id)
  const currentUser = currentConsultationUser(state, query)
  const ownInvitation = invitations.find(item => item.expert === currentUser)
  const viewAt = new Date(query.demoAt || Date.now()).getTime()
  const startAt = new Date(appointment.time).getTime()
  const endAt = new Date(appointment.endTime).getTime()
  const entryOpen = !!ownInvitation && !['已拒绝', '时间冲突'].includes(ownInvitation.status) && viewAt >= startAt - 15 * 60 * 1000 && (!Number.isFinite(endAt) || viewAt <= endAt)
  const roleActions = [
    appointment.initiator === currentUser && !/已归档|已取消|进行中/.test(appointment.status || '') ? `<button class="btn secondary small" data-action="consultation-reschedule" data-resource="consultation-appointment" data-record="${escapeHtml(appointment.id)}">改期</button><button class="btn secondary small" data-action="consultation-cancel" data-resource="consultation-appointment" data-record="${escapeHtml(appointment.id)}">取消预约</button>` : '',
    ownInvitation && !room?.enteredAt && !['已拒绝', '时间冲突'].includes(ownInvitation.status) ? `<button class="btn primary small${entryOpen ? '' : ' disabled'}" ${entryOpen ? '' : 'disabled '}data-terminal-action="consultation-enter" data-invitation-id="${escapeHtml(ownInvitation.id)}" data-appointment-id="${escapeHtml(appointment.id)}"${query.demoAt ? ` data-at="${escapeHtml(query.demoAt)}"` : ''}>${entryOpen ? '参与会诊' : '参与会诊（开始前 15 分钟开放）'}</button>` : '',
    room?.status === '进行中' && appointment.initiator === currentUser ? `<button class="btn secondary small" data-terminal-action="consultation-finish" data-appointment-id="${escapeHtml(appointment.id)}">结束会诊</button>` : '',
    room?.status === '已结束' && appointment.initiator === currentUser && !conclusion?.opinion ? `<button class="btn primary small" data-action="consultation-conclusion" data-record="${escapeHtml(appointment.id)}">填写会诊结论</button>` : '',
    (conclusion?.signatureTasks || []).some(item => item.participant === currentUser && item.status !== '已签署') ? `<button class="btn primary small" data-terminal-action="consultation-sign" data-appointment-id="${escapeHtml(appointment.id)}" data-participant="${escapeHtml(currentUser)}">签署</button>` : '',
    conclusion?.status === '已签署' && appointment.recordingStatus !== '已保存' ? `<button class="btn secondary small" data-terminal-action="consultation-recording-ready" data-appointment-id="${escapeHtml(appointment.id)}" data-recording-url="prototype://consultation-recording">录像回调</button>` : '',
    appointment.status === '待归档' && appointment.recordingStatus === '已保存' ? `<button class="btn primary small" data-terminal-action="consultation-archive" data-appointment-id="${escapeHtml(appointment.id)}">归档</button>` : ''
  ].join('')
  const sourceInquiryId = appointment.inquiryId || state.terminalDemo?.inquiry?.id
  const sourceInquiry = sourceInquiryId ? `<a class="btn-link" href="${terminalHref('service', 'inquiry')}&record=${encodeURIComponent(sourceInquiryId)}&mode=detail">查看来源问诊</a>` : ''
  const participantRows = room?.actualParticipants?.length
    ? room.actualParticipants.map(item => `<div><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.joinedAt || '-')} ～ ${escapeHtml(item.leftAt || '进行中')}</small></div>`).join('')
    : '<p class="empty-state">尚无实际入会记录</p>'
  const signatureRows = conclusion?.signatureTasks?.length
    ? conclusion.signatureTasks.map(item => `<div><span>${escapeHtml(item.participant)}</span>${statusBadge(item.status || '待签署')}</div>`).join('')
    : '<p class="empty-state">会诊结论提交后生成签署任务</p>'
  const auditRows = (state.audit || []).filter(item => item.targetId === appointment.id).slice(0, 8)
  const auditTimeline = auditRows.length
    ? auditRows.map(item => `<div><time>${escapeHtml(item.time || '-')}</time><b>${escapeHtml(item.action || '-')}</b><span>${escapeHtml(item.detail || '')}</span></div>`).join('')
    : '<p class="empty-state">暂无处理记录</p>'
  const playback = query.playback && appointment.recordingStatus === '已保存'
    ? `<section class="consultation-playback-panel"><header><b>会诊视频回放</b>${statusBadge('可回放')}</header><div class="consultation-playback-screen"><span>▶</span><b>多人合流录像</b><small>系统鉴权播放 · 不提供下载</small></div></section>`
    : ''
  return `<section class="terminal-card consultation-detail-shell"><header><div><span class="eyebrow">服务端 · 会诊详情</span><h2>${escapeHtml(appointment.customer || '当前客户')} · ${escapeHtml(appointment.topic || appointment.name || appointment.id || '会诊')}</h2><p>会诊状态、专家通知、实际参会、结论签署、录像和归档分别记录。</p></div><div class="terminal-action-row"><a class="btn secondary" href="${terminalHref('service', 'consultation')}${appointment.customerId ? `&customerId=${encodeURIComponent(appointment.customerId)}&scope=customer` : ''}">返回会诊列表</a>${statusBadge(appointment.status || '已预约')}</div></header><section class="consultation-info-section"><header><b>会诊信息</b><small>预约和参与范围</small></header><div class="consultation-info-grid"><div><b>客户</b><span>${escapeHtml(appointment.customer || '-')}（${escapeHtml(appointment.customerId || '-')}）</span></div><div><b>会诊主题</b><span>${escapeHtml(appointment.topic || appointment.name || '-')}</span></div><div><b>问题描述</b><span>${escapeHtml(appointment.question || '-')}</span></div><div><b>预约时间</b><span>${escapeHtml(appointment.time || '-')} ～ ${escapeHtml(appointment.endTime || '-')}</span></div><div><b>发起医生</b><span>${escapeHtml(appointment.initiator || '-')}</span></div><div><b>受邀专家</b><span>${escapeHtml(participantsFor(appointment).join('、') || '-')}</span></div><div><b>会诊资料</b><span>预约开始前客户资料由系统自动截点</span></div><div><b>补充附件</b><span>${escapeHtml((appointment.attachments || []).join('、') || '无')}</span></div></div>${sourceInquiry ? `<div class="consultation-source-link">${sourceInquiry}</div>` : ''}</section><section class="consultation-result-panel"><header><b>会诊结果</b><span>录像：${escapeHtml(appointment.recordingStatus === '已保存' ? '可回放' : (appointment.recordingStatus || '未开始'))} · 归档：${escapeHtml(appointment.archiveStatus || '未归档')}</span></header><div class="consultation-result-grid"><div><b>实际参会</b><div class="consultation-participant-list">${participantRows}</div></div><div><b>会诊结论</b><p>${escapeHtml(conclusion?.opinion || '会诊结束后由发起医生填写')}</p></div><div><b>签署情况</b><div class="consultation-signature-list">${signatureRows}</div></div></div></section>${playback}<section class="consultation-audit-timeline"><header><b>处理记录</b><small>预约、通知、入会、结论、签署和归档会按时间记录</small></header>${auditTimeline}</section><div class="terminal-action-row consultation-role-actions">${roleActions}<span class="handoff-note">当前显示当前角色可执行的动作。</span></div></section>`
}

function creationFieldLabels(customerId, customer) {
  return `<template class="consultation-create-template"><form data-consultation-create-form><label>会诊主题</label><label>问题描述</label><label>受邀专家</label><label>会诊时间</label><label>会诊时长</label><label>补充附件</label><input type="hidden" name="customerId" value="${escapeHtml(customerId)}"><input type="hidden" name="customer" value="${escapeHtml(customer)}"></form></template>`
}

export function consultationListContentV2(state, query = {}) {
  const customerScope = query.scope === 'customer' && query.customerId
  const appointments = filteredAppointments(state, query)
  const rows = appointments.length
    ? appointments.map(record => `<tr><td>${escapeHtml(record.name || record.id)}</td><td>${escapeHtml(record.customer || '-')}</td><td>${escapeHtml(record.initiator || '-')}</td><td>${escapeHtml(record.expert || '-')}</td><td>${escapeHtml(record.time || '-')}</td><td>${statusBadge(record.status || '已预约')}</td><td>${record.recordingStatus === '已保存' ? '<span class="status-chip success">可回放</span>' : `<span class="status-chip soft">${escapeHtml(record.recordingStatus || '未开始')}</span>`}</td><td><a class="btn-link" href="${terminalHref('service', 'consultation')}&record=${encodeURIComponent(record.id)}&mode=detail${customerScope ? `&customerId=${encodeURIComponent(query.customerId)}&scope=customer` : ''}">查看详情 →</a>${record.recordingStatus === '已保存' ? ` <a class="btn-link" href="${terminalHref('service', 'consultation')}&record=${encodeURIComponent(record.id)}&mode=detail&playback=1${customerScope ? `&customerId=${encodeURIComponent(query.customerId)}&scope=customer` : ''}">查看回放</a>` : ''}</td></tr>`).join('')
    : '<tr><td colspan="8"><div class="empty-state"><b>暂无会诊记录</b><p>会诊从客户问诊详情发起。</p></div></td></tr>'
  const statuses = ['全部', '已预约', '进行中', '待填写结论', '待签字', '待归档', '已归档', '已取消', '已过期']
  const statusOptions = statuses.map(status => `<option${status === (query.status || '全部') ? ' selected' : ''}>${status}</option>`).join('')
  const messages = (state.resources?.['approval-message'] || []).filter(item => item.messageType === '会诊邀请' && item.unread)
  const customerId = query.customerId || state.terminalDemo?.inquiry?.customerId || 'KH-202609-001'
  const customer = state.terminalDemo?.inquiry?.customer || '林女士'
  const header = customerScope
    ? `<span class="eyebrow">服务端 · 当前客户会诊</span><h2>当前客户会诊记录</h2><p>客户 ${escapeHtml(customer)}（${escapeHtml(customerId)}）范围内的会诊记录；新增会诊需从这里发起。</p>`
    : '<span class="eyebrow">服务端 · 我的会诊</span><h2>我的会诊</h2><p>只展示当前用户“我发起 / 我参与”的记录；新增会诊请从客户详情进入。</p>'
  const create = customerScope ? `<button class="btn primary" type="button" data-action="open-consultation-create" data-customer-id="${escapeHtml(customerId)}" data-customer="${escapeHtml(customer)}">新增会诊</button>` : ''
  const messagePanel = !customerScope && messages.length
    ? `<section class="consultation-message-panel"><b>专家消息 · 未读会诊邀请</b>${messages.map(message => `<a href="${terminalHref('service', 'consultation')}&invitation=${encodeURIComponent(message.invitationId)}&mode=invitation">${escapeHtml(message.name)} · 未读</a>`).join('')}</section>`
    : ''
  return `${scopeBanner('phase2', customerScope ? '当前客户范围内查看和新增会诊预约。' : '我的会诊只显示我发起或我参与的记录。')}<section class="terminal-card consultation-record-card"><header><div>${header}</div><div class="terminal-action-row">${create}</div></header>${messagePanel}<form class="terminal-filter" data-terminal-filter><label><span>客户 ${helpButton('field:filter:keyword')}</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="输入客户或会诊主题"></label><label><span>日期</span><input type="date" name="date" value="${escapeHtml(query.date || '')}"></label><label><span>状态 ${helpButton('field:filter:status')}</span><select name="status">${statusOptions}</select></label><label><span>发起人</span><input name="initiator" value="${escapeHtml(query.initiator || '')}" placeholder="输入发起医生"></label><button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form><div class="consultation-table-heading"><b>会诊记录</b><span>共 ${appointments.length} 条</span></div><div class="terminal-table consultation-record-table"><table><thead><tr><th>会诊主题</th><th>客户</th><th>发起人</th><th>专家</th><th>预约时间</th><th>会诊状态</th><th>录像</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>${customerScope ? creationFieldLabels(customerId, customer) : ''}</section>`
}
