import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import api from "../api";
import { cn } from "../lib/utils";
import { 
    RESPONSIVE_GAP, 
    RESPONSIVE_GRID, 
    RESPONSIVE_TEXT,
} from "../lib/responsiveStyles";
import {
    Card,
    CardHeader,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { TabsList, TabsTrigger } from "../components/ui/Tabs";
import AddStudentModal from "../components/modals/AddStudentModal";
import AddLessonModal from "../components/modals/AddLessonModal";
import AddOfficialExamModal from "../components/modals/AddOfficialExamModal";
import AddTodoModal from "../components/modals/AddTodoModal";

export default function Dashboard() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const navigate = useNavigate();
    
    // Translation hook for localized UI text
    // 다국어 UI 텍스트를 위한 번역 훅
    const { t } = useTranslation();

    // Language condition for style branching
    // 언어별 스타일 분기 조건
    const isGerman = i18n.resolvedLanguage?.startsWith("de");

    // Initialize stats with default values to prevent undefined errors
    // undefined 에러 방지를 위해 통계 상태 초기값 설정
    const [stats, setStats] = useState({
        estimated_revenue: 0,
        current_revenue: 0,
        active_students: 0,
        monthly_lesson_count: 0,
    });

    // States for managing lesson tabs (today/tomorrow)
    // 수업 탭(오늘/내일) 관리 및 데이터 상태
    const [todayLessons, setTodayLessons] = useState([]);
    const [tomorrowLessons, setTomorrowLessons] = useState([]); 
    const [activeTab, setActiveTab] = useState("today"); 

    // States for upcoming exams
    // 다가오는 시험 일정 관리 상태
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [totalExamCount, setTotalExamCount] = useState(0);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);

    // State for todo list
    // 할 일 목록 상태
    const [todos, setTodos] = useState([]);

    // Modal Visibility State
    // 모달 표시 상태 관리
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

    // State for selected lesson to edit
    // 수정할 수업 선택 상태 관리
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedTodo, setSelectedTodo] = useState(null);

    // currencyDate calculation
    // 현재 날짜 계산 로직 
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Calculate revenue percentage for progress bar
    // 진행률 표시줄을 위한 수익 비율 계산
    const revenuePercentage = stats.estimated_revenue > 0
        ? Math.min(Math.round((stats.current_revenue / stats.estimated_revenue) * 100), 100)
        : 0;

    // Function to open modal in edit mode
    // 수정 모드로 모달을 여는 함수
    const openEditModal = (lesson) => {
        setSelectedLesson(lesson);
        setIsLessonModalOpen(true);
    };

    // Function to open modal in create mode
    // 생성 모드로 모달을 여는 함수
    const openCreateModal = () => {
        setSelectedLesson(null);
        setIsLessonModalOpen(true);
    };

    // Function to open exam modal in edit mode
    // 수정 모드로 시험 모달을 여는 함수
    const openExamModal = (exam) => {
        setSelectedExam(exam);
        setIsExamModalOpen(true);
    };

    // Function to open todo modal in create mode
    // 생성 모드로 할 일 모달을 여는 함수
    const openCreateTodoModal = () => {
        setSelectedTodo(null); 
        setIsTodoModalOpen(true);
    };

    // Function to open todo modal in edit mode
    // 수정 모드로 할 일 모달을 여는 함수
    const openTodoEditModal = (todo) => {
        setSelectedTodo(todo);
        setIsTodoModalOpen(true); 
    };

    // Function to toggle todo completion status
    // 할 일 완료 상태 토글 함수
    const handleToggleTodo = async (todo) => {
        try {
            await api.patch(`/api/todos/${todo.id}/`, {
                is_completed: !todo.is_completed,
            });
            setRefreshTrigger((prev) => prev + 1);
        } catch (e) {
            console.error("Toggle Todo Error:", e);
        }
    };

    // Fetch initial dashboard data
    // 초기 대시보드 데이터 호출
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Parallel API calls for performance
                // 성능을 위해 API 병렬 호출
                const [s, t, e, todoRes] = await Promise.all([
                    api.get("/api/dashboard/stats/"),
                    api.get("/api/lessons/today/"),
                    api.get("/api/official-results/"),
                    api.get("/api/todos/"),
                ]);

                // Update state with fetched data
                // 가져온 데이터로 상태 업데이트
                setStats(s.data);
                
                // Set state for today and tomorrow lessons
                // 오늘 및 내일 수업 데이터 상태 설정
                setTodayLessons(t.data);
                setTomorrowLessons(s.data.tomorrow_lessons || []);

                // Set todos
                // 할 일 데이터 설정
                setTodos(todoRes.data);

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
        fetchDashboardData();
    }, [refreshTrigger]);

    // Helper function to format currency (Euro)
    // 화폐 단위(유로) 포맷팅 헬퍼 함수
    const formatEuro = (amount) => {
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
        }).format(amount || 0);
    };

    // Date Helpers to get formatted date strings
    // 날짜 포맷팅을 위한 헬퍼 함수들
    const getFormattedDate = (addDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + addDays);
        return date.toLocaleDateString("de-DE", {
            month: "long",
            day: "numeric",
        });
    };

    const todayDate = getFormattedDate(0);
    const tomorrowDate = getFormattedDate(1);

    // Logic to determine which lessons and date to display based on active tab
    // 활성 탭에 따라 표시할 수업 데이터와 날짜를 결정하는 로직
    const displayLessons = activeTab === "today" ? todayLessons : tomorrowLessons;
    const displayDate = activeTab === "today" ? todayDate : tomorrowDate;
    const emptyMessage = activeTab === "today" 
        ? t("dashboard_lessons_empty_today") 
        : t("dashboard_lessons_empty_tomorrow");

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

    // Calculate D-Day and styling for Todo items
    // 할 일 항목을 위한 D-Day 계산 및 스타일링 로직
    const getTodoDDay = (dateString, isCompleted) => {
        if (!dateString) return null;
        if (isCompleted) return null;

        const [year, month, day] = dateString.split("-").map(Number);
        const target = new Date(year, month - 1, day);
        const today = new Date();
        target.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0)
            return { text: "D-Day", color: "bg-destructive/10 text-destructive border-destructive/20" };
        if (diffDays > 0 && diffDays <= 7)
            return { text: `D-${diffDays}`, color: "bg-warning/30 text-yellow-500 border-warning/30 dark:text-warning" };
        if (diffDays > 0)
            return { text: `D-${diffDays}`, color: "bg-slate-50 text-slate-400 border-slate-100 dark:bg-muted dark:text-muted-foreground dark:border-border" };
        return { text: t("dashboard_due_overdue"), color: "bg-slate-600 text-white border-slate-700 font-medium dark:bg-slate-800" };
    };

    // Format todo date string (YYYY-MM-DD -> DD.MM.YYYY)
    // 할 일 날짜 문자열 포맷팅
    const formatTodoDate = (dateString) => {
        if (!dateString) return "";
        const [year, month, day] = dateString.split("-");
        return `${day}.${month}.${year}`;
    };

    // Styles for lesson status badges
    // 수업 상태 배지를 위한 스타일 정의
    const statusStyles = {
        SCHEDULED:
        "border-warning/60 bg-warning/20 hover:border-warning hover:shadow-md dark:border-warning/40 dark:bg-warning/10",
        COMPLETED:
        "border-accent/60 bg-accent/30 hover:border-accent hover:shadow-md dark:border-accent/40 dark:bg-accent/10",
        CANCELLED: "border-slate-300 bg-slate-200 hover:border-slate-700 hover:shadow-md dark:border-border dark:bg-muted",
        NOSHOW:
        "border-destructive/60 bg-destructive/30 hover:border-destructive hover:shadow-md dark:border-destructive/40 dark:bg-destructive/10",
    };

    // Icons mapping for lesson status
    // 수업 상태별 아이콘 매핑
    const statusIcons = {
        SCHEDULED: <LucideIcons.Clock className="w-5.5 h-5.5 text-warning" />,
        COMPLETED: <LucideIcons.CheckCircle2 className="w-6 h-6 text-accent" />,
        CANCELLED: <LucideIcons.XCircle className="w-6 h-6 text-slate-400 dark:text-muted-foreground" />,
        NOSHOW: <LucideIcons.AlertCircle className="w-6 h-6 text-destructive" />,
    };

    // Filter and sort urgent todos
    // 긴급 할 일 필터링 및 정렬
    const urgentTodos = todos
        .filter((t) => !t.is_completed && t.priority === 1)
        .sort((a, b) => {
            const dateA = new Date(a.due_date || "9999-12-31");
            const dateB = new Date(b.due_date || "9999-12-31");
            const diff = dateA - dateB;

            if (diff !== 0) return diff;

            return b.id - a.id;
        })
        .slice(0, 6);
    
    // Priority labels
    // 우선순위 라벨 정의
    const priorityLabels = {
        1: t("dashboard_priority_high"),
        2: t("dashboard_priority_medium"),
        3: t("dashboard_priority_low"),
    };
    // Priority badge colors
    // 우선순위 배지 색상 정의
    const priorityBadgeColors = {
        1: "bg-destructive text-white border-destructive",
        2: "bg-warning text-white border-warning",
        3: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-muted dark:text-muted-foreground dark:border-border",
    };

    // Priority border colors for todo items
    // 할 일 항목의 우선순위 테두리 색상
    const priorityBorderColors = {
        1: "border-l-4 border-l-destructive",
        2: "border-l-4 border-l-warning",
        3: "border-l-4 border-l-slate-300 dark:border-l-border",
    };

    return (
        <div className={cn("space-y-4 md:space-y-6 animate-in")}>
            
            {/* Edit Official Exam Modal */}
            {/* 정규 시험 수정 모달 */}
            <AddOfficialExamModal
                isOpen={isExamModalOpen}
                onClose={() => setIsExamModalOpen(false)}
                examData={selectedExam}
                onSuccess={() => {
                setRefreshTrigger(prev => prev + 1);
                }}
            />

            {/* Add Lesson Modal - connected with selectedLesson for edit mode */}
            {/* 수업 추가 모달 - 수정 모드를 위해 selectedLesson과 연결됨 */}
            <AddLessonModal
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                onSuccess={() => {
                setRefreshTrigger((prev) => prev + 1);
                }}
                lessonData={selectedLesson}
            />

            {/* Add Student Modal */}
            {/* 학생 추가 모달 */}
            <AddStudentModal
                isOpen={isStudentModalOpen}
                onClose={() => setIsStudentModalOpen(false)}
                onSuccess={() => {
                setRefreshTrigger((prev) => prev + 1);
                }}
            />

            {/* Add/Edit Todo Modal */}
            {/* 할 일 추가/수정 모달 */}
            <AddTodoModal
                isOpen={isTodoModalOpen}
                onClose={() => setIsTodoModalOpen(false)}
                todoData={selectedTodo}
                onSuccess={() => {
                setRefreshTrigger((prev) => prev + 1); 
                }}
            />

            {/* Upcoming Exams Section */}
            {/* 다가오는 시험 일정 섹션 */}
            {upcomingExams.length > 0 ? (
            <div className={cn(RESPONSIVE_GAP.sm, "space-y-3")}>

                {/* Header with Total Count */}
                {/* 전체 개수가 포함된 헤더 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-1">
                    <div className="flex items-center gap-2">
                        <TabsList className="text-sm font-bold flex items-center dark:bg-muted/50">
                            <TabsTrigger className="cursor-default" value="upcoming" activeValue="upcoming">
                                {t("dashboard_exam_upcoming_title")}    
                            </TabsTrigger>
                        </TabsList>
                        <Badge
                            variant="secondary"
                            className="text-xs px-1.5 h-5 bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground"
                            >
                            Total {totalExamCount}
                        </Badge> 
                    </div>
                    {totalExamCount > 3 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 sm:h-8 text-xs rounded-full px-2.5 sm:px-3 text-muted-foreground/70 cursor-pointer hover:bg-muted"
                            onClick={() => navigate("/exams", { state: { tab: "official" } })}
                        >
                            {t("dashboard_view_all")}
                        </Button>
                    )}
                </div>

                <div className={cn(RESPONSIVE_GRID.cols3)}>
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
                        let boxColorClass = "bg-slate-50 border-slate-200 text-slate-500 dark:bg-muted dark:border-border dark:text-muted-foreground";
                        let badgeColorClass = "bg-primary/10 text-primary";

                        // Apply color logic based on urgency
                        // 긴급도에 따른 색상 로직 적용
                        if (isToday) {
                            boxColorClass =
                            "bg-destructive/10 border-destructive/20 text-destructive";
                            badgeColorClass = "bg-destructive text-white";
                        } else if (isUrgent) {
                            boxColorClass =
                            "bg-warning/10 border-warning/20 text-[#C1AA60] dark:text-warning";
                            badgeColorClass = "bg-warning text-white";
                        }

                        // Exam Mode Labels & Colors
                        // 응시 유형 라벨 및 색상 정의
                        const modeLabel = {
                            FULL: "Gesamt",
                            WRITTEN: "Schriftlich",
                            ORAL: "Mündlich",
                        }[exam.exam_mode] || "Gesamt";
                            
                        return (
                            <div
                                key={exam.id}
                                onClick={() => openExamModal(exam)}
                                className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-sm hover:shadow-md hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-muted/50 transition-all cursor-pointer group"
                                >
                                {/* Left: Date Box */}
                                {/* 측: 날짜 박스 */}
                                <div
                                    className={cn(
                                    "flex flex-col items-center justify-center min-w-11 sm:min-w-12.5 h-11 sm:h-12.5 rounded-lg border",
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
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-foreground truncate group-hover:text-primary transition-colors">
                                                {exam.student_name}
                                            </p>
                                            {exam.student_level && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] h-5 px-1.5 rounded-md border-primary/30 text-primary bg-white dark:bg-card font-semibold shrink-0"
                                            >
                                                {exam.student_level}
                                            </Badge>
                                            )}
                                        </div>
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
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-[13px] text-muted-foreground truncate max-w-25 lg:max-w-none">
                                            {exam.exam_standard_name || exam.exam_name_manual}
                                        </p>
                                            <Badge 
                                                variant="outline"
                                                className="text-[10px] h-5 px-1.5 rounded-md border-primary/30 text-primary bg-white dark:bg-card font-semibold shrink-0"
                                            >
                                                {modeLabel}
                                            </Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            // Empty State: No exams scheduled
            // 빈 상태: 예정된 시험 없음
            <div className="w-full rounded-xl border-none bg-white dark:bg-card p-8 flex flex-col items-center justify-center text-center text-muted-foreground/70 gap-2">
                <LucideIcons.SearchX className="w-8 h-8" />
                <h3 className="text-sm font-semibold">
                    {t("dashboard_exam_empty")}
                </h3>
            </div>
        )}

            {/* Main Content Area */}
            {/* 메인 콘텐츠 영역 */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-12">
                
                {/* Left Content*/}
                {/* 좌측 콘텐츠: 오늘/내일 수업 탭 */ }
                <Card className="col-span-1 md:col-span-2 lg:col-span-6 border-none shadow-sm flex flex-col h-full bg-white dark:bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div className="flex items-center">
                            <TabsList className="dark:bg-muted/50">
                                <TabsTrigger value="today" activeValue={activeTab} onClick={() => setActiveTab("today")}>
                                    {t("dashboard_lessons_today")}
                                </TabsTrigger>
                                <TabsTrigger value="tomorrow" activeValue={activeTab} onClick={() => setActiveTab("tomorrow")}>
                                    {t("dashboard_lessons_tomorrow")}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <Badge variant="secondary" className="text-primary font-bold bg-primary/10">
                            {displayDate}
                        </Badge>
                    </CardHeader>
                    <CardContent 
                        className={cn(
                            "h-110 custom-scrollbar",
                            displayLessons.length === 0 
                                ? "flex flex-col items-center justify-center" 
                                : "grid gap-4 content-start"
                        )}
                    >
                        {displayLessons.length === 0 ? (
                            <div className="text-center text-muted-foreground/70 flex flex-col items-center justify-center gap-2">
                                <LucideIcons.SearchX className="w-8 h-8" />
                                <h3 className="text-sm font-semibold">{emptyMessage}</h3>
                            </div>
                        ) : (
                            displayLessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    onClick={() => openEditModal(lesson)}
                                    className={cn(
                                        "flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer group",
                                        
                                        // Apply dynamic styles based on lesson status
                                        // 수업 상태에 따른 동적 스타일 적용
                                        statusStyles[lesson.status] || statusStyles.SCHEDULED,
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-sm font-bold bg-white dark:bg-muted/50 border-border text-muted-foreground">
                                            <span>{lesson.start_time.split(":")[0]}</span>
                                            <span className="text-[10px] opacity-70">{lesson.start_time.split(":")[1]}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-700 dark:text-foreground group-hover:text-primary transition-colors">
                                                    {lesson.student_name}
                                                </p>
                                                {lesson.student_level && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-md border-primary/30 text-primary bg-white dark:bg-card font-semibold shrink-0">
                                                        {lesson.student_level}
                                                    </Badge>
                                                )}
                                                {lesson.topic && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-white dark:bg-card max-w-37.5 truncate border-slate-200 dark:border-border text-muted-foreground">
                                                        {lesson.topic}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-0.5">{lesson.memo || t("dashboard_no_memo")}</p>
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {statusIcons[lesson.status] || statusIcons.SCHEDULED}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
                
                {/* Middle Content */}
                { /* 중간 콘텐츠: 중요 할 일 */ }
                <Card className="col-span-1 md:col-span-1 lg:col-span-3 border-none shadow-sm flex flex-col h-full bg-white dark:bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-4">
                        <TabsList className="dark:bg-muted/50">
                            <TabsTrigger className="cursor-default flex gap-2" value="urgent" activeValue="urgent">
                                {t("dashboard_todos_title")}
                                <span className="text-[8px] px-1 py-0.5 rounded bg-destructive text-white">
                                    {t("dashboard_priority_high")}
                                </span>
                            </TabsTrigger>
                        </TabsList>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 sm:h-8 text-xs rounded-full px-2.5 sm:px-3 text-muted-foreground/70 cursor-pointer hover:bg-muted"
                            onClick={() => navigate("/schedule")}
                        >
                            {t("dashboard_view_all")}
                        </Button>
                    </CardHeader>
                    <CardContent className="h-110 overflow-y-auto custom-scrollbar px-4 space-y-3">
                        {urgentTodos.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 gap-2 pb-2">
                                <LucideIcons.SearchX className="w-8 h-8" />
                                <h3 className="text-sm font-semibold text-center">
                                    {t("dashboard_todos_empty_urgent")}
                                </h3>
                            </div>
                        ) : (
                            urgentTodos.map(todo => {
                                const dDay = getTodoDDay(todo.due_date, todo.is_completed);
                                const isOverdue = !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date().setHours(0, 0, 0, 0);

                                return (
                                    <div
                                        key={todo.id}
                                        onClick={() => openTodoEditModal(todo)}
                                        className={cn(
                                            "group relative flex flex-col p-3 rounded-xl border bg-white dark:bg-card transition-all hover:shadow-md cursor-pointer",
                                            isOverdue ? "border-destructive border-dashed bg-destructive/10" : (priorityBorderColors[todo.priority] || "border-l-slate-200"),
                                            todo.is_completed
                                                ? "border-accent bg-accent/20 opacity-80"
                                                : isOverdue
                                                ? ""
                                                : "border-slate-100 dark:border-border",
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded border font-bold",
                                                    priorityBadgeColors[todo.priority],
                                                )}
                                            >
                                                {priorityLabels[todo.priority]}
                                            </span>
                                            <div className="flex gap-1.5">
                                                {todo.due_date && (
                                                    <span className={cn(
                                                        "text-[10px] font-medium flex items-center gap-1",
                                                        isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
                                                    )}>
                                                        <LucideIcons.Calendar className="w-3 h-3" />
                                                        {formatTodoDate(todo.due_date)}
                                                    </span>
                                                )}

                                                {dDay && (
                                                    <span
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded border font-bold tracking-wide",
                                                            dDay.color,
                                                        )}
                                                    >
                                                        {dDay.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleTodo(todo);
                                                }}
                                                className={cn(
                                                    "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                    todo.is_completed
                                                        ? "bg-accent border-accent text-white"
                                                        : "border-slate-300 bg-white dark:bg-card hover:border-accent hover:bg-accent/10",
                                                )}
                                            >
                                                {todo.is_completed && (
                                                    <LucideIcons.Check className="w-3.5 h-3.5 stroke-3" />
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={cn(
                                                        "text-[15px] font-medium wrap-break-word leading-tight",
                                                        todo.is_completed
                                                            ? "text-slate-400 line-through"
                                                            : "text-slate-700 dark:text-foreground group-hover:text-primary transition-colors",
                                                    )}
                                                >
                                                    {todo.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
                
                {/* Right Content */}
                {/* 우측 콘텐츠: 통계카드 및 빠른 실행 버튼 */}
                <div className="col-span-1 md:col-span-1 lg:col-span-3 flex flex-col gap-4 md:gap-6 h-full">

                    <div 
                        onClick={() => navigate("/courses", { 
                            state: { year: currentYear, month: currentMonth } 
                        })}
                        className="flex-1 flex flex-col justify-between bg-white dark:bg-card border-2 border-primary p-4 md:p-5 rounded-xl shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-primary/5 transition-all hover:shadow-md"
                    >
                        <p className={cn(RESPONSIVE_TEXT.xs, "font-semibold text-primary uppercase tracking-wider mb-2")}>
                            {t("dashboard_revenue_estimated_month")}
                        </p>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-1 items-center bg-primary/10 text-primary px-3 py-2 rounded-full">
                                <div className="flex flex-col gap-1 w-21">
                                    <div className="flex justify-between text-xs font-bold text-primary/80">
                                        <span>{t("dashboard_payment_progress")}</span>
                                        <span>{revenuePercentage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-500 ease-out" 
                                            style={{ width: `${revenuePercentage}%` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                            <h3 className={cn(RESPONSIVE_TEXT.xl, "font-extrabold text-primary tracking-tight")}>
                                {formatEuro(stats?.estimated_revenue)}
                            </h3>
                        </div>
                    </div>

                    <div 
                        onClick={() => navigate("/students", { 
                            state: { status: "ACTIVE" } 
                        })}
                        className="flex-1 flex flex-col justify-between bg-white dark:bg-card border-2 border-accent p-4 md:p-5 rounded-xl shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-accent/5 transition-all hover:shadow-md"
                    >
                        <p className={cn(RESPONSIVE_TEXT.xs, "font-semibold text-[#4a7a78] dark:text-accent-foreground uppercase tracking-wider mb-2")}>
                            {t("dashboard_active_students")}
                        </p>
                        <div className="flex justify-between items-center">
                            <div className={cn("flex bg-accent/20 text-[#4a7a78] dark:text-accent-foreground px-3 py-2 rounded-full",
                                isGerman ? "flex-col text-center pl-4" : "flex-row",
                            )}>
                                <span className="text-xs mr-1">{t("dashboard_avg_lessons_per_student")}</span>
                                <span className="text-xs font-semibold">
                                    {stats?.active_students > 0 
                                        ? (stats.monthly_lesson_count / stats.active_students).toFixed(1) 
                                        : 0}{t("dashboard_times_suffix")}
                                </span>
                            </div>

                            <h3 className={cn(RESPONSIVE_TEXT.xl, "font-extrabold text-[#4a7a78] dark:text-accent-foreground")}>
                                <span className={cn(isGerman ? "hidden" : "block")}>{t("dashboard_total_students", { count: stats?.active_students || 0 })}</span>
                                <span className={cn(isGerman ? "block text-center" : "hidden")}>{t("dashboard_total_students", { count: stats?.active_students || 0 })}</span>
                            </h3>
                        </div>
                    </div>

                    <Card className="bg-linear-to-br from-[#4C72A9] to-[#3b5b8a] text-white border-none shadow-lg shrink-0 overflow-hidden">
                        <CardContent className="p-4 md:p-5 space-y-2.5 md:space-y-3">
                            <Button
                                variant="secondary"
                                className={cn("w-full bg-white text-primary hover:bg-white/90 gap-2 cursor-pointer shadow-md", RESPONSIVE_TEXT.sm, "h-10 md:h-11",
                                    isGerman ? "justify-start": "justify-center"
                                )}
                                onClick={() => setIsStudentModalOpen(true)}
                            >
                                <LucideIcons.UserPlus className="ml-0.5 sm:ml-0 mr-1 h-5 w-5" /> {t("dashboard_action_add_student")}
                            </Button>
                            <Button
                                variant="secondary"
                                className={cn("w-full gap-2 cursor-pointer bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm", RESPONSIVE_TEXT.sm, "h-10 md:h-11",
                                    isGerman ? "justify-start": "justify-center"
                                )}
                                onClick={openCreateModal}
                            >
                                <LucideIcons.CalendarPlus className="mr-1 h-5 w-5" /> {t("dashboard_action_add_lesson")}
                            </Button>
                            <Button
                                variant="secondary"
                                className={cn("w-full gap-2 cursor-pointer bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm", RESPONSIVE_TEXT.sm, "h-10 md:h-11",
                                    isGerman ? "justify-start": "justify-center"
                                )}
                                onClick={openCreateTodoModal}
                            >
                                <LucideIcons.ListPlus className="mr-1 h-5 w-5" /> {t("dashboard_action_add_todo")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
