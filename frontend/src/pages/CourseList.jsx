import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,    
} from "recharts";
import api from "../api";
import { cn } from "../lib/utils";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import AddCourseModal from "../components/modals/AddCourseModal";

// --- Constants & Styles ---

// Chart color configuration
// 차트 색상 설정
const CHART_BAR_COLOR = "#4C72A9"; 
const CHART_BAR_BG = "#E2E8F0";   
const CHART_LINE_COLOR = "#4C72A9"; 

// Styles mapping for course status badges
// 수강권 상태 배지를 위한 스타일 매핑
const statusStyles = {
    ACTIVE: "bg-accent/20 text-[#4a7a78] border-accent/50 hover:bg-accent/20",
    PAUSED: "bg-secondary/50 text-muted-foreground border-secondary hover:bg-secondary/50",
    FINISHED: "bg-success/20 text-[#5f6e63] border-success/50 hover:bg-success/20",
};

const STATUS_LABELS = {
    ACTIVE: "수강중",
    PAUSED: "일시중지",
    FINISHED: "종료",
};

// Helper to format currency in Euro
// 통화를 유로화 형식으로 변환하는 헬퍼 함수
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(amount || 0);
};

// Helper to format date string
// 날짜 문자열 포맷팅 헬퍼 함수
const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

