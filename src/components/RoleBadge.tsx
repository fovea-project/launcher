import { PatchCheckFill } from "react-bootstrap-icons";
import type { AuthorRole } from "@/types/api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A verified-style check badge shown next to admins' and moderators' names,
 * in our brand colors (lime for admin, purple accent for moderator). */
export function RoleBadge({ role, className }: { role?: AuthorRole; className?: string }) {
  const t = useT();
  if (role !== "admin" && role !== "moderator") return null;
  return (
    <span
      title={role === "admin" ? t("role.admin") : t("role.moderator")}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <PatchCheckFill
        className={cn("size-3.5", role === "admin" ? "text-primary" : "text-[#7d39eb]")}
      />
    </span>
  );
}
