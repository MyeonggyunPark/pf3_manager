import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { cn } from "../lib/utils";
import {
    getFormattedDate,
    getWeekDays,
    getMonthCalendar,
} from "../lib/dateUtils";
import {
    Card,
    CardHeader,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { TabsList, TabsTrigger } from "../components/ui/Tabs";
import AddLessonModal from "../components/modals/AddLessonModal";
import AddTodoModal from "../components/modals/AddTodoModal";


const statusStyles = {
    SCHEDULED:
        "border-warning/60 bg-warning/20 hover:shadow-md dark:border-warning/40 dark:bg-warning/10",
        COMPLETED:
        "border-accent/60 bg-accent/30 hover:shadow-md dark:border-accent/40 dark:bg-accent/10",
        CANCELLED: "border-slate-300 bg-slate-200 hover:shadow-md dark:border-border dark:bg-muted",
        NOSHOW:
        "border-destructive/60 bg-destructive/30 hover:shadow-md dark:border-destructive/40 dark:bg-destructive/10",
};

const TODO_CATEGORIES = [
    {
        id: "PREP",
        label: "수업 준비",
        icon: LucideIcons.BookOpen,
        color: "text-primary bg-primary/10",
    },
    {
        id: "ADMIN",
        label: "행정 및 회계",
        icon: LucideIcons.FileText,
        color: "text-primary bg-primary/10",
    },
    {
        id: "STUDENT",
        label: "학생 관리",
        icon: LucideIcons.Users,
        color: "text-primary bg-primary/10",
    },
    {
        id: "PERSONAL",
        label: "개인 업무",
        icon: LucideIcons.StickyNote,
        color: "text-primary bg-primary/10",
    },
];

export default function Schedule() {
    const [viewMode, setViewMode] = useState("weekly");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allLessons, setAllLessons] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [todos, setTodos] = useState([]);

    // Fetch lessons based on the selected view mode and date
    // Optimizes performance by requesting only the data for the visible range
    // 선택된 뷰 모드와 날짜에 기반하여 수업 데이터를 가져옴
    // 표시되는 범위의 데이터만 요청하여 성능을 최적화
    useEffect(() => {
        const fetchLessons = async () => {
            let startDateStr, endDateStr;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            if (viewMode === "weekly") {

                // Calculate Monday and Sunday of the current week
                // 현재 주의 월요일과 일요일을 계산
                const day = currentDate.getDay();
                const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);

                const monday = new Date(currentDate);
                monday.setDate(diff);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                // Format to YYYY-MM-DD
                // YYYY-MM-DD 형식으로 변환 
                startDateStr = monday.toISOString().split("T")[0];
                endDateStr = sunday.toISOString().split("T")[0];
            } else {

                // Calculate first and last day of the current month
                // 현재 월의 1일과 말일을 계산
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);

                // Format to YYYY-MM-DD
                // YYYY-MM-DD 형식으로 변환
                startDateStr = firstDay.toISOString().split("T")[0];
                endDateStr = lastDay.toISOString().split("T")[0];
            }

            try {
                // Request filtered data from backend using range query parameters
                // 범위 쿼리 파라미터를 사용하여 백엔드에 필터링된 데이터를 요청
                const res = await api.get(
                `/api/lessons/?start_date=${startDateStr}&end_date=${endDateStr}`,
                );
                setAllLessons(res.data);
            } catch (e) {
                console.error("Schedule Load Error:", e);
            }
        };

        // Fetch todos list when component mounts or refresh is triggered
        // 컴포넌트 마운트 시 또는 새로고침 트리거 시 할 일 목록 조회
        const fetchTodos = async () => {
            try {
                const res = await api.get("/api/todos/");
                setTodos(res.data);
            } catch (e) {
                console.error("Todo Load Error:", e);
            }
        };

        fetchLessons();
        fetchTodos();
    }, [currentDate, viewMode, refreshTrigger]);

    const openCreateModal = () => {
        setSelectedLesson(null);
        setIsLessonModalOpen(true);
    };

    const openEditModal = (lesson) => {
        setSelectedLesson(lesson);
        setIsLessonModalOpen(true);
    };

    const moveDate = (direction) => {
        const newDate = new Date(currentDate);
        if (viewMode === "weekly") {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setCurrentDate(newDate);
    };

    // Handlers for opening todo modals in create or edit mode
    // 할 일 모달을 생성 또는 수정 모드로 열기 위한 핸들러
    const openCreateTodoModal = () => {
        setSelectedTodo(null);
        setIsTodoModalOpen(true);
    };

    const openEditTodoModal = (todo) => {
        setSelectedTodo(todo);
        setIsTodoModalOpen(true);
    };

    // Toggle todo completion status via API and refresh data
    // API를 통해 할 일 완료 상태를 토글하고 데이터 새로고침
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

    const getDateRangeText = () => {
        const options = { year: "numeric", month: "2-digit", day: "2-digit" };
        if (viewMode === "weekly") {
            const week = getWeekDays(currentDate);

            if (!week || week.length === 0) return "";

            return `${week[0].toLocaleDateString(
                "de-DE",
                options,
            )} - ${week[6].toLocaleDateString("de-DE", options)}`;
        } else {
            return currentDate.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
            });
        }
    };

    const getLessonsForDate = (dateObj) => {
        if (!dateObj) return [];
        const dateStr = getFormattedDate(dateObj);
        return allLessons
        .filter((l) => l.date === dateStr)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    // Calculate D-Day for todo due dates with color coding based on urgency
    // 긴급도에 따른 색상 코딩이 포함된 할 일 마감일 D-Day 계산
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
        return {
            text: "D-Day",
            color: "bg-destructive/10 text-destructive border-destructive/20",
        };

        if (diffDays > 0 && diffDays <= 7)
        return {
            text: `D-${diffDays}`,
            color: "bg-warning/30 text-yellow-500 border-warning/30 dark:text-warning",
        };

        if (diffDays > 0)
        return {
            text: `D-${diffDays}`,
            color: "bg-slate-50 text-slate-400 border-slate-100 dark:bg-muted dark:text-muted-foreground dark:border-border",
        };

        return {
            text: `마감`,
            color: "bg-slate-600 text-white border-slate-700 font-medium dark:bg-slate-800",
        };
    };


    const formatTodoDate = (dateString) => {
        if (!dateString) return "";
        const [year, month, day] = dateString.split("-");
        return `${day}.${month}.${year}`;
    };

    const todayStr = getFormattedDate(new Date());

    const priorityBadgeColors = {
        1: "bg-destructive text-white border-destructive", 
        2: "bg-warning text-white border-warning", 
        3: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-muted dark:text-muted-foreground dark:border-border", 
    };

    const priorityBorderColors = {
        1: "border-l-4 border-l-destructive",
        2: "border-l-4 border-l-warning",
        3: "border-l-4 border-l-slate-300 dark:border-l-border",
    };

    const priorityLabels = {
        1: "중요",
        2: "보통",
        3: "낮음",
    };

    return (
        <div className="space-y-6 animate-in">
            <AddLessonModal
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
                lessonData={selectedLesson}
            />

            <AddTodoModal
                isOpen={isTodoModalOpen}
                onClose={() => setIsTodoModalOpen(false)}
                onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
                todoData={selectedTodo}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <TabsList className="grid w-full sm:w-55 grid-cols-2 bg-muted dark:bg-muted/50">
                    <TabsTrigger
                        value="weekly"
                        activeValue={viewMode}
                        onClick={() => {
                        setViewMode("weekly");
                        setCurrentDate(new Date());
                        }}
                    >
                        이번 주
                    </TabsTrigger>
                    <TabsTrigger
                        value="monthly"
                        activeValue={viewMode}
                        onClick={() => {
                        setViewMode("monthly");
                        setCurrentDate(new Date());
                        }}
                    >
                        이번 달
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-primary font-bold bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm flex-1 sm:flex-none justify-between sm:justify-start">
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer hover:bg-muted"
                        onClick={() => moveDate(-1)}
                        >
                            <LucideIcons.ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm mx-2 min-w-32 text-center text-foreground">
                            {getDateRangeText()}
                        </span>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer hover:bg-muted"
                        onClick={() => moveDate(1)}
                        >
                            <LucideIcons.ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="default"
                        className="h-9 px-4 shadow-md bg-primary hover:bg-primary/90 text-white cursor-pointer whitespace-nowrap"
                        onClick={openCreateModal}
                    >
                        <LucideIcons.CalendarPlus className="w-4 h-4 mr-2" /> 수업 추가
                    </Button>
                </div>
            </div>

        {viewMode === "weekly" ? (
            <div className="grid grid-cols-7 gap-3 min-w-200 lg:min-w-0">
                {getWeekDays(currentDate).map((dateObj, idx) => {
                    const dateStr = getFormattedDate(dateObj);
                    const isToday = dateStr === todayStr;
                    const dayLessons = getLessonsForDate(dateObj);
                    const dayName = dateObj.toLocaleDateString("de-DE", {
                        weekday: "short",
                    });
                    const dayNum = dateObj.getDate();
                    const isSunday = dateObj.getDay() === 0;

                    return (
                        <Card
                            key={idx}
                            className={cn(
                            "h-86 border-t-4 shadow-sm flex flex-col bg-card",
                            isToday
                                ? "border-t-accent ring-1 ring-accent/20"
                                : "border-t-transparent dark:bg-card/50 bg-slate-50/50",
                            )}
                        >
                            <div className="p-3 border-b border-border text-center shrink-0 relative">
                                {dayLessons.length > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="absolute right-2 top-2 text-[10px] h-4 px-1 bg-primary/10 text-primary"
                                    >
                                        {dayLessons.length}
                                    </Badge>
                                )}
                                <p
                                    className={cn(
                                        "text-xs font-bold uppercase",
                                        isSunday
                                        ? "text-destructive"
                                        : "text-muted-foreground",
                                    )}
                                >
                                    {dayName}
                                </p>
                                <p className={cn(
                                    "text-lg font-bold",
                                    isSunday
                                    ? "text-destructive"
                                    : "text-card-foreground",
                                )}>
                                    {dayNum}
                                </p>
                            </div>
                            <div className="p-2 space-y-2 custom-scrollbar flex-1">
                                {dayLessons.map((l) => (
                                    <div
                                    key={l.id}
                                    onClick={() => openEditModal(l)}
                                    className={cn(
                                        "rounded-lg border p-2 text-xs shadow-sm transition-all cursor-pointer group relative overflow-hidden",
                                        statusStyles[l.status] || statusStyles.SCHEDULED,
                                    )}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-muted-foreground mb-1">
                                            <LucideIcons.Clock className="w-3 h-3" />
                                            {l.start_time.slice(0, 5)}
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                            <span className="font-bold text-[15px] text-card-foreground group-hover:text-primary transition-colors truncate ml-1">
                                                {l.student_name}
                                            </span>
                                            {l.student_level && (
                                                <Badge 
                                                    variant="outline" 
                                                    className="text-[9px] h-4 px-1 rounded-md border-primary/30 text-primary bg-card font-semibold shrink-0"
                                                >
                                                    {l.student_level}
                                                </Badge>
                                            )}
                                        </div>
                                        {l.topic && (
                                            <div className="text-[10px] text-muted-foreground bg-muted dark:bg-muted/50 px-1.5 py-0.5 rounded w-fit truncate max-w-full">
                                            {l.topic}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <Card className="p-6 bg-card text-card-foreground">
                <div className="grid grid-cols-7 text-center mb-4 border-b border-border pb-2">
                    {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                    <div
                        key={d}
                        className={cn(
                        "text-sm font-bold uppercase",
                        d === "So"
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                    >
                        {d}
                    </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2 h-160 auto-rows-fr">
                    {getMonthCalendar(currentDate).map((dateObj, i) => {
                    if (!dateObj) return <div key={i} className="bg-transparent" />;
                    const dateStr = getFormattedDate(dateObj);
                    const isToday = dateStr === todayStr;
                    const dayLessons = getLessonsForDate(dateObj);
                    const isSunday = dateObj.getDay() === 0;

                    return (
                        <div
                        key={i}
                        className={cn(
                            "relative rounded-md border border-border p-2 flex flex-col text-sm group cursor-default h-full overflow-hidden transition-colors",
                            isToday
                            ? "bg-accent/5 border-accent ring-1 ring-accent/20"
                            : "bg-card hover:bg-muted/30",
                        )}
                        >
                            <div className="flex justify-between items-start mb-1 shrink-0">
                                <span
                                className={cn(
                                    "font-bold",
                                    isToday
                                    ? "text-accent"
                                    : isSunday
                                    ? "text-destructive"
                                    : "text-foreground",
                                )}
                                >
                                    {dateObj.getDate()}
                                </span>
                                {dayLessons.length > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] h-4 px-1 bg-primary/10 text-primary"
                                    >
                                        {dayLessons.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-1.5 custom-scrollbar pr-1 flex-1">
                                {dayLessons.map((l) => (
                                    <div
                                        key={l.id}
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(l);
                                        }}
                                        className={cn(
                                        "text-[10px] truncate rounded px-3 py-1 cursor-pointer shadow-sm flex items-center gap-3 transition-all hover:ring-1 hover:ring-primary/30",
                                        statusStyles[l.status]
                                        )}
                                    >
                                        <span className="font-bold">
                                            {l.start_time.slice(0, 5)}
                                        </span>
                                        <span className="truncate">
                                            {l.student_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                    })}
                </div>
            </Card>
        )}

        <div className="mt-8">
            <Card className="shadow-lg border-none bg-card text-card-foreground">
                <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                    <TabsList className="bg-muted dark:bg-muted/50">
                        <TabsTrigger className="cursor-default text-md py-1">
                            할 일
                        </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="default"
                            onClick={openCreateTodoModal}
                            className="h-9 px-4 shadow-md bg-primary hover:bg-primary/90 text-white cursor-pointer whitespace-nowrap"
                        >
                            <LucideIcons.ListPlus className="w-4 h-4 mr-2" /> 업무 추가
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                        {TODO_CATEGORIES.map((category) => {
                            const categoryTodos = todos.filter(
                                (t) => t.category === category.id,
                            );
                            const Icon = category.icon;

                            return (
                                <div
                                    key={category.id}
                                    className="flex flex-col gap-4 min-w-0"
                                >
                                    <div className="flex items-center gap-2 pb-2 border-b-2 border-border">
                                        <div className={cn("p-1.5 rounded-md", category.color)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-card-foreground text-sm">
                                            {category.label}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-3 h-80 custom-scrollbar p-1 pr-2">
                                        {categoryTodos.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/30">
                                                <p className="text-xs text-muted-foreground">비어 있음</p>
                                            </div>
                                        ) : (
                                            categoryTodos.map((todo) => {
                                                const dDay = getTodoDDay(todo.due_date, todo.is_completed);
                                                const isOverdue = !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date().setHours(0, 0, 0, 0);
                                                
                                                return (
                                                    <div
                                                    key={todo.id}
                                                    onClick={() => openEditTodoModal(todo)}
                                                    className={cn(
                                                        "group relative flex flex-col p-3 rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer",
                                                        isOverdue ? "border-destructive border-dashed bg-destructive/10" : (priorityBorderColors[todo.priority] || "border-l-border"),
                                                        todo.is_completed
                                                        ? "border-accent bg-accent/20 opacity-80"
                                                        : isOverdue
                                                        ? ""
                                                        : "border-border",
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
                                                                : "border-border bg-card hover:border-accent hover:bg-accent/10",
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
                                                                        ? "text-muted-foreground line-through"
                                                                        : "text-card-foreground group-hover:text-primary transition-colors",
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
        </div>
    );
}