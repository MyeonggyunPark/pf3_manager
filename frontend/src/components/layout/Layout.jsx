import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { cn, getIcon } from "../../lib/utils";
import Button from "../ui/Button";
import api from "../../api";

// Sidebar item component with navigation logic
// 네비게이션 로직이 포함된 사이드바 아이템 컴포넌트
const SidebarItem = ({ icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none group mx-2",
        active
            ? "bg-primary-foreground/10 text-white font-bold border-l-4 border-accent"
            : "text-secondary hover:bg-primary-foreground/5 hover:text-white",
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
    const [user] = useState(
        JSON.parse(localStorage.getItem("user_info") || "{}"),
    );
    const navigate = useNavigate();
    const location = useLocation();
    
    // Notification State
    // 알림 관련 상태 관리
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Fetch unpaid courses globally for the notification bell
    // Uses server-side filtering (?is_paid=false) for performance optimization
    // 알림 벨을 위해 전역적으로 미납 수강 데이터를 호출
    // 성능 최적화를 위해 서버 사이드 필터링(?is_paid=false)을 사용함
    useEffect(() => {
        const fetchNotifications = async () => {
            const res = await api.get("/api/courses/?is_paid=false");
            setUnpaidCount(res.data.length);
        };
        fetchNotifications();
        // Update when page changes (optional)
    }, [location.pathname]); 

    // Check if current URL matches the path to highlight sidebar item
    // 현재 URL이 경로와 일치하는지 확인하여 사이드바 아이템을 강조
    const isActive = (path) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    // Logic to determine page title and description based on URL
    // URL을 기반으로 페이지 제목과 설명을 결정하는 로직
    const getPageInfo = () => {
        const path = location.pathname;

        if (path === "/")
        return { title: "Übersicht", desc: "오늘의 일정과 주요 지표" };
        if (path.startsWith("/schedule"))
        return { title: "Stundenplan", desc: "주간 및 월간 수업 일정" };
        if (path.startsWith("/students"))
        return { title: "Schüler", desc: "등록된 학생 목록" };
        if (path.startsWith("/courses"))
        return { title: "Verträge", desc: "수강권 및 결제 관리" };
        if (path.startsWith("/exams"))
        return { title: "Prüfungsergebnisse", desc: "모의고사 및 정규 시험" };
        if (path.startsWith("/settings"))
        return { title: "Einstellungen", desc: "환경설정" };

        return { title: "MyTutor", desc: "" };
    };

    const { title, desc } = getPageInfo();

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
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
            {/* Sidebar Area */}
            {/* 사이드바 영역 */}
            <aside className="w-64 bg-primary text-primary-foreground flex flex-col shadow-2xl z-20">
                <div className="p-6">
                    <h1 className="text-2xl font-extrabold flex items-center gap-2 tracking-tight">
                    <span className="bg-accent text-white rounded-lg p-1 w-8 h-8 flex items-center justify-center text-lg shadow-md">
                        M
                    </span>{" "}
                    MyTutor
                    </h1>
                    <p className="text-[10px] text-secondary mt-2 uppercase tracking-widest font-semibold opacity-80">
                    v1.0.0 (Beta)
                    </p>
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-2">
                    <SidebarItem
                    icon="layout-dashboard"
                    label="대시보드"
                    active={isActive("/")}
                    onClick={() => navigate("/")}
                    />
                    <SidebarItem
                    icon="calendar-days"
                    label="전체 일정"
                    active={isActive("/schedule")}
                    onClick={() => navigate("/schedule")}
                    />
                    <SidebarItem
                    icon="users"
                    label="학생 관리"
                    active={isActive("/students")}
                    onClick={() => navigate("/students")}
                    />
                    <SidebarItem
                    icon="book-open"
                    label="수강 관리"
                    active={isActive("/courses")}
                    onClick={() => navigate("/courses")}
                    />
                    <SidebarItem
                    icon="graduation-cap"
                    label="시험 관리"
                    active={isActive("/exams")}
                    onClick={() => navigate("/exams")}
                    />
                    <div className="pt-4 pb-1 px-3">
                    <p className="text-[10px] uppercase text-secondary font-bold tracking-wider opacity-70">
                        System
                    </p>
                    </div>
                    <SidebarItem
                    icon="settings"
                    label="설정"
                    active={isActive("/settings")}
                    onClick={() => navigate("/settings")}
                    />
                </nav>

                <div className="p-4 border-t border-secondary/20 bg-primary-foreground/5">
                    <div className="flex items-center gap-3 hover:bg-primary-foreground/10 p-2 rounded-lg cursor-pointer transition-colors">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                        {user.name?.[0] || "K"}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">
                        {user.name}
                        </p>
                        <p className="text-xs text-secondary truncate">Admin</p>
                    </div>
                    <LucideIcons.LogOut
                        onClick={handleLogout}
                        className="w-4 h-4 text-secondary hover:text-white transition-colors cursor-pointer"
                    />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 overflow-y-auto relative bg-background">
                <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-primary">
                        {title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {desc}
                        </p>
                    </div>
                    <div className="flex gap-3 relative">
                        {/* Notification Bell with Logic */}
                        {/* 로직이 적용된 알림 벨 */}
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

                        {/* Notification Dropdown */}
                        {/* 알림 드롭다운 메뉴 */}
                        {showNotifications && (
                        <div className="absolute top-12 right-0 w-80 bg-white border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-border">
                            <h4 className="font-bold text-sm">알림</h4>
                            </div>
                            <div className="p-2">
                            {unpaidCount > 0 ? (
                                <div
                                className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                                onClick={() => navigate("/courses")}
                                >
                                <div className="bg-destructive/20 p-1.5 rounded-full text-destructive mt-0.5">
                                    <LucideIcons.AlertCircle className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-destructive">
                                    수강료 미납 알림
                                    </p>
                                    <p className="text-xs text-destructive/80">
                                    현재 <span className="font-bold">{unpaidCount}명</span>의
                                    학생이 미납 상태입니다.
                                    </p>
                                </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                새로운 알림이 없습니다.
                                </div>
                            )}
                            </div>
                        </div>
                        )}
                    </div>
                </header>
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