export default function CourseList() {
    const location = useLocation();

    // State for data and loading status
    // 데이터 및 로딩 상태 관리
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filter States (Year, Month, Payment)
    // 필터 상태 관리 (연도, 월, 결제 상태)
    const currentYear = new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState(
        location.state?.year ? Number(location.state.year) : currentYear
    );
    const [selectedMonth, setSelectedMonth] = useState(
        location.state?.month ? Number(location.state.month) : 0
    );
    const [paymentFilter, setPaymentFilter] = useState("ALL");

    const [isAllUnpaidMode, setIsAllUnpaidMode] = useState(false);

    // Chart View Mode State (Revenue vs Student Count)
    // 차트 보기 모드 상태 (매출 vs 수강생 수)
    const [chartMode, setChartMode] = useState("REVENUE");

    // Modal States
    // 모달 상태 관리
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // --- Effect: Navigation State Handling ---
    // 네비게이션 상태 감지 및 필터 자동 적용
    useEffect(() => {
        if (location.state?.view === "unpaid_all") {
            setPaymentFilter("UNPAID");
            setIsAllUnpaidMode(true);
        }
    }, [location]);

    // --- 1. Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch courses and students in parallel
                // 수강권 목록과 학생 목록을 병렬로 요청
                const [cRes, sRes] = await Promise.all([
                    api.get("/api/courses/"),
                    api.get("/api/students/"),
                ]);

                setCourses(cRes.data);
                setStudents(sRes.data);

                // Auto-select the most recent year if current year has no data
                // 데이터가 있는 경우, 현재 연도에 데이터가 없으면 가장 최근 연도로 자동 선택
                if (cRes.data.length > 0) {
                const years = cRes.data.map((c) =>
                    new Date(c.start_date).getFullYear(),
                );
                const maxYear = Math.max(...years);
                if (!years.includes(new Date().getFullYear())) {
                    setSelectedYear(maxYear);
                }
                }
            } catch (err) {
                console.error("Data load failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [refreshTrigger]);

    // Helper to get student name by ID
    // ID로 학생 이름을 조회하는 헬퍼 함수
    const getStudentName = useCallback(
        (id) => {
            const student = students.find((s) => s.id === id);
            return student ? student.name : "Unknown";
        },
        [students],
    );

    // --- 2. Dynamic Year Generation ---
    // Extract unique years from course data for filter options
    // 수강권 데이터에서 고유한 연도를 추출하여 필터 옵션 생성
    const availableYears = useMemo(() => {
        const thisYear = new Date().getFullYear();
        if (courses.length === 0) return [thisYear];

        const years = new Set(
            courses.map((c) => new Date(c.start_date).getFullYear()),
        );
        years.add(thisYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [courses]);

    // --- 3. Data Filtering Logic ---

    // Filtered by Period only (For Stats & Chart)
    // 기간(연/월)으로만 필터링된 데이터 (통계 및 차트용)
    // KPI calculates based on Period regardless of payment filter
    // KPI는 결제 필터와 무관하게 기간을 기준으로 계산됨
    const coursesInPeriod = useMemo(() => {
        return courses.filter((course) => {
            const courseDate = new Date(course.start_date);
            const matchesYear = courseDate.getFullYear() === parseInt(selectedYear);
            const matchesMonth =
            selectedMonth === 0 ||
            courseDate.getMonth() + 1 === parseInt(selectedMonth);
            return matchesYear && matchesMonth;
        });
    }, [courses, selectedYear, selectedMonth]);

    // Filtered by Period AND Payment Status (For Table List)
    // 기간 및 결제 상태까지 필터링된 데이터 (테이블 리스트용)
    const filteredCourses = useMemo(() => {
        if (isAllUnpaidMode && paymentFilter === "UNPAID") {
            return courses
            .filter((c) => !c.is_paid) 
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        }

        let filtered = coursesInPeriod.filter((course) => {
            const matchesPayment =
            paymentFilter === "ALL" ||
            (paymentFilter === "PAID" && course.is_paid) ||
            (paymentFilter === "UNPAID" && !course.is_paid);
            return matchesPayment;
        });

        return filtered.sort(
            (a, b) => new Date(b.start_date) - new Date(a.start_date),
        );
    }, [courses, coursesInPeriod, paymentFilter, isAllUnpaidMode]);

    // --- 4. Chart Data Preparation ---
    // Aggregate monthly revenue and count based on 'coursesInPeriod'
    // 'coursesInPeriod' 데이터를 기반으로 월별 매출 및 수강생 수 집계
    const chartData = useMemo(() => {
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: `${i + 1}월`,
            monthIndex: i + 1,
            revenue: 0,
            count: 0,
        }));

        courses.forEach((course) => {
            const date = new Date(course.start_date);
            if (date.getFullYear() === parseInt(selectedYear)) {
                const month = date.getMonth();
                monthlyData[month].revenue += parseFloat(course.total_fee || 0);
                monthlyData[month].count += 1;
            }
        });

        return monthlyData;
    }, [courses, selectedYear]);

    // --- 5. KPI Calculation ---
    // Calculate total revenue and unpaid amounts for the selected period
    // 선택된 기간의 총 매출 및 미납금 계산 (필터 영향 받지 않음)
    const totalRevenue = coursesInPeriod.reduce(
        (sum, c) => sum + parseFloat(c.total_fee || 0),
        0,
    );

    const totalHours = coursesInPeriod.reduce(
        (sum, c) => sum + parseFloat(c.total_hours || 0),
        0,
    );

    const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;

    const avgHoursPerCourse =
        coursesInPeriod.length > 0
            ? (totalHours / coursesInPeriod.length).toFixed(1)
            : 0;

    const maxHourlyRate =
        coursesInPeriod.length > 0
            ? Math.max(
                ...coursesInPeriod.map((c) => parseFloat(c.hourly_rate || 0)),
            )
            : 0;

    // --- Handlers ---
    const openCreateModal = () => {
        setSelectedCourse(null);
        setIsModalOpen(true);
    };

    const openEditModal = (course) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const handleSuccess = () => setRefreshTrigger((prev) => prev + 1);

    if (isLoading) {
        return (
        <div className="h-[calc(100vh-200px)] flex items-center justify-center">
            <LucideIcons.Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        );
    }

    const handleYearChange = (e) => {
        setSelectedYear(Number(e.target.value));
        setIsAllUnpaidMode(false);
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(Number(e.target.value));
        setIsAllUnpaidMode(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] space-y-4 animate-in overflow-hidden">
            <AddCourseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                courseData={selectedCourse}
            />

            {/* --- Top Control Bar --- */}
            {/* 상단 컨트롤 바: 연도/월 선택 및 결제 필터 */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Year Selector */}
                        <div className="relative">
                            <select
                                value={selectedYear}
                                onChange={handleYearChange}
                                className="h-10 w-full sm:w-28 appearance-none rounded-xl border border-border bg-card px-4 text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium"
                            >
                                {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}년
                                </option>
                                ))}
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Month Selector */}
                        <div className="relative">
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="h-10 w-full sm:w-26 appearance-none rounded-xl border border-border bg-card px-3 text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium"
                            >
                                <option value={0}>
                                    전체(월)
                                </option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {i + 1}월
                                    </option>
                                ))}
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Payment Filter */}
                        {/* 결제 상태 필터 선택 */}
                        <div className="relative">
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="h-10 w-full sm:w-32 appearance-none rounded-xl border border-border bg-card px-4 text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium"
                            >
                                <option value="ALL">전체(결제)</option>
                                <option value="PAID">완납</option>
                                <option value="UNPAID">미납</option>
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                <Button
                variant="default"
                className="w-full xl:w-auto h-10 px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                onClick={openCreateModal}
                >
                    <LucideIcons.BookPlus className="w-4 h-4" /> 수강권 등록
                </Button>
            </div>

            {/* --- Analytics & KPI Section --- */}
            {/* 통계 및 KPI 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 shrink-0">
                
                {/* KPI Cards (Left) */}
                <div className="lg:col-span-4 flex flex-col gap-2.5">
                    
                    {/* 1. 총 수익 (Revenue) */}
                    <div className="flex-1 bg-card border-2 border-primary px-5 py-3 rounded-xl shadow-sm">
                        <p className="text-md font-semibold text-primary uppercase tracking-wider mb-1">
                            {selectedMonth === 0 ? `${selectedYear}년 총 수익` : `${selectedMonth}월 수익`}
                        </p>
                        <div className="flex justify-around mt-3">
                            <div className="flex gap-1 items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                <LucideIcons.CreditCard className="w-4 h-4" />
                                총 수강 {filteredCourses.length}건
                            </div>
                            <h3 className="text-2xl font-bold text-primary tracking-tight">
                                {formatCurrency(totalRevenue)}
                            </h3>
                        </div>
                    </div>

                    {/* 총 수업 시간 (Total Hours) */}
                    <div className="flex-1 bg-card border-2 border-accent px-5 py-3 rounded-xl shadow-sm">
                        <p className="text-md font-semibold text-[#4a7a78] uppercase tracking-wider mb-1">
                            {selectedMonth === 0 ? `${selectedYear}년 총 수업 시간` : `${selectedMonth}월 수업 시간`}
                        </p>
                        <div className="flex justify-around mt-3">
                            <div className="flex gap-1 items-center bg-accent/20 text-[#4a7a78] px-3 py-1 rounded-full text-sm font-medium">
                                <LucideIcons.BarChart className="w-4 h-4 text-[#4a7a78]" />
                                <span>건당 평균 {avgHoursPerCourse}시간</span>
                            </div>
                            <h3 className="text-2xl font-bold text-[#4a7a78] tracking-tight">
                                {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}시간
                            </h3>
                        </div>
                    </div>

                    {/* 평균 시간당 수익 (Hourly Rate) */}
                    <div className="flex-1 bg-card border-2 border-warning px-5 py-3 rounded-xl shadow-sm">
                        <p className="text-md font-semibold text-[#b8a05e] uppercase tracking-wider mb-1">
                            {selectedMonth === 0 ? `${selectedYear}년 평균 시간당 수익` : `${selectedMonth}월 평균 시간당 수익`}
                        </p>
                        <div className="flex justify-around mt-3">
                            <div className="flex gap-1 items-center bg-warning/20 text-[#b8a05e] px-3 py-1 rounded-full text-sm font-medium">
                                <LucideIcons.Coins className="w-4 h-4 text-[#b8a05e]" />
                                <span>최고 시급 {formatCurrency(maxHourlyRate)}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-[#b8a05e] tracking-tight">
                                {formatCurrency(avgHourlyRate)}/h
                            </h3>
                        </div>
                    </div>

                </div>

                {/* Chart (Right) */}
                {/* 차트 영역 (우측) */}
                <div className="lg:col-span-8 bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4 pl-1">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <LucideIcons.BarChart3 className="w-4 h-4 text-primary" />
                            {selectedYear}년 현황
                        </h3>
                            
                        {/* Chart Toggle Buttons */}
                        {/* 차트 모드 전환 버튼 (수익 / 수강생) */}
                        <div className="flex bg-muted/60 p-1 rounded-lg">
                            <button
                                onClick={() => setChartMode("REVENUE")}
                                className={cn(
                                "text-[13px] px-3 py-1 rounded-md transition-all cursor-pointer",
                                chartMode === "REVENUE" 
                                    ? "bg-white text-primary font-semibold shadow-sm" 
                                    : "text-muted-foreground hover:font-semibold hover:text-primary hover:bg-card/40"
                                )}
                            >
                                수익
                            </button>
                            <button
                                onClick={() => setChartMode("COUNT")}
                                className={cn(
                                "text-[13px] px-3 py-1 rounded-md transition-all cursor-pointer",
                                chartMode === "COUNT" 
                                    ? "bg-white text-primary font-semibold shadow-sm" 
                                    : "text-muted-foreground hover:font-semibold hover:text-primary hover:bg-card/40"
                                )}
                            >
                                수강생
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-45">
                        <ResponsiveContainer width="100%" height="100%">
                        {/* Conditional Rendering for Chart Type */}
                        {/* 차트 모드에 따른 조건부 렌더링 (BarChart vs LineChart) */}
                        {chartMode === "REVENUE" ? (
                            <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                            >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748B", fontSize: 11 }} 
                                dy={5} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748B", fontSize: 11 }} 
                                tickFormatter={(value) => `€${value.toLocaleString('de-DE')}`} 
                            />
                            <Tooltip
                                cursor={{ fill: "#F1F5F9" }}
                                contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid #E2E8F0",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                fontSize: "12px",
                                }}
                                formatter={(value) => [formatCurrency(value), "수익"]}
                            />
                            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={24}>
                                {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                    selectedMonth !== 0
                                        ? entry.monthIndex === selectedMonth
                                        ? CHART_BAR_COLOR
                                        : CHART_BAR_BG
                                        : CHART_BAR_COLOR
                                    }
                                />
                                ))}
                            </Bar>
                            </BarChart>
                        ) : (
                            <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 20, left: -20, bottom: 0 }}
                            >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748B", fontSize: 11 }} 
                                dy={5} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748B", fontSize: 11 }} 
                                allowDecimals={false}
                                domain={[0, (dataMax) => (dataMax < 5 ? 5 : dataMax)]}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid #E2E8F0",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    fontSize: "12px",
                                }}
                                formatter={(value) => [`${value}명`, "수강생"]}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke={CHART_LINE_COLOR} 
                                strokeWidth={3}
                                dot={{ r: 4, fill: CHART_LINE_COLOR, strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 6 }}
                            />
                            </LineChart>
                        )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- Detailed List Section --- */}
            {/* 상세 리스트 섹션 (테이블) */}
            <div className="flex-1 h-full bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-0 mt-3">
                <div className="bg-primary/10 border-b border-border pr-2">
                    <table className="w-full text-md table-fixed">
                        <thead className="text-md text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[18%]">
                                    학생
                                </th>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[22%]">
                                    수강 기간
                                </th>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[8%]">
                                    총 시간
                                </th>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[12%]">
                                    시간당 금액
                                </th>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[14%]">
                                    금액
                                </th>
                                    <th className="px-4 py-3 font-semibold text-center select-none w-[13%]">
                                    수강 상태
                                </th>
                                <th className="px-4 py-3 font-semibold text-center select-none w-[13%]">
                                    결제 여부
                                </th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-md table-fixed">
                        <tbody className="divide-y divide-border/50">
                            {filteredCourses.length === 0 ? (
                                <tr>
                                <td
                                    colSpan="7"
                                    className="px-6 py-12 text-center text-muted-foreground text-md"
                                >
                                    <div className="flex flex-col items-center gap-2 mt-5">
                                    <LucideIcons.SearchX className="w-8 h-8 text-muted-foreground/50" />
                                    <p>해당 기간에 등록된 데이터가 없습니다.</p>
                                    </div>
                                </td>
                                </tr>
                            ) : (
                                filteredCourses.map((course) => (
                                <tr
                                    key={course.id}
                                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                                    onClick={() => openEditModal(course)}
                                >
                                    <td className="px-4 py-4 text-center text-foreground truncate w-[18%]">
                                        <span className="font-bold text-base">
                                            {getStudentName(course.student)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center w-[22%]">
                                        <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                                            {formatDate(course.start_date)} ~{" "}
                                            {formatDate(course.end_date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-muted-foreground w-[8%]">
                                        {Number(course.total_hours)}h
                                    </td>
                                    <td className="px-4 py-4 text-center text-muted-foreground w-[12%]">
                                        {formatCurrency(course.hourly_rate)}
                                    </td>
                                    <td className="px-4 py-4 text-center font-bold text-foreground w-[14%]">
                                        {formatCurrency(course.total_fee)}
                                    </td>
                                    <td className="px-1 py-4 text-center w-[13%]">
                                        <div className="flex justify-center">
                                            <Badge
                                            className={cn(
                                                "text-[12px] px-2 py-0.5 border font-medium shadow-none justify-center min-w-12.5",
                                                statusStyles[course.status] ||
                                                "bg-muted/50 text-muted-foreground"
                                            )}
                                            >
                                                {STATUS_LABELS[course.status]}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center w-[13%]">
                                        <div className="flex justify-center">
                                            {course.is_paid ? (
                                            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-xl border bg-accent/20 text-[#4a7a78] border-accent/50">
                                                <LucideIcons.CheckCircle2 className="w-3 h-3" />{" "}
                                                완납
                                            </span>
                                            ) : (
                                            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-xl border border-destructive/20">
                                                <LucideIcons.XCircle className="w-3 h-3" /> 미납
                                            </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}