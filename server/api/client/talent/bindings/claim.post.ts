/**
 * @description C 端显式认领：用当前账号已验证手机号哈希命中唯一家长档案时写入
 *   `talent_parents.userId`；0 条 `no_match`、同号多档 `ambiguous`（不写）、
 *   已绑他人 409 `conflict`、无手机号 `no_phone`。响应 = bindings 信封 + `claim.status`。
 * @file server/api/client/talent/bindings/claim.post.ts
 * @route POST /api/client/talent/bindings/claim
 * @body 空请求体（不调用 validateBody）
 */
import {
  claimTalentMemberBinding,
  type TalentMemberClaimStatus,
} from "~~/server/utils/talent-member-api";
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

const CLAIM_MESSAGES: Readonly<Record<TalentMemberClaimStatus, string>> = {
  bound: "已绑定会员档案",
  already_bound: "会员档案已绑定",
  no_match: "未找到匹配的会员档案",
  ambiguous: "手机号对应多个家长档案，请联系后台核对合并",
  conflict: "该手机号对应的家长档案已绑定其他账号",
  no_phone: "当前账号无已验证手机号",
};

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  return withOperLog(
    event,
    { title: "认领会员档案", operType: OperType.UPDATE },
    async () => {
      const pb = await getAdminPB();
      const result = await claimTalentMemberBinding(
        pb,
        String(user.id || ""),
        String(user.phone || ""),
      );
      setHeader(event, "cache-control", "no-store");
      return success(
        {
          ...result.bindings,
          claim: { status: result.status },
        },
        CLAIM_MESSAGES[result.status],
      );
    },
  );
});