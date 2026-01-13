import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { cn } from "../lib/utils";
import {
    getFormattedDate,
    getWeekDays,
    getMonthCalendar,
} from "../lib/dateUtils";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { TabsList, TabsTrigger } from "../components/ui/Tabs";

export default function Schedule() {
    const [viewMode, setViewMode] = useState("weekly");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allLessons, setAllLessons] = useState([]);

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

        fetchLessons();
    }, [currentDate, viewMode]);

    const todayStr = getFormattedDate(new Date());

    const moveDate = (direction) => {
        const newDate = new Date(currentDate);
            if (viewMode === "weekly") {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setCurrentDate(newDate);
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

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
                <TabsList className="grid w-75 grid-cols-2">
                    <TabsTrigger
                        value="weekly"
                        activeValue={viewMode}
                        onClick={() => {
                        setViewMode("weekly");
                        setCurrentDate(new Date());
                        }}
                    >
                        이번 주 (Weekly)
                    </TabsTrigger>
                    <TabsTrigger
                        value="monthly"
                        activeValue={viewMode}
                        onClick={() => {
                        setViewMode("monthly");
                        setCurrentDate(new Date());
                        }}
                    >
                        이달 (Monthly)
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 text-primary font-bold bg-white px-3 py-1.5 rounded-lg border border-border shadow-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveDate(-1)}
                    >
                        <LucideIcons.ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm mx-1 min-w-45 text-center">
                        {getDateRangeText()}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveDate(1)}
                    >
                        <LucideIcons.ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {viewMode === "weekly" ? (
                <div className="grid grid-cols-7 gap-4">
                    {getWeekDays(currentDate).map((dateObj, idx) => {
                            const dateStr = getFormattedDate(dateObj);
                            const isToday = dateStr === todayStr;
                            const dayLessons = getLessonsForDate(dateObj);
                            const dayName = dateObj.toLocaleDateString("de-DE", {
                                weekday: "short",
                            });
                        const dayNum = dateObj.getDate();

                        return (
                            <Card
                                key={idx}
                                className={cn(
                                    "min-h-75 border-l-4 shadow-sm hover:shadow-md transition-shadow",
                                    isToday
                                        ? "border-l-accent ring-1 ring-accent/20 bg-white"
                                        : "border-l-transparent bg-white/60",
                                )}
                            >
                                <div className="p-3 border-b border-border text-center">
                                    <p
                                        className={cn(
                                        "text-xs font-bold uppercase",
                                        isToday ? "text-accent" : "text-muted-foreground",
                                        )}
                                    >
                                        {dayName}
                                    </p>
                                    <p
                                        className={cn(
                                        "text-lg font-bold",
                                        isToday ? "text-primary" : "text-foreground",
                                        )}
                                    >
                                        {dayNum}
                                    </p>
                                </div>
                                <div className="p-2 space-y-2">
                                    {dayLessons.map((l) => (
                                        <div
                                        key={l.id}
                                        className="rounded border border-border bg-white p-2 text-xs shadow-sm hover:border-accent transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-accent"></div>
                                                {l.start_time.slice(0, 5)}
                                            </div>
                                            <div className="font-medium text-slate-700 truncate">
                                                {l.student_name}
                                            </div>
                                            {l.topic && (
                                                <div className="text-[10px] text-muted-foreground bg-background border border-border px-1.5 rounded w-fit mt-1.5 truncate max-w-full">
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
                <Card className="p-6">
                    <div className="grid grid-cols-7 text-center mb-4 border-b pb-2">
                        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                        <div
                            key={d}
                            className={cn(
                            "text-sm font-bold uppercase",
                            d === "So" ? "text-warning" : "text-muted-foreground",
                            )}
                        >
                            {d}
                        </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 h-150 auto-rows-fr">
                        {getMonthCalendar(currentDate).map((dateObj, i) => {
                            if (!dateObj) return <div key={i} className="bg-transparent" />;
                            const dateStr = getFormattedDate(dateObj);
                            const isToday = dateStr === todayStr;
                            const dayLessons = getLessonsForDate(dateObj);

                            return (
                                <div
                                key={i}
                                className={cn(
                                    "relative rounded-md border border-border p-2 flex flex-col justify-between text-sm transition-colors hover:bg-muted/10",
                                    isToday
                                    ? "bg-accent/5 border-accent ring-1 ring-accent/20"
                                    : "bg-white",
                                )}
                                >
                                    <div className="flex justify-between items-start">
                                        <span
                                        className={cn(
                                            "font-bold",
                                            isToday ? "text-accent" : "text-foreground",
                                        )}
                                        >
                                            {dateObj.getDate()}
                                        </span>
                                        {dayLessons.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] h-4 px-1"
                                        >
                                            {dayLessons.length}
                                        </Badge>
                                        )}
                                    </div>
                                    <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
                                        {dayLessons.slice(0, 3).map((l) => (
                                            <div
                                                key={l.id}
                                                className="text-[10px] truncate rounded bg-primary/10 px-1 py-0.5 text-primary"
                                            >
                                                {l.start_time.slice(0, 5)} {l.student_name}
                                            </div>
                                        ))}
                                        {dayLessons.length > 3 && (
                                            <div className="text-[10px] text-muted-foreground text-center">
                                                + {dayLessons.length - 3} 더보기
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
