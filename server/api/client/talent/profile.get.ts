/**
 * @description C 端家长资料读取：中性账户（昵称 / 头像）+ 家长档案脱敏（手机号 / 身份证只给脱敏）。
 *   未绑定家长 / 家长停用 → 404（资源级隐藏）；响应不含 cipher / hash / 证件原文。
 * @file server/api/client/talent/profile.get.ts
 * @route GET /api/client/talent/profile
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  buildTalentClientProfile,
  requireTalentClientParent,
  requireTalentClientUser,
} from "~~/server/utils/talent-client-api";
import { sanitizeTalentParentRecord } from "~~/server/utils/talent-member";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const pb = await getAdminPB();
  const parent = await requireTalentClientParent(pb, user.id);
  const profile = buildTalentClientProfile(
    { id: user.id, nickname: user.nickname, avatar: user.avatar },
    sanitizeTalentParentRecord(parent),
  );
  setHeader(event, "cache-control", "no-store");
  return success(profile, "家长资料");
});