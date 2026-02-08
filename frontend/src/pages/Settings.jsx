import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import api from "../api";
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
            계정삭제 완료
          </h3>

          <p className="text-slate-400 dark:text-muted-foreground text-center mb-6 text-sm leading-relaxed">
            그동안 서비스를 이용해 주셔서 감사합니다.
          </p>

          <Button
            onClick={onConfirm}
            className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
          >
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const DeletionErrorModal = ({ isOpen, onClose }) => {
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
            삭제 실패
          </h3>

          <p className="text-sm text-center text-slate-500 dark:text-muted-foreground mb-8">
            계정 삭제 중 오류가 발생했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>

          <Button
            onClick={onClose}
            className="w-full bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 h-11 font-semibold text-sm transition-all cursor-pointer"
          >
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function Settings() {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 1st Step: Confirmation (1단계: 확인)
  const [showSuccessModal, setShowSuccessModal] = useState(false); // 2nd Step: Success (2단계: 성공)
  const [showErrorModal, setShowErrorModal] = useState(false); // 2nd Step: Error (2단계: 실패)
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Success: Close confirm modal, Open success modal
      // 성공: 확인 모달 닫기, 성공 모달 열기
      setShowDeleteConfirm(false);
      setShowSuccessModal(true);
    } catch (e) {
      console.error("Delete failed", e);

      // Failure: Close confirm modal, Open error modal
      // 실패: 확인 모달 닫기, 에러 모달 열기
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
      default: // 'email'
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

      {/* Invoice Settings Modal */}
      {/* 영수증 설정 모달 */}
      <InvoiceSettingsModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => {
          // Optional: Show a toast notification or just close
          // 선택사항: 토스트 알림 표시 또는 단순 닫기
          // console.log("Business Profile Updated");
        }}
      />

      {/* Account Deletion Modals */}
      {/* 계정 삭제 관련 모달 컴포넌트 */}
      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />

      {/* Deletion Success Modal (Custom Popup) */}
      {/* 삭제 성공 모달 (커스텀 팝업) */}
      <DeletionSuccessModal
        isOpen={showSuccessModal}
        onConfirm={handleFinalRedirect}
      />

      {/* Deletion Error Modal (Custom Popup) */}
      {/* 삭제 실패 모달 (커스텀 팝업) */}
      <DeletionErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />

      {/* Profile Overview */}
      {/* 프로필 개요 */}
      <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-card">
        <CardHeader className="flex-row items-center gap-6 space-y-0 relative z-10 py-7">
          <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center text-primary shadow-lg border-4 border-muted dark:border-accent overflow-hidden dark:bg-slate-200">
            <img
              src="/icons/tutor-icon.png"
              alt="선생님 프로필 아이콘"
              className="w-13 h-13 object-contain"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-foreground">
                {user.name}
              </CardTitle>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeInfo.className}`}
              >
                {badgeInfo.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground/90 font-medium">
              {user.email}
            </p>
          </div>

          <Button
            onClick={() => setIsProfileModalOpen(true)}
            variant="default"
            className="w-full xl:w-auto h-10 px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
          >
            <LucideIcons.Edit3 className="w-4 h-4 mr-2" /> 정보 수정
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
            사업자 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                정보 관리
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                (영수증 발행을 위한 사업자 정보를 설정하세요.)
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
            시스템 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                화면 모드
              </div>
              <div className="text-xs text-muted-foreground">
                (활성화 모드:{" "}
                {isDarkMode ? (
                  <span className="font-semibold">다크 모드</span>
                ) : (
                  <span className="font-semibold">라이트 모드</span>
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
            보안 및 계정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* password change for non-social login users */}
          {/* 비소셜 로그인 사용자의 비밀번호 변경 */}
          {isEmailUser && (
            <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                  비밀번호 변경
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  (보안을 위해 주기적으로 변경하세요.)
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

          {/* account deletion */}
          {/* 계정 삭제 */}
          <div className="flex items-center justify-between px-4 py-3 border-2 border-muted-foreground/10 dark:border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-foreground/80 dark:text-foreground">
                계정 삭제
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                (모든 데이터가 영구적으로 삭제됩니다.)
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
