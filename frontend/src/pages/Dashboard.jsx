import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { cn, getIcon } from "../lib/utils";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

// StatCard Component
// 통계 카드 컴포넌트
const StatCard = ({ title, value, trend, icon, color }) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
        </CardTitle>
            <div
                className={`p-2 rounded-lg ${
                color === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent"
                }`}
            >
                {getIcon(icon, { className: "h-4 w-4" })}
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-extrabold text-slate-800">{value}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{trend}</p>
        </CardContent>
    </Card>
);

export default function Dashboard() {
    const navigate = useNavigate();

    // Initialize stats with default values to prevent undefined errors
    // undefined 에러 방지를 위해 통계 상태 초기값 설정
    const [stats, setStats] = useState({
        estimated_revenue: 0,
        current_revenue: 0,
        active_students: 0,
        monthly_lesson_count: 0,
    });

    const [todayLessons, setTodayLessons] = useState([]);
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [totalExamCount, setTotalExamCount] = useState(0);

    // Fetch initial dashboard data
    // 초기 대시보드 데이터 호출
    useEffect(() => {
        const load = async () => {
        try {
            // Parallel API calls for performance
            // 성능을 위해 API 병렬 호출
            const [s, t, e] = await Promise.all([
                api.get("/api/dashboard/stats/"),
                api.get("/api/lessons/today/"),
                api.get("/api/official-results/"),
            ]);

            // Set Dashboard Statistics (Revenue, Students, etc.)
            // 대시보드 통계 설정 (수익, 학생 수 등)
            setStats(s.data);

            setTodayLessons(t.data);

            // Normalize current time to 00:00:00 for accurate date comparison
            // 정확한 날짜 비교를 위해 현재 시간을 00:00:00으로 정규화
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Filter future exams and sort by date ascending
            // 미래 시험 일정 필터링 및 날짜 오름차순 정렬
            const futureExams = e.data
            .filter((exam) => {
                const examDate = new Date(exam.exam_date);
                examDate.setHours(0, 0, 0, 0);
                return examDate >= today;
            })
            .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

            // Store total count and slice top 3
            // 전체 개수 저장 및 상위 3개 추출
            setTotalExamCount(futureExams.length);
            setUpcomingExams(futureExams.slice(0, 3));
        } catch (e) {
            console.error("Dashboard Data Load Failed:", e);
        }
        };
        load();
    }, []);

    // Helper function to format currency (Euro)
    // 화폐 단위(유로) 포맷팅 헬퍼 함수
    const formatEuro = (amount) => {
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
        }).format(amount || 0);
    };

    const todayDate = new Date().toLocaleDateString("de-DE", {
    month: "long",
    day: "numeric",
    });

    // Calculate D-Day based on date only
    // 날짜 기준으로 D-Day 계산
    const getDDay = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateString);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "D-Day";
        return `D-${diffDays}`;
    };

    // Extract day and month for calendar UI
    // 캘린더 UI를 위한 일(Day)과 월(Month) 추출
    const getExamDateBox = (dateString) => {
        const date = new Date(dateString);
        const month = date
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase();
        const day = date.getDate();
        return { day, month };
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Upcoming Exams Section */}
            {/* 다가오는 시험 일정 섹션 */}
            {upcomingExams.length > 0 ? (
                <div className="space-y-3">
                {/* Header with Total Count */}
                {/* 전체 개수가 포함된 헤더 */}
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <LucideIcons.GraduationCap className="w-5 h-5 text-primary" />
                        예정된 정규 시험
                        <Badge
                            variant="secondary"
                            className="text-xs px-1.5 h-5 bg-slate-100 text-slate-600"
                        >
                            Total {totalExamCount}
                        </Badge>
                    </h3>
                    {totalExamCount > 3 && (
                        <span
                            className="text-[14px] text-muted-foreground cursor-pointer hover:font-semibold"
                            onClick={() =>
                            navigate("/exams", { state: { tab: "official" } })
                            }
                        >
                            전체 보기 →
                        </span>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {upcomingExams.map((exam) => {
                    const { day, month } = getExamDateBox(exam.exam_date);
                    const dDayStr = getDDay(exam.exam_date);
                    const daysLeft = parseInt(dDayStr.replace("D-", ""));

                    // Determine urgency: Red (Today) vs Yellow (Within 7 days)
                    // 긴급도 판별: 빨강 (당일) vs 노랑 (7일 이내)
                    const isToday = dDayStr === "D-Day";
                    const isUrgent = !isNaN(daysLeft) && daysLeft <= 7;

                    // Default styles (Gray)
                    // 기본 스타일 (회색)
                    let boxColorClass = "bg-slate-50 border-slate-200 text-slate-500";
                    let badgeColorClass = "bg-primary/10 text-primary";

                    // Apply color logic based on urgency
                    // 긴급도에 따른 색상 로직 적용
                    if (isToday) {
                        boxColorClass =
                        "bg-destructive/10 border-destructive/20 text-destructive";
                        badgeColorClass = "bg-destructive text-white";
                    } else if (isUrgent) {
                        boxColorClass =
                        "bg-warning/10 border-warning/20 text-[#C1AA60]";
                        badgeColorClass = "bg-warning text-white";
                    }

                    return (
                        <div
                        key={exam.id}
                        className="relative flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                        >
                        {/* Left: Date Box */}
                        {/* 좌측: 날짜 박스 */}
                        <div
                            className={cn(
                            "flex flex-col items-center justify-center min-w-12.5 h-12.5 rounded-lg border",
                            boxColorClass,
                            )}
                        >
                            <span className="text-[10px] font-bold leading-none">
                                {month}
                            </span>
                            <span className="text-xl font-extrabold leading-none mt-0.5">
                                {day}
                            </span>
                        </div>

                        {/* Center: Info */}
                        {/* 중앙: 시험 정보 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                    {exam.student_name}
                                </p>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                    "text-[10px] h-5 px-1.5 font-bold",
                                    badgeColorClass,
                                    )}
                                >
                                    {dDayStr}
                                </Badge>
                            </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {exam.exam_standard_name || exam.exam_name_manual}
                                </p>
                            </div>
                        </div>
                    );
                    })}
                    </div>
                </div>
            ) : (
                // Empty State: No exams scheduled
                // 빈 상태: 예정된 시험 없음
                <div className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <LucideIcons.GraduationCap className="w-6.5 h-6.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                    예정된 정규 시험이 없습니다
                </h3>
                </div>
            )}

            {/* Main Content Area */}
            {/* 메인 콘텐츠 영역 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 lg:col-span-5 border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <LucideIcons.Calendar className="w-5 h-5 text-accent" /> 
                            오늘의 수업
                        </CardTitle>
                        <Badge variant="secondary" className="text-primary font-bold">
                            {todayDate}
                        </Badge>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {todayLessons.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            오늘 예정된 수업이 없습니다.
                        </div>
                        ) : (
                        todayLessons.map((lesson) => (
                            <div
                            key={lesson.id}
                            className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4 hover:border-accent hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                    className={cn(
                                        "flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-sm font-bold",
                                        lesson.status === "COMPLETED"
                                        ? "bg-accent/10 border-accent text-accent"
                                        : "bg-white border-border text-muted-foreground",
                                    )}
                                    >
                                        <span>{lesson.start_time.split(":")[0]}</span>
                                        <span className="text-[10px] opacity-70">
                                            {lesson.start_time.split(":")[1]}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-700 group-hover:text-primary transition-colors">
                                            {lesson.student_name}
                                            </p>
                                            {lesson.topic && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] h-5 px-1.5 bg-white max-w-37.5 truncate"
                                            >
                                                {lesson.topic}
                                            </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {lesson.memo || "메모 없음"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                    "rounded-full",
                                    lesson.status === "COMPLETED"
                                        ? "text-accent bg-accent/10"
                                        : "text-muted-foreground hover:text-accent hover:bg-background",
                                    )}
                                >
                                    <LucideIcons.CheckCircle2 className="w-6 h-6" />
                                </Button>
                            </div>
                        ))
                        )}
                    </CardContent>
                </Card>

                {/* Right Sidebar: Stats & Quick Actions */}
                {/* 우측 사이드바: 통계 및 빠른 실행 */}
                <div className="col-span-4 lg:col-span-2 space-y-6">
                    <StatCard
                        title="이번 달 예상 수익"
                        value={formatEuro(stats?.estimated_revenue) || 0}
                        trend={`입금 완료: ${formatEuro(stats?.current_revenue) || 0}`}
                        icon="TrendingUp"
                        color="primary"
                    />
                    <StatCard
                        title="진행 중인 학생"
                        value={`${stats?.active_students || 0}명`}
                        trend={`이번 달 수업: ${stats?.monthly_lesson_count || 0}회`}
                        icon="Users"
                        color="accent"
                    />
                    <Card className="bg-linear-to-br from-[#4C72A9] to-[#3b5b8a] text-white border-none shadow-lg">
                        <CardHeader>
                        <CardTitle className="text-sm text-white">빠른 실행</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        <Button
                            variant="secondary"
                            className="w-full justify-start h-11"
                            onClick={() => console.log("Open Add Lesson Modal")}
                        >
                            <LucideIcons.PlusCircle className="mr-2 h-4 w-4" /> 수업 일지 작성
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full justify-start bg-white text-primary hover:bg-white/90 h-11"
                            onClick={() => console.log("Open Add Student Modal")}
                        >
                            <LucideIcons.UserPlus className="mr-2 h-4 w-4" /> 학생 추가
                        </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
