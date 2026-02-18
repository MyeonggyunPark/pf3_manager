import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { cn } from "../lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import EditProfileModal from "../components/modals/EditProfileModal";
import ChangePasswordModal from "../components/modals/ChangePasswordModal";
import DeleteAccountModal from "../components/modals/DeleteAccountModal";
import InvoiceSettingsModal from "../components/modals/InvoiceSettingsModal";

const DeletionSuccessModal = ({ isOpen, onConfirm }) => {

  // Use translation hook
  // 번역 훅 사용
  const { t } = useTranslation();

  // Prevent rendering if not open
  // 열려있지 않으면 렌더링 방지
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden m-4 animate-in zoom-in-95">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-accent/20 dark:bg-accent/10 text-[#4a7a78] dark:text-accent rounded-full flex items-center justify-center mb-4">
            <LucideIcons.HeartHandshake className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#4a7a78] dark:text-accent mb-2">
            {t("delete_complete_title")}
          </h3>

          <p className="text-slate-400 dark:text-muted-foreground text-center mb-6 text-sm leading-relaxed">
            {t("delete_complete_desc")}
          </p>

          <Button
            onClick={onConfirm}
            className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const DeletionErrorModal = ({ isOpen, onClose }) => {

  // Use translation hook
  // 번역 훅 사용
  const { t } = useTranslation();

  // Prevent rendering if not open
  // 열려있지 않으면 렌더링 방지
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden m-4 animate-in zoom-in-95">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <LucideIcons.XCircle className="w-8 h-8 text-destructive" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
            {t("delete_error_title")}
          </h3>

          <p className="text-sm text-center text-slate-500 dark:text-muted-foreground mb-8 whitespace-pre-line">
            {t("delete_error_desc")}
          </p>

          <Button
            onClick={onClose}
            className="w-full bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 h-11 font-semibold text-sm transition-all cursor-pointer"
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function Settings() {

  // Use translation hook and access i18n instance
  // 번역 훅 사용 및 i18n 인스턴스 접근
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);

  // Persist user theme preference from storage
  // 스토리지에 저장된 테마 설정 유지
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  // 모달 상태 관리
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Account Deletion States
  // 계정 삭제 관련 상태 관리
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to toggle language between German and Korean
  // 독일어와 한국어 사이에서 언어를 토글하는 함수
  const toggleLanguage = () => {
    const currentLang = i18n.resolvedLanguage || i18n.language || "de";
    const newLang = currentLang.startsWith("ko") ? "de" : "ko";
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  // Sync profile data with backend on mount
  // 마운트 시 백엔드 유저 데이터 동기화
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/auth/user/");
      setUser(res.data);
    } catch (e) {
      console.error("User fetch failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Update DOM and storage on theme change
  // 테마 변경 시 DOM 클래스 및 스토리지 업데이트
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Handle Account Deletion Process
  // 계정 삭제 프로세스 처리
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete("/api/auth/user/");
      setShowDeleteConfirm(false);
      setShowSuccessModal(true);
    } catch (e) {
      console.error("Delete failed", e);
      setShowDeleteConfirm(false);
      setShowErrorModal(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // Final Cleanup and Redirect
  // 최종 정리 및 리다이렉트 (성공 모달에서 확인 버튼 클릭 시 호출)
  const handleFinalRedirect = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Helper function to get badge styles based on provider
  // 제공자에 따른 뱃지 스타일 반환 헬퍼 함수
  const getProviderBadge = (provider) => {
    switch (provider) {
      case "google":
        return {
          label: "GOOGLE",
          className: "bg-primary/10 text-primary border-primary/20",
        };
      case "kakao":
        return {
          label: "KAKAO",
          className:
            "bg-warning/20 text-yellow-700 border-warning/50 dark:text-warning",
        };
      default:
        return {
          label: "EMAIL",
          className:
            "bg-secondary/30 text-secondary-foreground border-secondary/50",
        };
    }
  };

  if (isLoading || !user) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <LucideIcons.Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Determine badge info
  // 뱃지 정보 결정
  const badgeInfo = getProviderBadge(user.provider);

  // Check if password change is allowed (only for email users)
  // 비밀번호 변경 허용 여부 확인 (이메일 유저만 가능)
  const isEmailUser = !user.provider || user.provider === "email";

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in pb-10">
      {/* Modals for specific actions */}
      {/* 개별 기능을 위한 모달 컴포넌트 */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={fetchUser}
        userData={user}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <InvoiceSettingsModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
      <DeletionSuccessModal
        isOpen={showSuccessModal}
        onConfirm={handleFinalRedirect}
      />
      <DeletionErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      {/* Profile Overview */}
      {/* 프로필 개요 */}
      <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-card">
        <CardHeader className="flex-col lg:flex-row items-center lg:items-center gap-3 lg:gap-6 space-y-0 py-4 lg:py-7">
          <div className="h-16 lg:h-20 w-16 lg:w-20 rounded-2xl bg-white flex items-center justify-center text-primary shadow-lg border-4 border-muted dark:border-accent overflow-hidden dark:bg-slate-200 shrink-0">
            <img
              src="/icons/tutor-icon.png"
              alt="Profile Icon"
              className="w-10 lg:w-13 h-10 lg:h-13 object-contain"
            />
          </div>

          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-2 justify-center lg:justify-start">
              <CardTitle className="text-lg lg:text-2xl font-bold text-slate-800 dark:text-foreground">
                {user.name}
              </CardTitle>
              <span
                className={`text-[9px] lg:text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeInfo.className} w-fit mx-auto lg:mx-0`}
              >
                {badgeInfo.label}
              </span>
            </div>
            <p className="text-xs lg:text-sm text-muted-foreground/90 font-medium mt-1">
              {user.email}
            </p>
          </div>

          <Button
            onClick={() => setIsProfileModalOpen(true)}
            variant="default"
            className="w-full lg:w-auto h-9 lg:h-10 px-3 lg:px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 text-xs lg:text-sm"
          >
            <LucideIcons.Edit3 className="w-3.5 lg:w-4 h-3.5 lg:h-4 mr-1" />{" "}
            {t("edit_profile")}
          </Button>
        </CardHeader>
      </Card>

      {/* Business Settings */}
      {/* 사업자 설정 */}
      <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
            <div className="w-8 h-8 border-3 border-muted dark:border-border rounded-lg flex items-center justify-center shadow-md">
              <LucideIcons.Building2 className="w-5 h-5" />
            </div>
            {t("business_settings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                {t("manage_info")}
              </div>
              <div className="text-xs text-muted-foreground">
                ({t("business_settings_desc")})
              </div>
            </div>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="p-2 rounded-full bg-muted-foreground/20 text-muted-foreground/80 hover:bg-muted-foreground/80 hover:text-card transition-colors active:scale-95 shadow-md cursor-pointer dark:bg-muted dark:text-muted-foreground"
            >
              <LucideIcons.Settings2 className="w-5.5 h-5.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      {/* 시스템 설정 */}
      <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
            <div className="w-8 h-8 border-3 border-muted dark:border-border rounded-lg flex items-center justify-center shadow-md">
              <LucideIcons.Wrench className="w-5 h-5" />
            </div>
            {t("system_settings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Settings Section with Toggle Button */}
          {/* 토글 버튼이 포함된 언어 설정 섹션 */}
          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                {t("language_settings")}
              </div>
              <div className="text-xs text-muted-foreground">
                ({t("language")}:{" "}
                <span className="font-semibold">
                  {(i18n.resolvedLanguage || i18n.language || "").startsWith("ko")
                    ? "한국어"
                    : "Deutsch"}
                </span>
                )
              </div>
            </div>

            {/* Language Toggle circular button (Consistent with Theme Toggle) */}
            {/* 언어 토글 원형 버튼 (테마 토글과 일관성 유지) */}
            <div
              onClick={toggleLanguage}
              className={cn(
                "px-2.5 py-1 rounded-full bg-muted-foreground/20 text-muted-foreground/80 hover:bg-muted-foreground/80 hover:text-card transition-colors active:scale-95 shadow-md cursor-pointer dark:bg-muted dark:text-muted-foreground",
              )}
            >
              {/* Use Flag Emojis instead of image files for better performance and simplicity */}
              {/* 성능과 간결함을 위해 이미지 파일 대신 국기 이모지 사용 */}
              <span className="text-[22px] animate-in fade-in zoom-in-75 duration-300 select-none">
                {(i18n.resolvedLanguage || i18n.language || "").startsWith("ko")
                  ? "🇰🇷"
                  : "🇩🇪"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                {t("screen_mode")}
              </div>
              <div className="text-xs text-muted-foreground">
                ({t("active_mode")}:{" "}
                {isDarkMode ? (
                  <span className="font-semibold">{t("dark_mode")}</span>
                ) : (
                  <span className="font-semibold">{t("light_mode")}</span>
                )}
                )
              </div>
            </div>

            {/* Toggle visual mode state */}
            {/* 시각적 모드 상태 토글 */}
            <div
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`group p-2 rounded-full transition-all duration-200 active:scale-90 shadow-md cursor-pointer relative overflow-hidden ${
                isDarkMode
                  ? "bg-purple-400 text-purple-800 hover:bg-amber-200 hover:text-amber-500"
                  : "bg-amber-200 text-amber-500 hover:bg-purple-400 hover:text-purple-800"
              }`}
            >
              {isDarkMode ? (
                <>
                  <LucideIcons.Moon className="w-5.5 h-5.5 block group-hover:hidden" />
                  <LucideIcons.Sun className="w-5.5 h-5.5 hidden group-hover:block" />
                </>
              ) : (
                <>
                  <LucideIcons.Sun className="w-5.5 h-5.5 block group-hover:hidden" />
                  <LucideIcons.Moon className="w-5.5 h-5.5 hidden group-hover:block" />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account & Security */}
      {/* 계정 및 보안 */}
      <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
            <div className="w-8 h-8 border-3 border-muted dark:border-border rounded-lg flex items-center justify-center shadow-md">
              <LucideIcons.ShieldAlert className="w-5 h-5" />
            </div>
            {t("security_account")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isEmailUser && (
            <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                  {t("change_password")}
                </div>
                <div className="text-xs text-muted-foreground">
                  ({t("change_password_desc")})
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="p-2 rounded-full bg-muted-foreground/20 text-muted-foreground/80 hover:bg-muted-foreground/80 hover:text-card transition-colors active:scale-95 shadow-md cursor-pointer dark:bg-muted dark:text-muted-foreground"
              >
                <LucideIcons.Lock className="w-5.5 h-5.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                {t("delete_account")}
              </div>
              <div className="text-xs text-muted-foreground">
                ({t("delete_account_desc")})
              </div>
            </div>
            <div
              className="p-2 rounded-full bg-destructive/20 text-destructive/80 hover:bg-destructive/80 hover:text-card transition-colors active:scale-95 shadow-md cursor-pointer"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <LucideIcons.Trash2 className="w-5.5 h-5.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
