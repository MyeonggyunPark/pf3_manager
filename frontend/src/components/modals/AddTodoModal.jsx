import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

// Define priority levels and todo categories for UI mapping
// UI 매핑을 위한 우선순위 레벨 및 할 일 카테고리 정의
const PRIORITIES = [
  { value: 1, label: "중요" },
  { value: 2, label: "보통" },
  { value: 3, label: "낮음" },
];

const CATEGORIES = [
  { value: "PREP", label: "수업 준비" },
  { value: "ADMIN", label: "행정/회계" },
  { value: "STUDENT", label: "학생 관리" },
  { value: "PERSONAL", label: "개인 업무" },
];

export default function AddTodoModal({
  isOpen,
  onClose,
  onSuccess,
  todoData = null,
}) {
  // Manage loading states for async operations (Submit/Delete)
  // 비동기 작업(제출/삭제)에 대한 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage validation errors per field (object) and general submission errors (string)
  // 필드별 유효성 에러(객체)와 일반 제출 에러(문자열)를 구분하여 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // State for managing delete confirmation overlay visibility
  // 삭제 확인 오버레이 표시 여부를 관리하는 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine if the modal is in edit mode based on provided todoData
  // todoData 존재 여부를 기반으로 수정 모드인지 확인
  const isEditMode = !!todoData;

  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  // Populate form data when opening in edit mode, or reset to defaults in create mode
  // 수정 모드로 열릴 때 폼 데이터를 채우거나, 생성 모드일 때 기본값으로 초기화
  useEffect(() => {
    if (isOpen && todoData) {
      setContent(todoData.content);
      setDueDate(todoData.due_date || "");
      setPriority(todoData.priority);
      setCategory(todoData.category);
    } else if (isOpen) {
      setContent("");
      setDueDate("");
      setPriority("");
      setCategory("");
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, todoData]);

  if (!isOpen) return null;

  // Reset form state and error messages before closing the modal
  // 모달을 닫기 전 폼 데이터와 에러 메시지 초기화
  const handleClose = () => {
    setErrors({});
    setSubmitError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Helper to clear specific field error on user input
  // 사용자 입력 시 특정 필드의 에러를 제거하는 헬퍼 함수
  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Trigger the delete confirmation overlay
  // 삭제 확인 오버레이 활성화
  const handleRequestDelete = () => setShowDeleteConfirm(true);

  // Execute the actual delete operation when confirmed in the overlay
  // 오버레이에서 확인 시 실제 삭제 작업 실행
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/todos/${todoData.id}/`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Delete Failed:", err);
      setSubmitError("삭제 중 오류가 발생했습니다.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Perform frontend validation
    // 프론트엔드 유효성 검사 수행
    const newErrors = {};
    if (!content.trim()) newErrors.content = "업무 내용을 입력해주세요.";
    if (!priority) newErrors.priority = "우선순위를 선택해주세요.";
    if (!category) newErrors.category = "카테고리를 선택해주세요.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    const payload = {
      content,
      due_date: dueDate || null,
      priority,
      category,
    };

    try {
      // Call API: PATCH for updates (Edit), POST for creation (Add)
      // API 호출: 수정 시 PATCH, 생성 시 POST 사용
      if (isEditMode) {
        await api.patch(`/api/todos/${todoData.id}/`, payload);
      } else {
        await api.post("/api/todos/", payload);
      }
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Todo Save Failed:", err);
      setSubmitError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable Chip Component for radio-like selection
  // 라디오 버튼과 유사한 선택을 위한 재사용 가능한 칩 컴포넌트
  const SelectionChip = ({
    label,
    value,
    selectedValue,
    onClick,
    className = "",
  }) => {
    const isSelected = selectedValue === value;
    return (
      <button
        type="button"
        onClick={() => onClick(value)}
        className={`relative flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap ${
          isSelected
            ? "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]"
            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80 hover:text-slate-700 dark:hover:text-foreground border border-transparent"
        } ${className}`}
      >
        {label}
      </button>
    );
  };

  // Helper component for rendering inline error messages
  // 인라인 에러 메시지 렌더링을 위한 헬퍼 컴포넌트
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1 animate-in slide-in-from-top-1">
        {message}
      </p>
    );
  };

  // Helper component for Labels with error styling
  // 에러 스타일링이 적용된 라벨 헬퍼 컴포넌트
  const InputLabel = ({ label, required, hasError }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 flex items-center gap-1 transition-colors ${
        hasError
          ? "text-destructive"
          : "text-slate-500 dark:text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-destructive">*</span>}
    </label>
  );

  // Use portal to render modal outside the parent DOM hierarchy for correct z-index stacking
  // 올바른 z-index 스태킹을 위해 부모 DOM 계층 외부에서 모달을 렌더링하도록 포털 사용
  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden transform transition-all m-4 relative">
        {/* Delete Confirmation Overlay (Conditional Rendering) */}
        {/* 삭제 확인 오버레이 (조건부 렌더링) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white dark:bg-card backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
              삭제 확인
            </h3>
            <p className="text-slate-500 dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              정말로 삭제하시겠습니까?
              <br />
              <span className="text-destructive mt-1 block font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <Button
                type="button"
                className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold shadow-md cursor-pointer transition-all"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "삭제"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              {isEditMode ? "업무 수정" : "업무 추가"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              {isEditMode
                ? "수정이 필요한 업무의 내용을 변경해주세요."
                : "추가할 새로운 업무의 내용을 입력하세요."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disable default browser validation to use custom UI error handling */}
        {/* 커스텀 UI 에러 처리를 사용하기 위해 브라우저 기본 유효성 검사 비활성화 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2 text-center">
              {submitError}
            </div>
          )}

          <div className="space-y-1.5">
            <InputLabel label="내용" hasError={!!errors.content} required />
            <input
              required
              type="text"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                clearError("content");
              }}
              placeholder="업무 내용 입력"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
              autoFocus={!isEditMode}
              autoComplete="off"
            />
            <ErrorMessage message={errors.content} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <InputLabel
                label="우선순위"
                hasError={!!errors.priority}
                required
              />
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <SelectionChip
                    key={p.value}
                    label={p.label}
                    value={p.value}
                    selectedValue={priority}
                    onClick={(val) => {
                      setPriority(val);
                      clearError("priority");
                    }}
                    className="flex-1 cursor-pointer"
                  />
                ))}
              </div>
              <ErrorMessage message={errors.priority} />
            </div>

            <div className="space-y-1.5">
              <InputLabel label="마감 기한" hasError={false} />
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                  }}
                  // Open native date picker on click for better UX
                  // 사용자 경험 개선을 위해 클릭 시 네이티브 날짜 선택창 열기
                  onClick={(e) => e.target.showPicker()}
                  className={`w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm cursor-pointer ${
                    dueDate === ""
                      ? "text-slate-400 dark:text-muted-foreground/60 [&::-webkit-calendar-picker-indicator]:opacity-40"
                      : "text-slate-800 dark:text-foreground [&::-webkit-calendar-picker-indicator]:opacity-100"
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <InputLabel
              label="카테고리"
              hasError={!!errors.category}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <SelectionChip
                  key={cat.value}
                  label={cat.label}
                  value={cat.value}
                  selectedValue={category}
                  onClick={(val) => {
                    setCategory(val);
                    clearError("category");
                  }}
                  className="cursor-pointer"
                />
              ))}
            </div>
            <ErrorMessage message={errors.category} />
          </div>

          {/* Action Buttons with Delete Option (Edit Mode Only) */}
          {/* 삭제 옵션이 포함된 액션 버튼 (수정 모드 전용) */}
          <div className="flex items-center gap-3 pt-2">
            {isEditMode && (
              <Button
                type="button"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 h-11 w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer transition-all"
                onClick={handleRequestDelete}
                disabled={isLoading || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}

            <Button
              type="button"
              className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              onClick={handleClose}
              disabled={isLoading || isDeleting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
              disabled={isLoading || isDeleting}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "수정 중..." : "저장 중..."}
                </>
              ) : isEditMode ? (
                "수정"
              ) : (
                "추가"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
