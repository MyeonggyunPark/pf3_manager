import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { cn, getIcon } from "../../lib/utils";
import Button from "../ui/Button";
import api from "../../api";


 //SidebarItem component for navigation links
 //네비게이션 링크를 위한 사이드바 아이템 컴포넌트
const SidebarItem = ({ icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none group mx-2",
            active
                ? "bg-primary-foreground/10 text-white font-bold border-l-4 border-accent"
                : "text-white/70 hover:bg-primary-foreground/5 hover:text-white dark:text-secondary-foreground/70 dark:hover:text-white",
        )}
    >
        {getIcon(icon, {
            className: cn(
                "w-4 h-4 transition-transform",
                active ? "" : "group-hover:scale-110",
            ),
        })}
        <span className="text-sm">{label}</span>
    </div>
);

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    // User information state persisted from localStorage
    // localStorage에서 유지되는 유저 정보 상태
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user_info") || "{}"),
    );
    
    // States for unpaid course count and notification dropdown visibility
    // 미납 수강권 개수 및 알림 드롭다운 표시 상태
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Reference for the notification area to detect outside clicks
    // 외부 클릭 감지를 위한 알림 영역 참조(Ref)
    const notificationRef = useRef(null);

    // Theme persistence logic added to Layout to prevent theme flickering on refresh
    // 새로고침 시 테마 풀림 현상을 방지하기 위해 Layout에 테마 유지 로직 추가
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        
        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    
     // Check if a specific path is currently active for styling
     // 스타일 적용을 위해 특정 경로가 현재 활성화되어 있는지 확인
    const isActive = (path) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    
    // Determine page title and description based on current URL path
    // 현재 URL 경로에 따라 페이지 제목과 설명을 결정
    const getPageInfo = () => {
        const path = location.pathname;

        if (path === "/")
            return { title: "Dashboard", desc: "실시간 수업 현황 및 주요 지표" };
        if (path.startsWith("/schedule"))
            return { title: "Terminkalender", desc: "주간 및 월간 수업 일정 관리" };
        if (path.startsWith("/students"))
            return { title: "Schülerverwaltung", desc: "학생 정보 및 이력 관리" };
        if (path.startsWith("/courses"))
            return { title: "Vertragsübersicht", desc: "수강권 등록 현황 및 결제 상태" };
        if (path.startsWith("/exams"))
            return { title: "Testergebnisse", desc: "모의고사 및 정규 시험 분석 리포트" };
        if (path.startsWith("/settings"))
            return { title: "Einstellungen", desc: "개인 프로필 및 시스템 설정" };

        return { title: "MS Planer", desc: "" };
    };

    const { title, desc } = getPageInfo();

    

    // Automatically close the notification dropdown when the URL path changes
    // URL 경로가 변경될 때 알림 드롭다운을 자동으로 닫음
    useEffect(() => {
        setShowNotifications(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Close notification dropdown when clicking outside of the reference area
    // 참조 영역 바깥을 클릭할 때 알림 드롭다운을 닫음
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setShowNotifications(false);
            }
        };
        if (showNotifications) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [showNotifications]);

    // Sync the latest user profile information from the backend
    // 백엔드로부터 최신 유저 프로필 정보를 동기화
    useEffect(() => {
        const fetchLatestUser = async () => {
            try {
                const res = await api.get("/api/auth/user/");
                setUser(res.data);
            } catch (e) {
                console.error("Layout user fetch failed", e);
            }
        };
        fetchLatestUser();
    }, [location.pathname]);

    // Fetch the count of unpaid courses for the notification badge
    // 알림 배지를 위해 미납된 수강권 개수를 조회
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await api.get("/api/courses/?is_paid=false");
                setUnpaidCount(res.data.length);
            } catch (e) {
                console.error(e);
            }
        };
        fetchNotifications();
    }, [location.pathname]);

    // Clear session data and redirect to the login page on logout
    // 로그아웃 시 세션 데이터를 삭제하고 로그인 페이지로 리다이렉트
    const handleLogout = async () => {
        try {
            await api.post("/api/auth/logout/");
        } catch (e) {
            console.error(e);
        }
        localStorage.removeItem("user_info");
        localStorage.removeItem("is_logged_in");
        window.location.href = "/login";
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">

            {/* Sidebar Section */}
            {/* 사이드바 섹션 */}
            <aside className="w-64 bg-primary dark:bg-card text-white dark:text-card-foreground flex flex-col shadow-2xl z-20 border-r border-transparent dark:border-border transition-colors duration-300">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        
                        {/* Application Logo Container */}
                        {/* 애플리케이션 로고 컨테이너 */}
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-200 flex items-center justify-center shadow-inner overflow-hidden shrink-0 border-3 border-muted dark:border-accent">
                            <img src="/logo.svg" alt="MS Planer Logo" className="w-7 h-7" />
                        </div>
                        <h1 className="text-xl font-black tracking-tighter text-white dark:text-primary">MS Planer</h1>
                    </div>
                    <p className="text-[10px] text-white/60 mt-2 uppercase tracking-widest font-semibold opacity-80 dark:text-muted-foreground">
                        v1.0.0 (Beta)
                    </p>
                </div>

                {/* Main Navigation Menu */}
                {/* 메인 네비게이션 메뉴 */}
                <nav className="flex-1 px-3 space-y-1 mt-2">
                    <SidebarItem icon="layout-dashboard" label="대시보드" active={isActive("/")} onClick={() => navigate("/")} />
                    <SidebarItem icon="calendar-days" label="일정 관리" active={isActive("/schedule")} onClick={() => navigate("/schedule")} />
                    <SidebarItem icon="users" label="학생 관리" active={isActive("/students")} onClick={() => navigate("/students")} />
                    <SidebarItem icon="CreditCard" label="수강 관리" active={isActive("/courses")} onClick={() => navigate("/courses")} />
                    <SidebarItem icon="graduation-cap" label="시험 관리" active={isActive("/exams")} onClick={() => navigate("/exams")} />
                    <div className="pt-4 pb-1 px-3">
                        <p className="text-[10px] uppercase text-white/50 font-bold tracking-wider opacity-70 dark:text-muted-foreground">System</p>
                    </div>
                    <SidebarItem icon="settings" label="설정" active={isActive("/settings")} onClick={() => navigate("/settings")} />
                </nav>

                {/* User Profile and Logout Footer Section */}
                {/* 유저 프로필 및 로그아웃 하단 섹션 */}
                <div className="p-4 border-t border-white/10 dark:border-border bg-white/5 dark:bg-primary-foreground/5">
                    <div className="flex items-center gap-3 p-2 rounded-lg transition-colors group">

                        {/* User Profile Image Wrapper */}
                        {/* 유저 프로필 이미지 래퍼 */}
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-200 flex items-center justify-center shadow-inner overflow-hidden shrink-0 border-2 border-accent">
                            <img src="/icons/tutor-icon.png" alt="Tutor" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-white dark:text-foreground truncate leading-none">
                                {user.name}
                            </p>
                        </div>

                        {/* Logout Button with tactile feedback */}
                        {/* 촉각적 피드백이 포함된 로그아웃 버튼 */}
                        <button 
                            onClick={handleLogout}
                            className={cn(
                                "p-1.5 rounded-md transition-all duration-200 cursor-pointer outline-none",
                                "text-white/60 hover:bg-white/10 hover:text-white hover:scale-110 dark:text-muted-foreground dark:hover:bg-primary/10",
                                "active:scale-90 active:bg-white/20 active:duration-75"
                            )}
                            title="로그아웃"
                        >
                            <LucideIcons.LogOut className="w-5.5 h-5.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Content Area and Header */}
            {/* 콘텐츠 영역 및 헤더 */}
            <main className="flex-1 overflow-y-auto relative bg-background transition-colors duration-300">
                <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-primary">{title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>

                    {/* Header Notification and Actions */}
                    {/* 헤더 알림 및 액션 */}
                    <div ref={notificationRef} className="flex gap-3 relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground relative cursor-pointer"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <LucideIcons.Bell className="w-5 h-5" />
                            {unpaidCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-destructive rounded-full ring-2 ring-background animate-pulse"></span>
                            )}
                        </Button>

                        {/* Notification Dropdown Content */}
                        {/* 알림 드롭다운 내용 */}
                        {showNotifications && (
                            <div className="absolute top-12 right-0 w-80 bg-card text-card-foreground border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-4 border-b border-border">
                                    <h4 className="font-bold text-sm">알림</h4>
                                </div>
                                <div className="p-2">
                                    {unpaidCount > 0 ? (
                                        <div
                                            className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate("/courses", { state: { view: "unpaid_all" } });
                                            }}
                                        >
                                            <div className="bg-destructive/20 p-1.5 rounded-full text-destructive mt-0.5">
                                                <LucideIcons.AlertCircle className="w-4 h-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-destructive">수강료 미납 알림</p>
                                                <p className="text-xs text-destructive/80">
                                                    현재 <span className="font-bold">{unpaidCount}명</span>의 학생이 미납 상태입니다.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-sm text-muted-foreground">새로운 알림이 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </header>
                
                {/* Nested Route Content Rendering */}
                {/* 중첩된 라우트 콘텐츠 렌더링 */}
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}