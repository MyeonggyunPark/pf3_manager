import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { TabsList, TabsTrigger } from "../components/ui/Tabs";
import AddCourseModal from "../components/modals/AddCourseModal";
import InvoiceCreateModal from "../components/modals/InvoiceCreateModal";

// Chart color configuration
// 차트 색상 설정
const CHART_BAR_COLOR = "#4C72A9"; 
const CHART_LINE_COLOR = "#4C72A9"; 

// Styles mapping for course status badges
// 수강권 상태 배지를 위한 스타일 매핑
const statusStyles = {
    ACTIVE: "bg-accent/20 text-[#4a7a78] border-accent/50 hover:bg-accent/20 dark:text-accent-foreground",
    PAUSED: "bg-secondary/50 text-muted-foreground border-secondary hover:bg-secondary/50",
    FINISHED: "bg-success/20 text-[#5f6e63] border-success/50 hover:bg-success/20 dark:text-success-foreground",
};

// Helper to format currency in Euro
// 통화를 유로화 형식으로 변환하는 헬퍼 함수
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(amount || 0);
};

export default function CourseList() {
    const location = useLocation();

    // Translation hook for localized UI text
    // 다국어 UI 텍스트를 위한 번역 훅
    const { t, i18n } = useTranslation();

    // Language condition for style branching
    // 언어별 스타일 분기 조건
    const isGerman = i18n?.resolvedLanguage?.startsWith("de") || false;
    const locale = isGerman ? "de-DE" : "ko-KR";

    // Helper to format date string
    // 날짜 문자열 포맷팅 헬퍼 함수
    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        
        const formatted = new Date(dateStr).toLocaleDateString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        if (locale === "ko-KR") {
            return formatted.replace(/\s/g, "").replace(/\.$/, "");
        }
        
        return formatted;
    };

    // State for data and loading status
    // 데이터 및 로딩 상태 관리
    const [courses, setCourses] = useState([]);
    const [invoices, setInvoices] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // View State (Tab)
    // 탭 상태 관리 (courses: 수강권, receipts: 영수증)
    const [activeTab, setActiveTab] = useState("courses");

    // Course status labels per language
    // 언어별 수강권 상태 라벨
    const statusLabels = {
        ACTIVE: t("course_status_active"),
        PAUSED: t("course_status_paused"),
        FINISHED: t("course_status_finished"),
    };

    // Filter States (Year, Month, Payment, Sent Status)
    // 필터 상태 관리 (연도, 월, 결제 상태, 발송 상태)
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(
        location.state?.year ? Number(location.state.year) : currentYear,
    );
    const [selectedMonth, setSelectedMonth] = useState(
        location.state?.month ? Number(location.state.month) : 0,
    );
    const [paymentFilter, setPaymentFilter] = useState("ALL");
    const [isAllUnpaidMode, setIsAllUnpaidMode] = useState(false);
    
    // Sent status filter for Invoices
    // 영수증 발송 여부 필터
    const [sentFilter, setSentFilter] = useState("ALL");

    // Search State
    // 검색 상태 관리
    const [searchQuery, setSearchQuery] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    // Chart View Mode State (Revenue vs Student Count)
    // 차트 보기 모드 상태 (매출 vs 수강생 수)
    const [chartMode, setChartMode] = useState("REVENUE");

    // Modal States
    // 모달 상태 관리
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

    // Ref and State for scroll detection
    // 스크롤 감지를 위한 Ref와 State
    const tableBodyRef = useRef(null);
    const [hasScroll, setHasScroll] = useState(false);

    // --- Effect: Navigation State Handling ---
    // 네비게이션 상태 감지 및 필터 자동 적용
    // Triggered when location state changes (notification click)
    // 알림 클릭 등으로 location state가 변경될 때 트리거됨
    useEffect(() => {
        if (location.state?.view === "unpaid") {

            // Handle 'Unpaid Courses' notification click
            // '수강료 미납' 알림 클릭 처리
            setActiveTab("courses");
            setPaymentFilter("UNPAID");
            setIsAllUnpaidMode(true);
        } else if (location.state?.view === "unsent") {

            // Handle 'Unsent Invoices' notification click
            // '영수증 미발송' 알림 클릭 처리
            setActiveTab("receipts");
            setSentFilter("UNSENT");
        }
    }, [location]);

    // --- 1. Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                    // Fetch courses and invoices in parallel
                    // 수강권 목록과 영수증 목록을 병렬로 요청
                    const [cRes, iRes] = await Promise.all([
                    api.get("/api/courses/"),
                    api.get("/api/invoices/").catch(() => ({ data: [] })), 
                ]);

                setCourses(cRes.data);
                setInvoices(iRes.data);

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

    // Helper to download PDF
    // PDF 다운로드/열기 헬퍼 함수
    const handleDownloadPdf = async (e, invoiceId) => {
        e.stopPropagation(); // 행 클릭 이벤트 전파 방지
        try {
        const response = await api.get(
            `/api/invoices/${invoiceId}/download_pdf/`,
            {
            responseType: "blob",
            },
        );
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, "_blank");
        } catch (err) {
        console.error("PDF download failed", err);
        alert(t("course_alert_pdf_error"));
        }
    };

    // Helper to toggle sent status
    // 발송 여부 토글 헬퍼 함수
    const handleToggleSent = async (e, invoice) => {
        e.stopPropagation();

        const originalInvoices = [...invoices];
        const newStatus = !invoice.is_sent;

        setInvoices((prev) =>
        prev.map((inv) =>
            inv.id === invoice.id ? { ...inv, is_sent: newStatus } : inv,
        ),
        );

        try {
            await api.patch(`/api/invoices/${invoice.id}/`, { is_sent: newStatus });
            
            // Dispatch event to update notification count in Layout
            // 레이아웃의 알림 개수를 업데이트하기 위해 이벤트 발송
            window.dispatchEvent(new Event("notificationUpdated"));
        } catch (err) {
            console.error("Failed to update sent status", err);
            setInvoices(originalInvoices);
            alert(t("course_alert_status_error"));
        }
    };

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
            
            const studentName = (course.student_name || "").toLowerCase();
            const matchesSearch =
                appliedSearch === "" ||
                studentName.includes(appliedSearch.toLowerCase());

            return matchesPayment && matchesSearch;
        });

        return filtered.sort(
            (a, b) => new Date(b.start_date) - new Date(a.start_date),
        );
    }, [
        courses,
        coursesInPeriod,
        paymentFilter,
        isAllUnpaidMode,
        appliedSearch,
    ]);

    // Filtered Invoices (For Invoice Table)
    // 영수증 데이터 필터링 (영수증 테이블용)
    const filteredInvoices = useMemo(() => {
        return invoices
        .filter((invoice) => {
            const dateStr = invoice.date || invoice.created_at;
            const invoiceDate = new Date(dateStr);
            const matchesYear =
            invoiceDate.getFullYear() === parseInt(selectedYear);
            const matchesMonth =
            selectedMonth === 0 ||
            invoiceDate.getMonth() + 1 === parseInt(selectedMonth);

            const studentName = (invoice.student_name || "").toLowerCase();
            const matchesSearch =
            appliedSearch === "" ||
            studentName.includes(appliedSearch.toLowerCase());

            // Add Sent Status Filter Logic
            // 발송 상태 필터 로직 추가
            const matchesSent = 
                sentFilter === "ALL" ||
                (sentFilter === "SENT" && invoice.is_sent) ||
                (sentFilter === "UNSENT" && !invoice.is_sent);

            return matchesYear && matchesMonth && matchesSearch && matchesSent;
        })
        .sort(
            (a, b) =>
            new Date(b.date || b.created_at) - new Date(a.date || a.created_at),
        );
    }, [invoices, selectedYear, selectedMonth, appliedSearch, sentFilter]);

    // Scroll detection effect
    // 스크롤 감지 이펙트
    useLayoutEffect(() => {
        const checkScroll = () => {
        if (tableBodyRef.current) {
            const { scrollHeight, clientHeight } = tableBodyRef.current;
            setHasScroll(scrollHeight > clientHeight);
        }
        };

        checkScroll();

        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [filteredCourses, filteredInvoices, activeTab, isLoading]);

    // --- 4. Chart Data Preparation ---
    // Aggregate monthly revenue and count based on 'coursesInPeriod'
    // 'coursesInPeriod' 데이터를 기반으로 월별 매출 및 수강생 수 집계
    const chartData = useMemo(() => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthIndex = i + 1;
        // i18n.language를 사용하여 차트 라벨도 자동으로 현지화합니다.
        const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2026, i, 1));
        
        return {
            name: monthName, // '1월' 혹은 'Januar'가 직접 할당됨
            monthIndex: monthIndex,
            revenue: 0,
            count: 0,
        };
    });

    courses.forEach((course) => {
        const date = new Date(course.start_date);
        if (date.getFullYear() === parseInt(selectedYear)) {
            const month = date.getMonth();
            monthlyData[month].revenue += parseFloat(course.total_fee || 0);
            monthlyData[month].count += 1;
        }
    });

    return monthlyData;
}, [courses, selectedYear, i18n.language]);

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
        ? Math.max(...coursesInPeriod.map((c) => parseFloat(c.hourly_rate || 0)))
        : 0;

    // --- Handlers ---
    // Dispatch event on success to update notification count in Layout
    // 성공 시 레이아웃의 알림 개수를 업데이트하기 위해 이벤트 발송
    const handleSuccess = () => {
        setRefreshTrigger((prev) => prev + 1);
        window.dispatchEvent(new Event("notificationUpdated"));
    };

    const openCreateModal = () => {
        setSelectedCourse(null);
        setIsModalOpen(true);
    };

    const openEditModal = (course) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const openInvoiceModal = () => {
        setIsInvoiceModalOpen(true);
    };

    const handleYearChange = (e) => {
        setSelectedYear(Number(e.target.value));
        setIsAllUnpaidMode(false);
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(Number(e.target.value));
        setIsAllUnpaidMode(false);
    };

    const handleSearchClick = () => {
        setAppliedSearch(searchQuery);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
        handleSearchClick();
        }
    };

    // Helper to build KPI title by period
    // 기간 기준 KPI 제목 생성 헬퍼 함수
    const getPeriodTitle = (yearKey, monthKey) => {
        if (selectedMonth === 0) {
            return t(yearKey, { year: selectedYear });
        }

        const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2026, selectedMonth - 1, 1));
        
        return t(monthKey, { month: monthName });
    };

    return (
        <div className="flex flex-col space-y-4 animate-in">
            <AddCourseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                courseData={selectedCourse}
            />
            {/* Invoice Create Modal */}
            <InvoiceCreateModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                onSuccess={handleSuccess}
            />

            {/* --- Top Control Bar --- */}
            {/* 상단 컨트롤 바: 연도/월 선택 및 결제 필터 */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 shrink-0">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 w-full xl:w-auto flex-wrap">
                    {/* Tab Selection */}
                    {/* 탭 선택 영역 (Schedule/ExamResult 페이지 스타일 통일) */}
                    <TabsList className="bg-muted dark:bg-muted/50 w-full md:w-auto grid grid-cols-2">
                        <TabsTrigger
                        value="courses"
                        activeValue={activeTab}
                        onClick={() => {
                                setActiveTab("courses");
                                setSelectedYear(currentYear);
                                setSelectedMonth(0);
                                setPaymentFilter("ALL");
                                setSearchQuery("");
                                setAppliedSearch("");
                                setIsAllUnpaidMode(false);
                            }}
                        >
                        {t("course_tab_courses")}
                        </TabsTrigger>
                        <TabsTrigger
                        value="receipts"
                        activeValue={activeTab}
                        onClick={() => {
                                setActiveTab("receipts");
                                setSelectedYear(currentYear);
                                setSelectedMonth(0);
                                setSentFilter("ALL");
                                setSearchQuery("");
                                setAppliedSearch("");
                            }}
                        >
                        {t("course_tab_receipts")}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                        {/* Year filter */}
                        {/* 연도 필터 */}
                        <div className="relative w-full md:w-auto">
                            <select
                                value={selectedYear}
                                onChange={handleYearChange}
                                className={cn("h-10 w-full appearance-none rounded-xl border border-border bg-white dark:bg-card text-sm md:text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium",
                                    isGerman ? "md:w-22 px-4" : "md:w-24 px-3.5"
                                )}
                            >
                                {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {t("course_year_option", { year })}
                                </option>
                                ))}
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Month filter */}
                        {/* 월 필터 */}
                        <div className="relative w-full md:w-auto">
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className={cn("h-10 w-full appearance-none rounded-xl border border-border bg-white dark:bg-card text-sm md:text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium",
                                isGerman ? "md:w-32 px-4" : "md:w-26 px-4.5"
                            )}
                            >
                                <option value={0}>{t("course_filter_all_month")}</option>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const monthNumber = i + 1;
                                    const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2026, i, 1));
                                    
                                    return (
                                        <option key={monthNumber} value={monthNumber}>
                                            {monthName}
                                        </option>
                                    );
                                })}
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Payment Filter (Visible only on Courses tab) */}
                        {/* 결제 상태 필터 (수강권 탭에서만 표시) */}
                        {activeTab === "courses" && (
                        <div className="relative w-full md:w-auto">
                            <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className={cn("h-10 w-full appearance-none rounded-xl border border-border bg-white dark:bg-card text-sm md:text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium",
                            isGerman ? "md:w-34 px-4 md:px-3.5" : "md:w-28 px-4"
                            )}
                            >
                                <option value="ALL">{t("course_filter_all_payment")}</option>
                                <option value="PAID">{t("course_payment_paid")}</option>
                                <option value="UNPAID">{t("course_payment_unpaid")}</option>
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        )}

                        {/* Sent Status Filter (Visible only on Receipts tab) */}
                        {/* 발송 상태 필터 (영수증 탭에서만 표시) */}
                        {activeTab === "receipts" && (
                        <div className="relative w-full md:w-auto">
                            <select
                            value={sentFilter}
                            onChange={(e) => setSentFilter(e.target.value)}
                            className={cn("h-10 w-full appearance-none rounded-xl border border-border bg-white dark:bg-card text-sm md:text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium",
                            isGerman ? "md:w-38 px-4 md:px-4.5" : "md:w-28 px-4",
                            sentFilter === "UNSENT" && (isGerman ? "px-4 md:px-3.5" : "px-4.5")
                            )}
                            >
                                <option value="ALL">{t("course_filter_all_sent")}</option>
                                <option value="SENT">{t("course_sent_sent")}</option>
                                <option value="UNSENT">{t("course_sent_unsent")}</option>
                            </select>
                            <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        )}
                    </div>

                    {/* Search Input */}
                    {/* 검색 입력 */}
                    <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-2 group">
                        <div className={cn("relative flex-1 w-full md:w-48",
                            isGerman ? "md:w-50" : "md:w-48"
                        )}>
                            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors dark:text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={cn("flex h-10 w-full rounded-xl px-3 py-1 pl-10 focus:outline-none border border-border bg-white dark:bg-card focus:border-primary transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm md:text-md")}
                                placeholder={t("course_search_placeholder")}
                            />
                        </div>
                        <Button
                        variant="default"
                        onClick={handleSearchClick}
                        className="w-full md:w-auto h-9 px-3 md:px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer text-sm md:text-base"
                        >
                            {t("course_search_button")}
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                {/* 액션 버튼들 (수강권 등록 / 영수증 작성) */}
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    {activeTab === "courses" ? (
                        <Button
                        variant="default"
                        className="w-full xl:w-auto h-10 px-4 md:px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 text-sm md:text-base"
                        onClick={openCreateModal}
                        >
                            <LucideIcons.BookPlus className="w-4 h-4" />
                            {t("course_action_add_course")}
                        </Button>
                    ) : (
                        <Button
                        variant="default"
                        className="w-full xl:w-auto h-10 px-4 md:px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 text-sm md:text-base"
                        onClick={openInvoiceModal}
                        >
                                <LucideIcons.Receipt className="w-4 h-4" />
                                {t("course_action_add_invoice")}
                        </Button>
                    )}
                </div>
            </div>

            {/* --- Analytics & KPI Section --- */}
            {/* 통계 및 KPI 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 shrink-0">
                {/* KPI Cards - Responsive Layout */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-2 md:gap-3">
                    {/* 1. 총 수익 (Revenue) */}
                    <div className="flex-1 bg-white dark:bg-card border-2 border-primary px-3 md:px-5 py-1.5 md:py-3 rounded-xl shadow-sm">
                        <p className={cn("text-[11px] md:text-sm lg:text-md font-semibold text-primary mb-0.5 md:mb-1",
                            isGerman ? "tracking-normal" : "tracking-wider")}>
                            {getPeriodTitle("course_kpi_revenue_year", "course_kpi_revenue_month")}
                        </p>
                        <div className="flex justify-around md:justify-between md:items-end gap-2 md:gap-3 mt-2 md:mt-3">
                            <div className="flex gap-1 items-center bg-primary/10 text-primary px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit">
                                <LucideIcons.CreditCard className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                                <span className="whitespace-nowrap">
                                    {t("course_kpi_total_courses", { count: filteredCourses.length })}
                                </span>
                            </div>
                            <h3 className="text-base md:text-2xl font-bold text-primary tracking-tight">
                                {formatCurrency(totalRevenue)}
                            </h3>
                        </div>
                    </div>

                    {/* 총 수업 시간 (Total Hours) */}
                    <div className="flex-1 bg-white dark:bg-card border-2 border-accent px-3 md:px-5 py-1.5 md:py-3 rounded-xl shadow-sm">
                        <p className={cn("text-[11px] md:text-sm lg:text-md font-semibold text-[#4a7a78] dark:text-accent-foreground mb-0.5 md:mb-1",
                            isGerman ? "tracking-normal" : "tracking-wider")}>
                            {getPeriodTitle("course_kpi_hours_year", "course_kpi_hours_month")}
                        </p>
                        <div className="flex justify-around md:justify-between md:items-end gap-2 md:gap-3 mt-2 md:mt-3">
                            <div className="flex gap-1 items-center bg-accent/20 text-[#4a7a78] dark:text-accent-foreground px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit">
                                <LucideIcons.BarChart className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-[#4a7a78] dark:text-accent-foreground" />
                                <span className="whitespace-nowrap">
                                    {t("course_kpi_avg_hours_per_course", { value: avgHoursPerCourse })}
                                </span>
                            </div>
                            <h3 className="text-base md:text-2xl font-bold text-[#4a7a78] dark:text-accent-foreground tracking-tight">
                                {Number.isInteger(totalHours)
                                ? totalHours
                                : totalHours.toFixed(1)}
                                {t("course_hour_text")}
                            </h3>
                        </div>
                    </div>

                    {/* 평균 시간당 수익 (Hourly Rate) */}
                    <div className="flex-1 bg-white dark:bg-card border-2 border-warning px-3 md:px-5 py-1.5 md:py-3 rounded-xl shadow-sm">
                        <p className={cn("text-[11px] md:text-sm lg:text-md font-semibold text-[#b8a05e] dark:text-warning mb-0.5 md:mb-1",
                            isGerman ? "tracking-normal" : "tracking-wider")}>
                            {getPeriodTitle("course_kpi_hourly_year", "course_kpi_hourly_month")}
                        </p>
                        <div className="flex justify-around md:justify-between md:items-end gap-2 md:gap-3 mt-2 md:mt-3">
                            <div className="flex gap-1 items-center bg-warning/20 text-[#b8a05e] dark:text-warning px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit">
                                <LucideIcons.Coins className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-[#b8a05e] dark:text-warning" />
                                <span className="whitespace-nowrap">
                                    {t("course_kpi_max_hourly", { value: formatCurrency(maxHourlyRate) })}
                                </span>
                            </div>
                            <h3 className="text-base md:text-2xl font-bold text-[#b8a05e] dark:text-warning tracking-tight">
                                {formatCurrency(avgHourlyRate)}/h
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Chart (Right) */}
                {/* 차트 영역 */}
                <div className="col-span-1 md:col-span-2 lg:col-span-8 bg-white dark:bg-card p-3 md:p-5 rounded-xl border border-border shadow-sm flex flex-col">
                    <div className="flex justify-between items-center gap-2 sm:gap-3 mb-3 md:mb-4 pl-1">
                        <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-foreground flex items-center gap-2">
                            <LucideIcons.BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                            {t("course_chart_title", { year: selectedYear })}
                        </h3>

                        {/* Chart Toggle Buttons */}
                        {/* 차트 모드 전환 버튼 */}
                        <div className="flex bg-muted dark:bg-muted/60 p-1 rounded-lg w-23 sm:w-auto">
                            <button
                                onClick={() => setChartMode("REVENUE")}
                                className={cn(
                                "text-[11px] md:text-[13px] px-2 md:px-3 py-0.5 md:py-1 rounded-md transition-all cursor-pointer",
                                chartMode === "REVENUE"
                                    ? "bg-white dark:bg-card text-primary font-semibold shadow-sm"
                                    : "text-slate-500 dark:text-muted-foreground hover:bg-card/40 hover:font-semibold hover:text-primary dark:hover:bg-secondary/50 dark:hover:text-foreground",
                                )}
                            >
                                {t("course_chart_revenue")}
                            </button>
                            <button
                                onClick={() => setChartMode("COUNT")}
                                className={cn(
                                "text-[11px] md:text-[13px] px-2 md:px-3 py-0.5 md:py-1 rounded-md transition-all cursor-pointer",
                                chartMode === "COUNT"
                                    ? "bg-white dark:bg-card text-primary font-semibold shadow-sm"
                                    : "text-slate-500 dark:text-muted-foreground hover:bg-card/40 hover:font-semibold hover:text-primary dark:hover:bg-secondary/50 dark:hover:text-foreground",
                                )}
                            >
                                {t("course_chart_students")}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-32 md:min-h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* Conditional Rendering for Chart Type */}
                            {/* 차트 모드에 따른 조건부 렌더링 */}
                            {chartMode === "REVENUE" ? (
                                <BarChart
                                data={chartData}
                                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                                >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--color-border)"
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                    fill: "var(--color-muted-foreground)",
                                    fontSize: 10,
                                    }}
                                    dy={5}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                    fill: "var(--color-muted-foreground)",
                                    fontSize: 9,
                                    }}
                                    tickFormatter={(value) =>
                                    `€${value.toLocaleString("de-DE")}`
                                    }
                                    width={45}
                                />
                                <Tooltip
                                    cursor={{ fill: "var(--color-muted)", opacity: 0.15 }}
                                    contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid var(--color-border)",
                                    backgroundColor: "var(--color-card)",
                                    color: "var(--color-card-foreground)",
                                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                    fontSize: "11px",
                                    }}
                                    formatter={(value) => [formatCurrency(Number(value) || 0), t("course_chart_revenue")]}
                                />
                                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={20}>
                                    {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                        selectedMonth !== 0
                                            ? entry.monthIndex === selectedMonth
                                            ? CHART_BAR_COLOR
                                            : "var(--color-muted)"
                                            : CHART_BAR_COLOR
                                        }
                                    />
                                    ))}
                                </Bar>
                                </BarChart>
                            ) : (
                                <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 20, left: -15, bottom: 0 }}
                                >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--color-border)"
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                    fill: "var(--color-muted-foreground)",
                                    fontSize: 10,
                                    }}
                                    dy={5}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                    fill: "var(--color-muted-foreground)",
                                    fontSize: 9,
                                    }}
                                    allowDecimals={false}
                                    domain={[0, (dataMax) => (dataMax < 5 ? 5 : dataMax)]}
                                    width={35}
                                />
                                <Tooltip
                                    contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid var(--color-border)",
                                    backgroundColor: "var(--color-card)",
                                    color: "var(--color-card-foreground)",
                                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                    fontSize: "11px",
                                    }}
                                    formatter={(value) => [
                                        `${t("course_currency_symbol")}${value.toLocaleString("de-DE")}`
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke={CHART_LINE_COLOR}
                                    strokeWidth={3}
                                    dot={{
                                    r: 4,
                                    fill: CHART_LINE_COLOR,
                                    strokeWidth: 2,
                                    stroke: "#fff",
                                    }}
                                    activeDot={{ r: 6 }}
                                />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- Detailed List Section --- */}
            {/* 상세 리스트 섹션 (테이블) - 탭에 따라 테이블 내용 변경 */}
            <div className="bg-white dark:bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col mt-2 md:mt-3">
                <div
                className={cn(
                    "bg-slate-50 dark:bg-muted/30 border-b border-border overflow-x-auto custom-scrollbar",
                    hasScroll ? "pr-2.75" : "",
                )}
                >
                    <table className="w-full text-md table-fixed min-w-150">
                        <thead className="text-[10px] md:text-base text-slate-500 dark:text-muted-foreground">
                            <tr>
                                {activeTab === "courses" ? (
                                    <>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[18%]">
                                            {t("course_table_student")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[22%]">
                                            {t("course_table_period_course")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[8%]">
                                            {t("course_table_hours")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[12%]">
                                            {t("course_table_hourly_rate")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[14%]">
                                            {t("course_table_amount")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[13%]">
                                            {t("course_table_status")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[13%]">
                                            {t("course_table_payment")}
                                        </th>
                                    </>
                                ) : (
                                    // Invoice Table Headers
                                    // 영수증 테이블 헤더
                                    <>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[15%]">
                                            {t("course_invoice_number")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[15%]">
                                            {t("course_table_student")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[12%]">
                                            {t("course_invoice_issue_date")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[12%]">
                                            {t("course_invoice_due_date")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[26%]">
                                            {t("course_invoice_period")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[10%]">
                                            {t("course_sent_sent")}
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 font-semibold text-center w-[10%]">
                                            {t("course_invoice_file")}
                                        </th>
                                    </>
                                )}
                            </tr>
                        </thead>
                    </table>
                </div>

                <div
                ref={tableBodyRef}
                className="h-75 sm:h-125 overflow-y-auto custom-scrollbar"
                >
                    <table
                        className={cn(
                        "w-full text-sm table-fixed min-w-150",
                        (activeTab === "courses" ? filteredCourses : filteredInvoices)
                            .length === 0
                            ? "h-full"
                            : "",
                        )}
                    >
                        <tbody
                        className={cn(
                            "divide-y divide-slate-50 dark:divide-border/50",
                            (activeTab === "courses" ? filteredCourses : filteredInvoices)
                            .length === 0
                            ? "h-full"
                            : "",
                        )}
                        >
                            {activeTab === "courses" ? (
                                // Course List
                                // 수강권 목록
                                filteredCourses.length === 0 ? (
                                <tr className="h-full">
                                    <td
                                        colSpan="7"
                                        className="px-6 py-12 text-center text-sm h-full align-middle"
                                    >
                                        <div className="flex flex-col justify-center items-center h-full gap-2 text-muted-foreground/70">
                                            <LucideIcons.SearchX className="w-8 h-8" />
                                            <p className="font-semibold">
                                                {t("course_empty_courses")}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                ) : (
                                filteredCourses.map((course) => (
                                    <tr
                                    key={course.id}
                                    // Apply visual emphasis for unpaid courses (Left border + Light Red Background)
                                    // 미납 수강권 시각적 강조 적용 (좌측 테두리 + 연한 붉은 배경)
                                    className={cn(
                                        "transition-colors border-l-4 cursor-pointer group",
                                        !course.is_paid
                                        ? "border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/10 hover:bg-destructive/10"
                                        : "border-transparent hover:border-l-slate-50 dark:hover:border-l-muted/50 hover:bg-slate-50 dark:hover:bg-muted/50",
                                    )}
                                    onClick={() => openEditModal(course)}
                                    >
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-800 dark:text-foreground truncate w-[18%] group-hover:text-primary text-xs md:text-sm">
                                            <span className="font-bold">
                                                {course.student_name || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[22%] text-xs md:text-sm">
                                            {formatDate(course.start_date)} ~{" "}
                                            {formatDate(course.end_date)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[8%] text-xs md:text-sm">
                                            {Number(course.total_hours)}{t("course_hour_suffix")}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[12%] text-xs md:text-sm">
                                            {formatCurrency(course.hourly_rate)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center font-bold text-slate-800 dark:text-card-foreground w-[14%] text-xs md:text-sm">
                                            {formatCurrency(course.total_fee)}
                                        </td>
                                        <td className="px-1 py-3 md:py-4 text-center w-[13%]">
                                            <div className="flex justify-center items-center w-full">
                                                <Badge
                                                    className={cn(
                                                    "text-[11px] px-2 py-0.5 border font-medium shadow-none justify-center min-w-12.5",
                                                    statusStyles[course.status],
                                                    )}
                                                >
                                                    {statusLabels[course.status]}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center w-[13%]">
                                            <div className="flex justify-center items-center w-full">
                                                {course.is_paid ? (
                                                    <span className="inline-flex items-center gap-0.5 md:gap-1 text-[9px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-xl border bg-accent/20 text-[#4a7a78] dark:text-accent-foreground border-accent/50">
                                                        <LucideIcons.CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />{" "}
                                                        {t("course_payment_paid")}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5 md:gap-1 text-[9px] md:text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 md:px-2 py-0.5 rounded-xl border border-destructive/20">
                                                        <LucideIcons.XCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />{" "}
                                                        {t("course_payment_unpaid")}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )
                            ) :
                            // Invoice List
                            // 영수증 목록
                            filteredInvoices.length === 0 ? (
                                <tr className="h-full"> 
                                    <td
                                        colSpan="7"
                                        className="px-6 py-12 text-center text-sm h-full align-middle"
                                    >
                                        <div className="flex flex-col justify-center items-center h-full gap-2 text-muted-foreground/70">
                                            <LucideIcons.SearchX className="w-8 h-8" />
                                            <p className="font-semibold">
                                                {t("course_empty_invoices")}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className={cn(
                                        "transition-colors border-l-4 border-l-card",
                                        !invoice.is_sent
                                        ? "border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/10"
                                        : "",
                                    )}
                                    >
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center font-bold text-slate-800 dark:text-foreground w-[15%] text-xs md:text-sm">
                                        {invoice.full_invoice_code || invoice.invoice_number}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center font-bold text-slate-800 dark:text-foreground w-[15%] text-xs md:text-sm">
                                        {invoice.student_name || "Unknown"}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[12%] text-xs md:text-sm">
                                        {formatDate(invoice.date || invoice.created_at)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[12%] text-xs md:text-sm">
                                        {formatDate(invoice.due_date)}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-500 dark:text-muted-foreground w-[26%] text-xs md:text-sm">
                                        {formatDate(invoice.delivery_date_start)}
                                        {invoice.delivery_date_end
                                            ? ` ~ ${formatDate(invoice.delivery_date_end)}`
                                            : ""}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center w-[10%]">
                                        <div className="flex justify-center items-center w-full">
                                            <button
                                            onClick={(e) => handleToggleSent(e, invoice)}
                                            className={cn(
                                                "w-4 md:w-5 h-4 md:h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                invoice.is_sent
                                                ? "bg-accent border-accent text-white"
                                                : "border-border bg-card hover:border-accent hover:bg-accent/10",
                                            )}
                                            >
                                            {invoice.is_sent && (
                                                <LucideIcons.Check className="w-3 md:w-3.5 h-3 md:h-3.5 stroke-[3px]" />
                                            )}
                                            </button>
                                        </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 md:py-4 text-center w-[10%]">
                                        <Button
                                            variant=""
                                            size="icon"
                                            className="h-7 md:h-8 w-7 md:w-8 transition-colors cursor-pointer text-primary/50 hover:text-primary"
                                            onClick={(e) => handleDownloadPdf(e, invoice.id)}
                                        >
                                            <LucideIcons.FileText className="w-4 md:w-5 h-4 md:h-5" />
                                        </Button>
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
