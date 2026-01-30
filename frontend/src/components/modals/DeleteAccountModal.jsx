import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import Button from "../ui/Button";

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) {
  // Prevent unnecessary DOM rendering when inactive
  // 비활성 시 불필요한 DOM 렌더링 방지
  if (!isOpen) return null;

  // Use Portal to escape parent CSS constraints
  // 부모 CSS 제약 탈출을 위해 포탈 사용
  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden m-4 animate-in zoom-in-95">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <LucideIcons.AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
            삭제 확인
          </h3>

          <div className="text-sm text-center text-slate-500 dark:text-muted-foreground mb-8">
            정말로 삭제하시겠습니까?
            <div className="mt-1">
              모든 데이터가{" "}
              <span className="text-destructive font-medium">
                영구적으로 삭제
              </span>
              되며
              <br />
              <span className="text-destructive font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            {/* Prevent modal close during active deletion API call */}
            {/* 삭제 API 호출 중 모달 닫기 방지 */}
            <Button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
            >
              취소
            </Button>

            {/* Visual feedback for pending deletion state */}
            {/* 삭제 진행 상태에 대한 시각적 피드백 */}
            <Button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white cursor-pointer h-11 font-semibold text-sm shadow-md transition-all"
            >
              {isDeleting ? (
                <LucideIcons.Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "삭제"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
