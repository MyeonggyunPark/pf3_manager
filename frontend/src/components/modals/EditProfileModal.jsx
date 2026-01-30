import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

export default function EditProfileModal({
  isOpen,
  onClose,
  onSuccess,
  userData,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [name, setName] = useState("");

  // Sync internal state with latest prop data
  // 내부 상태를 최신 프로프 데이터와 동기화
  useEffect(() => {
    if (isOpen && userData) {
      setName(userData.name || "");
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Clear specific field error on user typing
  // 입력 시 특정 필드의 에러 메시지 제거
  const handleChangeName = (e) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    if (!name.trim()) {
      setErrors({ name: "이름을 입력해주세요." });
      return;
    }

    setIsLoading(true);

    try {
      await api.patch("/api/auth/user/", { name });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const responseData = err.response?.data;

      // Handle field-specific validation errors from backend
      // 백엔드에서 넘어온 필드별 유효성 에러 처리
      if (
        responseData &&
        typeof responseData === "object" &&
        !responseData.detail
      ) {
        const fieldErrors = {};
        Object.keys(responseData).forEach((key) => {
          fieldErrors[key] = Array.isArray(responseData[key])
            ? responseData[key][0]
            : responseData[key];
        });
        setErrors(fieldErrors);
      } else {
        // Handle general server errors
        // 일반 서버 에러 처리
        setSubmitError(responseData?.detail || "프로필 수정에 실패했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // UI mapping for different auth methods
  // 인증 수단별 UI 레이블 매핑
  const getProviderLabel = (provider) => {
    if (provider === "google") return "Google 계정 연동";
    if (provider === "kakao") return "Kakao 계정 연동";
    return "개인 계정 연동";
  };

  // Reusable sub-components for form styling
  // 폼 스타일을 위한 재사용 서브 컴포넌트
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1 animate-in slide-in-from-top-1">
        {message}
      </p>
    );
  };

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

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden transform transition-all m-4 relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground">
              프로필 수정
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              이름만 수정할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          {/* Global submission error display */}
          {/* 전체 전송 에러 표시 */}
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2 text-center">
              {submitError}
            </div>
          )}

          {/* Read-only account info (Unchangeable) */}
          {/* 읽기 전용 계정 정보 (수정 불가) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-muted-foreground pl-1 flex items-center">
              계정 유형
            </label>
            <div className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-100 dark:bg-muted flex items-center text-sm text-slate-500 dark:text-muted-foreground font-medium cursor-not-allowed">
              {getProviderLabel(userData?.provider)}
            </div>
          </div>

          {/* Read-only account info (Unchangeable) */}
          {/* 읽기 전용 계정 정보 (수정 불가) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-muted-foreground pl-1 flex items-center">
              이메일
            </label>
            <div className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-100 dark:bg-muted flex items-center text-sm text-slate-500 dark:text-muted-foreground font-medium cursor-not-allowed">
              {userData?.email}
            </div>
          </div>

          {/* Editable name field */}
          {/* 수정 가능한 이름 필드 */}
          <div className="space-y-1.5">
            <InputLabel label="이름" required hasError={!!errors.name} />
            <input
              type="text"
              value={name}
              onChange={handleChangeName}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-800 dark:text-foreground font-medium"
              placeholder="이름 입력"
            />
            <ErrorMessage message={errors.name} />
          </div>

          {/* Action buttons */}
          {/* 작업 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
