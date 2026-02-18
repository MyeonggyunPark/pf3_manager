import { useState } from "react";
import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../api";
import Button from "../ui/Button";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Grouped form state for object-based updates
  // 객체 기반 업데이트를 위한 그룹화된 폼 상태
  const [formData, setFormData] = useState({
    old_password: "",
    new_password1: "",
    new_password2: "",
  });

  if (!isOpen) return null;

  // Generic handler for multiple input fields
  // 다중 입력 필드를 위한 범용 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Reset all states upon closing
  // 모달 닫기 시 모든 상태 초기화
  const handleClose = () => {
    setFormData({ old_password: "", new_password1: "", new_password2: "" });
    setErrors({});
    setSubmitError(null);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const newErrors = {};

    // Basic empty field validation
    // 기본 빈 필드 유효성 검사
    if (!formData.old_password)
      newErrors.old_password = t("change_pw_error_current_required");
    if (!formData.new_password1)
      newErrors.new_password1 = t("change_pw_error_new_required");
    if (!formData.new_password2)
      newErrors.new_password2 = t("change_pw_error_confirm_required");

    // Complex password strength validation (Regex)
    // 복합 비밀번호 강도 유효성 검사 (정규식)
    if (formData.new_password1) {
      const password = formData.new_password1;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      const isValidLength = password.length >= 8;

      if (!isValidLength || !hasUpperCase || !hasSpecialChar) {
        const msg = t("change_pw_error_rule");
        newErrors.new_password1 = msg;

        if (formData.new_password2) {
          newErrors.new_password2 = msg;
        }
      }
    }

    // Cross-check password confirmation
    // 비밀번호 확인 일치 여부 대조
    if (
      !newErrors.new_password1 &&
      formData.new_password1 &&
      formData.new_password2
    ) {
      if (formData.new_password1 !== formData.new_password2) {
        newErrors.new_password2 = t("change_pw_error_mismatch");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/api/auth/password/change/", formData);
      setIsSuccess(true);
    } catch (err) {
      console.error("Change Password Error:", err);
      const responseData = err.response?.data;

      // Map backend field errors to UI
      // 백엔드 필드 에러를 UI에 매핑
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

        // 필드 에러가 있어도 상단에 에러 메시지 표시
        setSubmitError(t("change_pw_error_check_input"));
      } else {
        setSubmitError(responseData?.detail || t("change_pw_error_failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Force re-login after password change for security
  // 보안을 위해 비밀번호 변경 후 강제 재로그인
  const handleConfirmSuccess = async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch (e) {
      console.warn("Logout error ignored:", e);
    }
    localStorage.removeItem("is_logged_in");
    window.location.href = "/login";
  };

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
      className={`text-xs font-bold tracking-wider pl-1 mb-1.5 flex items-center gap-1 transition-colors ${
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
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border m-4 relative overflow-hidden transition-all">
        {/* Success Overlay View */}
        {/* 성공 시 오버레이 화면 */}
        {isSuccess && (
          <div className="absolute rounded-2xl inset-0 z-20 bg-white/95 dark:bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-accent/20 text-[#4a7a78] dark:text-accent rounded-full flex items-center justify-center mb-4">
              <LucideIcons.CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#4a7a78] dark:text-accent mb-2">
              {t("change_pw_success_title")}
            </h3>
            <p className="text-muted-foreground dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              {t("change_pw_success_desc_line1")}
              <br />
              {t("change_pw_success_desc_prefix")}{" "}
              <strong>{t("change_pw_success_desc_highlight")}</strong>
              {t("change_pw_success_desc_suffix")}
            </p>
            <Button
              variant="default"
              className="w-full max-w-xs bg-accent hover:bg-accent/90 text-white font-bold h-11 shadow-md cursor-pointer"
              onClick={handleConfirmSuccess}
            >
              {t("confirm")}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground">
              {t("change_pw_title")}
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              {t("change_pw_desc")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <LucideIcons.X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {/* Global submission error display */}
          {/* 전체 전송 에러 표시 */}
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2 text-center">
              {submitError}
            </div>
          )}

          {/* Current Password Field */}
          {/* 현재 비밀번호 필드 */}
          <div className="space-y-1">
            <InputLabel
              label={t("change_pw_current_label")}
              required
              hasError={!!errors.old_password}
            />
            <input
              type="password"
              name="old_password"
              required
              value={formData.old_password}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground"
            />
            <ErrorMessage message={errors.old_password} />
          </div>

          {/* New Password Field */}
          {/* 새 비밀번호 필드 */}
          <div className="space-y-1">
            <InputLabel
              label={t("change_pw_new_label")}
              required
              hasError={!!errors.new_password1}
            />
            <input
              type="password"
              name="new_password1"
              required
              value={formData.new_password1}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground"
            />
            <ErrorMessage message={errors.new_password1} />
          </div>

          {/* Confirm New Password Field */}
          {/* 새 비밀번호 확인 필드 */}
          <div className="space-y-1">
            <InputLabel
              label={t("change_pw_confirm_label")}
              required
              hasError={!!errors.new_password2}
            />
            <input
              type="password"
              name="new_password2"
              required
              value={formData.new_password2}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground"
            />
            <ErrorMessage message={errors.new_password2} />
          </div>

          {/* Action buttons */}
          {/* 작업 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
            >
              {t("change_pw_cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              {isLoading ? (
                <LucideIcons.Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("change_pw_submit")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
