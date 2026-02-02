import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LabelList,
} from "recharts";
import api from "../api";
import { cn } from "../lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { TabsList, TabsTrigger } from "../components/ui/Tabs";
import AddMockExamModal from "../components/modals/AddMockExamModal";
import AddOfficialExamModal from "../components/modals/AddOfficialExamModal";

// Chart color configuration
// 차트 색상 설정
const CHART_COLORS = {
  primary: "#4C72A9",
  success: "#9EAFA2",
  destructive: "#AD5D5D",
  accent: "#78C0BE",
  muted: "#E2E8F0",
  text: "#64748B",
};

// Styles mapping for exam result badges
// 시험 결과 배지를 위한 스타일 매핑
const examResultStyles = {
  PASSED:
    "bg-accent/20 text-[#4a7a78] border-accent/50 hover:bg-accent/20 dark:text-accent-foreground",
  FAILED:
    "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
  WAITING: "bg-muted/50 text-muted-foreground border-border hover:bg-muted/50",
};

const EXAM_MODE_LABELS = {
  FULL: "Gesamt",
  WRITTEN: "Schriftlich",
  ORAL: "Mündlich",
};

const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// FilePopover Component
// 파일 팝오버 컴포넌트
const FilePopover = ({ attachments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const togglePopover = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    setIsOpen(!isOpen);
  };

  useLayoutEffect(() => {
    const handleClose = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener("click", handleClose);
      window.addEventListener("resize", handleClose);
      const scrollContainer = document.querySelector('.custom-scrollbar'); 
      if(scrollContainer) scrollContainer.addEventListener('scroll', handleClose);
    }
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("resize", handleClose);
      const scrollContainer = document.querySelector('.custom-scrollbar');
      if(scrollContainer) scrollContainer.removeEventListener('scroll', handleClose);
    };
  }, [isOpen]);

  if (!attachments || attachments.length === 0) {
    return <span className="text-slate-300 text-xs">-</span>;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePopover}
        className="transition-colors cursor-pointer text-primary/50 hover:text-primary"
      >
        <LucideIcons.Paperclip className="w-5 h-5" />
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed z-9999 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 rotate-45"></div>

            <div className="p-1 flex flex-col max-h-60 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                첨부파일 목록 ({attachments.length})
              </div>
              {attachments.map((file, index) => {
                let fileName = "파일";
                if (file.original_name) fileName = file.original_name;
                else if (file.file) {
                  try {
                    fileName = decodeURIComponent(file.file.split("/").pop().split("?")[0]);
                  } catch {
                    fileName = "Unknown File";
                  }
                }

                return (
                  <a
                    key={file.id || index}
                    href={file.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors group"
                    title={fileName}
                  >
                    <LucideIcons.FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary shrink-0" />
                    <span className="truncate flex-1 text-left text-xs">
                      {fileName}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
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

// Helper to format score numbers
// 점수 숫자 포맷팅 헬퍼 함수
const formatScore = (score) => {
  if (score === undefined || score === null || score === "") return "-";
  return Number(score).toLocaleString("de-DE");
};

export default function ExamResults() {
  // Loading and Navigation State
  // 로딩 및 네비게이션 상태
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Filter States (Year, Tab, Search, Level, Status)
  // 필터 상태 관리 (연도, 탭, 검색, 레벨, 상태)
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState("all");
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "mock");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // State for focused student analysis
  // 특정 학생 상세 분석을 위한 상태
  const [focusedStudent, setFocusedStudent] = useState(null);

  // Modal and Data States
  // 모달 및 데이터 상태 관리
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [isOfficialModalOpen, setIsOfficialModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [officialExams, setOfficialExams] = useState([]);
  const [mockExams, setMockExams] = useState([]);

  // Ref and State for scroll detection
  // 스크롤 감지를 위한 Ref와 State
  const tableBodyRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  // --- 1. Fetch Available Years ---
  // API에서 사용 가능한 연도 목록 조회
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const [officialRes, mockRes] = await Promise.all([
          api.get("/api/official-results/"),
          api.get("/api/exam-records/"),
        ]);

        const yearsSet = new Set();
        yearsSet.add(currentYear);

        officialRes.data.forEach((exam) => {
          if (exam.exam_date)
            yearsSet.add(new Date(exam.exam_date).getFullYear());
        });
        mockRes.data.forEach((exam) => {
          if (exam.exam_date)
            yearsSet.add(new Date(exam.exam_date).getFullYear());
        });

        const sorted = Array.from(yearsSet).sort((a, b) => b - a);
        setAvailableYears(sorted);
      } catch (e) {
        console.error("Failed to fetch years", e);
      }
    };
    fetchYears();
  }, [refreshTrigger, currentYear]);

  // --- 2. Data Fetching ---
  // 초기 시험 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [officialRes, mockRes] = await Promise.all([
          api.get("/api/official-results/"),
          api.get("/api/exam-records/"),
        ]);

        setOfficialExams(officialRes.data);
        setMockExams(mockRes.data);
      } catch (e) {
        console.error("Failed to load exam data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // --- 3. Official Exam Statistics Calculation ---
  // 정규 시험 통계 계산 (KPI 및 차트용 데이터)
  const officialStats = useMemo(() => {
    let data = [...officialExams];
    if (selectedYear !== "all") {
      data = data.filter((e) => {
        if (!e.exam_date) return false;
        return new Date(e.exam_date).getFullYear() === selectedYear;
      });
    }

    const total = data.filter((e) => e.status !== "WAITING").length;
    const passed = data.filter((e) => e.status === "PASSED").length;
    const waiting = data.filter((e) => e.status === "WAITING").length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const levelMap = {};
    data.forEach((exam) => {
      if (exam.status === "WAITING") return;
      const level = exam.student_level || "Unknown";
      if (!levelMap[level]) levelMap[level] = { passed: 0, failed: 0 };
      if (exam.status === "PASSED") levelMap[level].passed++;
      else if (exam.status === "FAILED") levelMap[level].failed++;
    });

    const chartData = Object.keys(levelMap)
      .sort()
      .map((lvl) => {
        const p = levelMap[lvl].passed;
        const f = levelMap[lvl].failed;
        const sum = p + f;
        const rate = sum > 0 ? Math.round((p / sum) * 100) : 0;

        return {
          level: lvl,
          passed: p,
          failed: f,
          rate: rate,
        };
      });

    return { total, passed, waiting, passRate, chartData };
  }, [officialExams, selectedYear]);

  // --- 4. Filter Logic for Official Exams ---
  // 정규 시험 목록 필터링 로직
  const filteredOfficialList = useMemo(() => {
    let data = [...officialExams];

    if (selectedYear !== "all") {
      data = data.filter((e) => {
        if (!e.exam_date) return false;
        return new Date(e.exam_date).getFullYear() === selectedYear;
      });
    }

    if (levelFilter && levelFilter !== "") {
      data = data.filter((e) => e.student_level === levelFilter);
    }

    if (statusFilter && statusFilter !== "all") {
      data = data.filter((e) => e.status === statusFilter);
    }

    if (appliedSearch && appliedSearch.trim() !== "") {
      const query = appliedSearch.toLowerCase();
      data = data.filter((e) => e.student_name?.toLowerCase().includes(query));
    }

    return data.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
  }, [officialExams, levelFilter, statusFilter, appliedSearch, selectedYear]);

  // --- 5. Filter Logic for Mock Exams ---
  // 모의고사 목록 필터링 로직
  const filteredMockList = useMemo(() => {
    let data = [...mockExams];

    if (selectedYear !== "all") {
      data = data.filter((e) => {
        if (!e.exam_date) return false;
        return new Date(e.exam_date).getFullYear() === selectedYear;
      });
    }

    if (levelFilter && levelFilter !== "") {
      data = data.filter((e) => e.student_level === levelFilter);
    }
    if (appliedSearch && appliedSearch.trim() !== "") {
      const query = appliedSearch.toLowerCase();
      data = data.filter((e) => e.student_name?.toLowerCase().includes(query));
    }
    if (focusedStudent) {
      data = data.filter((e) => e.student_name === focusedStudent);
    }
    return data.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
  }, [mockExams, levelFilter, appliedSearch, focusedStudent, selectedYear]);

  // --- 6. Personal Stats Calculation (Trend & Weakness) ---
  // 특정 학생의 통계 계산 (점수 추이 차트 및 취약 영역 레이더 차트)
  const personalStats = useMemo(() => {
    if (!focusedStudent || filteredMockList.length === 0) return null;

    // Sort by Date for Trend Chart
    // 추이 차트를 위해 날짜순 정렬
    const trendDataRaw = [...filteredMockList].sort(
      (a, b) => new Date(a.exam_date) - new Date(b.exam_date),
    );

    // Prepare Line Chart Data
    // 라인 차트 데이터 준비
    const trendChart = trendDataRaw.map((e) => ({
      date: formatDate(e.exam_date),
      shortDate: new Date(e.exam_date).toLocaleDateString("de-DE", {
        month: "2-digit",
        day: "2-digit",
      }),
      score: Number(e.total_score || 0),
      max: Number(e.max_score || 100),
      examName: e.exam_name,
    }));

    const totalScore = trendDataRaw.reduce(
      (sum, e) => sum + Number(e.total_score || 0),
      0,
    );
    const avgScore = Math.round(totalScore / trendDataRaw.length);

    // Aggregate Scores for Weakness Analysis (Radar Chart)
    // 취약점 분석을 위한 점수 집계 (레이더 차트)
    const categoryMap = {};
    trendDataRaw.forEach((exam) => {
      const processedSections = new Set();

      // Process manual input scores
      // 수동 입력 점수 처리
      if (exam.score_inputs && Array.isArray(exam.score_inputs)) {
        exam.score_inputs.forEach((input) => {
          const catName = input.category || "Unbekannt";
          const score = Number(input.score || 0);
          const max = Number(input.section_max_score || 0);
          if (!categoryMap[catName])
            categoryMap[catName] = { obtained: 0, total: 0 };
          categoryMap[catName].obtained += score;
          categoryMap[catName].total += max;
        });
      }

      // Process detail results (auto-graded)
      // 상세 결과 처리 (자동 채점)
      if (exam.detail_results && Array.isArray(exam.detail_results)) {
        exam.detail_results.forEach((detail) => {
          const catName = detail.category || "Unbekannt";
          const points = Number(detail.points || 1);
          const sectionId = detail.exam_section;
          const sectionMax = Number(detail.section_max_score || 0);
          if (!categoryMap[catName])
            categoryMap[catName] = { obtained: 0, total: 0 };
          if (detail.is_correct) {
            categoryMap[catName].obtained += points;
          }
          if (!processedSections.has(sectionId)) {
            categoryMap[catName].total += sectionMax;
            processedSections.add(sectionId);
          }
        });
      }
    });

    const weaknessChart = Object.keys(categoryMap).map((key) => {
      const item = categoryMap[key];
      const accuracy =
        item.total > 0 ? Math.round((item.obtained / item.total) * 100) : 0;
      return { category: key, accuracy };
    });

    // Determine Weakest Category
    // 가장 취약한 영역 결정
    let weakestCategory = "-";
    let weakestScore = 0;
    if (weaknessChart.length > 0) {
      const sortedWeakness = [...weaknessChart].sort(
        (a, b) => a.accuracy - b.accuracy,
      );
      weakestCategory = sortedWeakness[0].category;
      weakestScore = sortedWeakness[0].accuracy;
    }
    return {
      avgScore,
      count: trendDataRaw.length,
      trendChart,
      weaknessChart,
      weakestCategory,
      weakestScore,
    };
  }, [filteredMockList, focusedStudent]);

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
  }, [filteredMockList, filteredOfficialList, activeTab]);

  // --- Handlers ---

  // Refresh data on success
  // 성공 시 데이터 새로고침
  const handleSuccess = () => setRefreshTrigger((p) => p + 1);

  // Toggle student selection for detailed view
  // 상세 보기를 위한 학생 선택 토글
  const handleRowClick = (studentName) => {
    if (focusedStudent === studentName) {
      setFocusedStudent(null);
    } else {
      setFocusedStudent(studentName);
    }
  };

  // Open modal with selected exam data for editing
  // 수정을 위해 선택된 시험 데이터로 모달 열기
  const handleEditClick = (e, exam, type) => {
    e.stopPropagation();
    setSelectedExam(exam);
    if (type === "mock") setIsMockModalOpen(true);
    else setIsOfficialModalOpen(true);
  };

  // Clear focused student to reset view
  // 뷰 초기화를 위해 선택된 학생 해제
  const handleResetAnalysis = () => {
    setFocusedStudent(null);
  };

  // Apply search query and clear focus
  // 검색어 적용 및 포커스 해제
  const handleSearchClick = () => {
    setAppliedSearch(searchQuery);
    setFocusedStudent(null);
  };

  // Handle Enter key for search
  // 검색을 위한 엔터키 처리
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <LucideIcons.Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Custom Tooltip component for Bar Chart
  // 바 차트를 위한 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border p-3 rounded-lg shadow-lg text-sm">
          <p className="font-bold mb-2 text-slate-800 dark:text-foreground">
            {label}
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.accent }}
                />
                합격
              </span>
              <span className="font-semibold text-slate-700 dark:text-foreground">
                {data.passed}명
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.destructive }}
                />
                불합격
              </span>
              <span className="font-semibold text-slate-700 dark:text-foreground">
                {data.failed}명
              </span>
            </div>
            <div className="border-t border-slate-100 dark:border-border mt-1 pt-1 flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-primary">합격률</span>
              <span className="font-bold text-primary">{data.rate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Legend component for Bar Chart
  // 바 차트를 위한 커스텀 범례 컴포넌트
  const renderLegend = () => {
    return (
      <ul className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-xs"
            style={{ backgroundColor: CHART_COLORS.accent }}
          />
          <span className="font-medium text-slate-600 dark:text-foreground">
            합격
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-xs"
            style={{ backgroundColor: CHART_COLORS.destructive }}
          />
          <span className="font-medium text-slate-600 dark:text-foreground">
            불합격
          </span>
        </li>
      </ul>
    );
  };

  return (
    <div className="space-y-6 animate-in flex flex-col h-[calc(100vh-200px)]">
      {/* Modals */}
      {/* 모달 컴포넌트 */}
      <AddMockExamModal
        isOpen={isMockModalOpen}
        onClose={() => setIsMockModalOpen(false)}
        onSuccess={handleSuccess}
        examData={selectedExam}
      />
      <AddOfficialExamModal
        isOpen={isOfficialModalOpen}
        onClose={() => setIsOfficialModalOpen(false)}
        onSuccess={handleSuccess}
        examData={selectedExam}
      />

      {/* Filter and Control Bar */}
      {/* 필터 및 컨트롤 바 */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-7 w-full xl:w-auto justify-end">
          {/* Tab Selector */}
          {/* 탭 선택기 */}
          <TabsList className="w-full sm:w-auto h-10 dark:bg-muted/50">
            <TabsTrigger
              value="mock"
              activeValue={activeTab}
              onClick={() => {
                setActiveTab("mock");
                setFocusedStudent(null);
                setSelectedYear("all");
                setLevelFilter("");
                setStatusFilter("all");
              }}
            >
              모의고사
            </TabsTrigger>
            <TabsTrigger
              value="official"
              activeValue={activeTab}
              onClick={() => {
                setActiveTab("official");
                setFocusedStudent(null);
                setSelectedYear("all");
                setLevelFilter("");
                setStatusFilter("all");
              }}
            >
              정규 시험
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
            {/* Year Filter */}
            {/* 연도 필터 */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  );
                  setFocusedStudent(null);
                }}
                className="h-10 w-full sm:w-32 rounded-xl border border-border bg-white dark:bg-card px-4 text-md font-medium focus:outline-none focus:border-primary cursor-pointer text-foreground appearance-none pr-8"
              >
                <option value="all">전체(년도)</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in slide-in-from-left-2">
              {/* Level Filter */}
              {/* 레벨 필터 */}
              <div className="relative">
                <select
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value);
                    setFocusedStudent(null);
                  }}
                  className="h-10  w-full sm:w-29 rounded-xl border border-border bg-white dark:bg-card px-3 text-md font-medium focus:outline-none focus:border-primary cursor-pointer text-foreground appearance-none"
                >
                  <option value="">전체(레벨)</option>
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Status Filter (Official Tab Only) */}
              {/* 상태 필터 (정규 시험 탭 전용) */}
              {activeTab === "official" && (
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full sm:w-29 rounded-xl border border-border bg-white dark:bg-card px-3 text-md font-medium focus:outline-none focus:border-primary cursor-pointer text-foreground appearance-none"
                  >
                    <option value="all">전체(결과)</option>
                    <option value="WAITING">대기</option>
                    <option value="PASSED">합격</option>
                    <option value="FAILED">불합격</option>
                  </select>
                  <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              )}

              {/* Search Input */}
              {/* 검색 입력 */}
              <div className="flex items-center w-full sm:w-auto gap-2 group">
                <div className="relative flex-1 sm:w-48">
                  <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors dark:text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex h-10 w-full rounded-xl px-3 py-1 pl-10 focus:outline-none border border-border bg-white dark:bg-card focus:border-primary transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-md"
                    placeholder="학생 이름 입력"
                  />
                </div>
              </div>
              <Button
                variant="default"
                onClick={handleSearchClick}
                className="w-full xl:w-auto h-9 px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer"
              >
                검색
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setSelectedExam(null);
            activeTab === "mock"
              ? setIsMockModalOpen(true)
              : setIsOfficialModalOpen(true);
          }}
          className="h-10 px-5 bg-primary text-white shadow-md hover:bg-primary/90 w-full sm:w-auto flex items-center justify-center cursor-pointer"
        >
          {activeTab === "mock" ? (
            <>
              <LucideIcons.FilePlus className="w-4 h-4 mr-2" /> 모의고사 추가
            </>
          ) : (
            <>
              <LucideIcons.GraduationCap className="w-4 h-4 mr-2" /> 정규시험
              추가
            </>
          )}
        </Button>
      </div>

      {/* KPI & Chart Section */}
      {/* KPI 및 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 shrink-0">
        {activeTab === "mock" &&
          (!focusedStudent ? (
            // Mock Exam Empty Selection State
            // 모의고사 학생 미선택 상태
            <Card className="col-span-12 bg-white dark:bg-card border-slate-100 dark:border-border flex flex-col items-center justify-center h-52 transition-all animate-in fade-in duration-500">
              <div className="text-center text-muted-foreground/70">
                <div className="bg-slate-50 dark:bg-muted/20 p-3.5 rounded-full inline-block mt-2 mb-2 ring-1 ring-slate-100 dark:ring-border/50">
                  <LucideIcons.FileBarChart className="w-8 h-8 text-slate-300 dark:text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg text-primary">
                    학생별 상세 분석
                  </h3>
                  <p className="text-sm max-w-sm mx-auto text-slate-500 dark:text-muted-foreground">
                    아래 목록에서 학생을 선택하면
                    <br />
                    선택된 학생의 {""}{" "}
                    <strong>평균 점수, 취약 영역, 점수 추이</strong>를<br />
                    확인 할 수 있습니다.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            // Mock Exam Selected Student Analysis
            // 모의고사 선택된 학생 분석
            <>
              <div className="lg:col-span-3 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                <Card className="flex-1 shadow-sm bg-white dark:bg-card relative overflow-hidden border-2 border-primary">
                  <button
                    onClick={handleResetAnalysis}
                    className="absolute top-2 right-2 p-1 hover:bg-slate-100 dark:hover:bg-muted rounded-full text-slate-400 dark:text-muted-foreground transition-colors cursor-pointer z-10"
                    title="분석 닫기"
                  >
                    <LucideIcons.X className="w-4 h-4" />
                  </button>
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-primary uppercase tracking-wider">
                      평균 점수
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm font-bold bg-primary/10 text-primary/80 px-2.5 py-1 rounded-full">
                      총 {personalStats?.count}회 응시
                    </span>
                    <div className="flex justify-end items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-primary pb-2">
                          {personalStats?.avgScore}
                        </span>
                        <span className="text-sm text-primary/80">점</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 shadow-sm bg-white dark:bg-card border-2 border-destructive">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-destructive uppercase tracking-wider">
                      취약 영역
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm font-bold bg-destructive/10 text-destructive/80 px-2.5 py-1 rounded-full">
                      정답률 {personalStats?.weakestScore}%
                    </span>
                    <div className="flex justify-end items-center">
                      <span className="text-xl font-bold text-destructive mt-3">
                        {personalStats?.weakestCategory}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-700">
                {/* Trend Line Chart */}
                <Card className="shadow-sm border-none bg-white dark:bg-card h-full">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                      <LucideIcons.TrendingUp className="w-4 h-4 text-primary" />{" "}
                      점수 변화 추이
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-70 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={personalStats?.trendChart}
                        margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--color-border)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="shortDate"
                          tick={{
                            fontSize: 11,
                            fill: "var(--color-muted-foreground)",
                          }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "var(--color-muted-foreground)",
                          }}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-card)",
                            color: "var(--color-card-foreground)",
                            fontSize: "12px",
                          }}
                          formatter={(val, name, props) => [
                            `${val} / ${props.payload.max}`,
                            "점수",
                          ]}
                          labelFormatter={(label, payload) =>
                            payload?.[0]?.payload?.examName || label
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: CHART_COLORS.primary,
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weakness Radar Chart */}
                <Card className="shadow-sm border-none bg-white dark:bg-card h-full">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                      <LucideIcons.Target className="w-4 h-4 text-primary" />{" "}
                      영역별 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-70 relative">
                    {personalStats?.weaknessChart &&
                    personalStats.weaknessChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="45%"
                          cy="50%"
                          outerRadius="80%"
                          data={personalStats.weaknessChart}
                        >
                          <PolarGrid stroke="var(--color-border)" />
                          <PolarAngleAxis
                            dataKey="category"
                            tick={{
                              fill: "var(--color-muted-foreground)",
                              fontSize: 11,
                            }}
                          />
                          <Radar
                            name="정답률(%)"
                            dataKey="accuracy"
                            stroke={CHART_COLORS.primary}
                            fill={CHART_COLORS.primary}
                            fillOpacity={0.4}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "var(--color-card)",
                              color: "var(--color-card-foreground)",
                              fontSize: "12px",
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70 flex-col gap-2">
                        <LucideIcons.SearchX className="w-7 h-7" />
                        <span className="text-sm font-semibold">
                          영역별 분석을 위한 데이터가 없습니다.
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ))}

        {activeTab === "official" && (
          <>
            {/* Official Exam KPI Cards */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <Card className="flex-1 shadow-sm bg-white dark:bg-card border-2 border-accent">
                <CardHeader>
                  <CardTitle className="text-md font-bold text-[#4a7a78] dark:text-accent-foreground uppercase tracking-wider">
                    {selectedYear === "all" ? "전체" : selectedYear + "년"}{" "}
                    합격률
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-bold bg-accent/10 text-accent/80 px-2.5 py-1 rounded-full">
                    총 {officialStats.total}회 / {officialStats.passed}회 합격
                  </span>
                  <div className="flex items-end justify-end">
                    <span className="text-3xl font-extrabold text-[#4a7a78] dark:text-accent-foreground mt-3">
                      {officialStats.passRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="flex-1 shadow-sm bg-white dark:bg-card border-2 border-slate-100 dark:border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-md font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">
                    결과 대기
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end items-center gap-2">
                    <span className="text-3xl font-bold text-slate-400 dark:text-muted-foreground pb-2">
                      {officialStats.waiting}
                    </span>
                    <span className="text-sm text-slate-400 dark:text-muted-foreground">
                      건
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Official Exam Pass Rate Chart */}
            <div className="lg:col-span-9">
              <Card className="shadow-sm border-none bg-white dark:bg-card h-full">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-foreground">
                    <LucideIcons.BarChart2 className="w-4 h-4 text-primary" />{" "}
                    레벨별 합격 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={officialStats.chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="var(--color-border)"
                        opacity={0.5}
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="level"
                        type="category"
                        tick={{
                          fontSize: 13,
                          fontWeight: 600,
                          fill: "var(--color-muted-foreground)",
                        }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        content={<CustomTooltip />}
                      />
                      <Legend iconSize={8} content={renderLegend} />
                      <Bar
                        dataKey="passed"
                        name="합격"
                        stackId="a"
                        fill={CHART_COLORS.accent}
                        radius={[0, 0, 0, 0]}
                        barSize={24}
                      >
                        <LabelList
                          dataKey="rate"
                          position="center"
                          formatter={(val) => (val > 0 ? `${val}%` : "")}
                          style={{
                            fill: "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                            textShadow: "0px 0px 2px rgba(0,0,0,0.5)",
                          }}
                        />
                      </Bar>
                      <Bar
                        dataKey="failed"
                        name="불합격"
                        stackId="a"
                        fill={CHART_COLORS.destructive}
                        radius={[0, 0, 0, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Detailed List Section */}
      {/* 상세 목록 섹션 */}
      <div className="flex flex-col gap-2 mt-2 flex-1 min-h-0">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            {activeTab === "mock" && focusedStudent ? (
              <>
                <TabsList className="dark:bg-muted/50">
                  <TabsTrigger className="py-0.5 cursor-default flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-white dark:bg-card text-primary border-2 border-primary text-sm flex items-center gap-1"
                    >
                      <LucideIcons.User className="w-4 h-4" />
                      {focusedStudent}
                    </Badge>
                    학생의 전체 목록
                  </TabsTrigger>
                </TabsList>
              </>
            ) : (
              <TabsList className="dark:bg-muted/50">
                <TabsTrigger className="cursor-default">전체 목록</TabsTrigger>
              </TabsList>
            )}
          </div>
          <Badge
            variant="secondary"
            className="bg-white dark:bg-card border-border text-slate-500 dark:text-muted-foreground shadow-sm"
          >
            Total{" "}
            {activeTab === "official"
              ? filteredOfficialList.length
              : filteredMockList.length}
          </Badge>
        </div>

        <div className="flex-1 bg-white dark:bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-0">
          {/* Mock Exam Table */}
          {activeTab === "mock" && (
            <>
              <div
                className={cn(
                  "bg-slate-50 dark:bg-muted/30 border-b border-slate-100 dark:border-border",
                  hasScroll ? "pr-2.75" : "",
                )}
              >
                <table className="w-full text-md table-fixed">
                  <thead className="text-md text-slate-500 dark:text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-[12%]">
                        학생
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[12%]">
                        응시일
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[20%]">
                        시험명
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[12%]">
                        응시 유형
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[12%]">
                        점수
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[10%]">
                        등급
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[10%]">
                        파일
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[12%]">
                        관리
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div
                ref={tableBodyRef}
                className="flex-1 overflow-y-auto custom-scrollbar"
              >
                <table
                  className={cn(
                    "w-full text-sm table-fixed",
                    filteredMockList.length === 0 ? "h-full" : "",
                  )}
                >
                  <tbody
                    className={cn(
                      "divide-y divide-slate-50 dark:divide-border/50",
                      filteredMockList.length === 0 ? "h-full" : "",
                    )}
                  >
                    {filteredMockList.length === 0 ? (
                      <tr className="h-full">
                        <td
                          colSpan="8"
                          className="px-6 text-center align-middle text-slate-400 dark:text-muted-foreground/70"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LucideIcons.SearchX className="w-8 h-8" />
                            <p className="font-semibold text-sm">
                              등록된 모의고사 데이터가 없습니다.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMockList.map((exam) => (
                        <tr
                          key={exam.id}
                          className="transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-muted/50 group"
                          onClick={() => handleRowClick(exam.student_name)}
                        >
                          <td
                            className={cn(
                              "px-4 py-4 text-center font-bold truncate w-[12%]",
                              focusedStudent === exam.student_name
                                ? "text-primary dark:text-foreground group-hover:text-primary"
                                : "text-slate-800 dark:text-foreground group-hover:text-primary",
                            )}
                          >
                            {exam.student_name}
                          </td>
                          <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[12%]">
                            {formatDate(exam.exam_date)}
                          </td>
                          <td className="px-2 py-4 text-center w-[20%] align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-slate-800 dark:text-foreground truncate max-w-full">
                                {exam.exam_name}
                              </span>
                              {/* Show source if exists */}
                              {exam.source && (
                                <span className="text-[12px] text-muted-foreground font-medium truncate max-w-full mt-0.5">
                                  ({exam.source})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center w-[12%]">
                            <div className="flex justify-center items-center w-full">
                              <Badge
                                variant="default"
                                className="text-[11px] border border-primary/10 rounded-md hover:bg-primary/10 px-2 py-0.5 justify-center"
                              >
                                {EXAM_MODE_LABELS[exam.exam_mode] ||
                                  exam.exam_mode}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[12%]">
                            <span className="font-bold text-slate-800 dark:text-foreground">
                              {formatScore(exam.total_score)}
                            </span>
                            <span className="mx-1">/</span>
                            <span>{exam.max_score || "-"}</span>
                          </td>
                          <td className="px-4 py-4 text-center w-[10%]">
                            <div className="flex justify-center items-center w-full">
                              {exam.grade ? (
                                <Badge
                                  variant="default"
                                  className="text-[11px] text-slate-800 dark:text-foreground border border-slate-200 dark:border-border bg-muted/30 dark:bg-card rounded-md hover:bg-muted/30 dark:hover:bg-card px-2 py-0.5 justify-center"
                                >
                                  {exam.grade}
                                </Badge>
                              ) : (
                                <span className="font-bold text-slate-400">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center w-[10%]">
                            <div className="flex justify-center items-center w-full">
                              <FilePopover attachments={exam.attachments} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center w-[12%]">
                            <div className="flex justify-center items-center w-full">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs px-2 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center"
                                onClick={(e) =>
                                  handleEditClick(e, exam, "mock")
                                }
                              >
                                <LucideIcons.Edit3 className="w-3 h-3 mr-1" />
                                수정
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Official Exam Table */}
          {activeTab === "official" && (
            <>
              <div
                className={cn(
                  "bg-slate-50 dark:bg-muted/30 border-b border-slate-100 dark:border-border",
                  hasScroll ? "pr-2.75" : "",
                )}
              >
                <table className="w-full text-md table-fixed">
                  <thead className="text-md text-slate-500 dark:text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-[15%]">
                        학생
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[15%]">
                        응시일
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[25%]">
                        시험명
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[10%]">
                        응시 유형
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[10%]">
                        점수
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[10%]">
                        등급
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-[15%]">
                        결과
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div
                ref={tableBodyRef}
                className="flex-1 overflow-y-auto custom-scrollbar"
              >
                <table
                  className={cn(
                    "w-full text-sm table-fixed",
                    filteredOfficialList.length === 0 ? "h-full" : "",
                  )}
                >
                  <tbody
                    className={cn(
                      "divide-y divide-slate-50 dark:divide-border/50",
                      filteredOfficialList.length === 0 ? "h-full" : "",
                    )}
                  >
                    {filteredOfficialList.length === 0 ? (
                      <tr className="h-full">
                        <td
                          colSpan="7"
                          className="px-6 text-center align-middle text-slate-400 dark:text-muted-foreground/70"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LucideIcons.SearchX className="w-8 h-8" />
                            <p className="font-semibold text-sm">
                              등록된 정규시험 데이터가 없습니다.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOfficialList.map((exam) => (
                        <tr
                          key={exam.id}
                          className="hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={(e) => handleEditClick(e, exam, "official")}
                        >
                          <td className="px-4 py-4 text-center font-bold text-slate-800 dark:text-foreground truncate w-[15%] group-hover:text-primary">
                            {exam.student_name}
                          </td>
                          <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[15%]">
                            {formatDate(exam.exam_date)}
                          </td>
                          <td className="px-2 py-4 text-center font-bold text-slate-800 dark:text-foreground truncate w-[25%]">
                            {exam.exam_standard_name || exam.exam_name_manual}
                          </td>
                          <td className="px-4 py-4 text-center w-[10%]">
                            <div className="flex justify-center items-center w-full">
                              <Badge
                                variant="default"
                                className="text-[11px] border border-primary/10 rounded-md hover:bg-primary/10 px-2 py-0.5 justify-center"
                              >
                                {EXAM_MODE_LABELS[exam.exam_mode] || exam.exam_mode || "Gesamt"}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[10%]">
                            <span className="font-bold text-slate-800 dark:text-foreground">
                              {formatScore(exam.total_score)}
                            </span>
                            {exam.max_score && (
                              <>
                                <span className="mx-1">/</span>
                                <span>{exam.max_score}</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center w-[10%]">
                            <div className="flex justify-center items-center w-full">
                              {exam.grade ? (
                                <Badge
                                  variant="default"
                                  className="text-[11px] text-slate-800 dark:text-foreground border border-slate-200 dark:border-border bg-white dark:bg-card rounded-md hover:bg-white dark:hover:bg-card px-2 py-0.5 justify-center"
                                >
                                  {exam.grade}
                                </Badge>
                              ) : (
                                <span className="font-bold text-slate-400">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center w-[15%]">
                            <div className="flex justify-center items-center w-full">
                              <Badge
                                className={cn(
                                  "text-[11px] px-2 py-0.5 border font-medium shadow-none justify-center min-w-16",
                                  examResultStyles[exam.status],
                                )}
                              >
                                {exam.status === "PASSED"
                                  ? "합격"
                                  : exam.status === "FAILED"
                                    ? "불합격"
                                    : "대기"}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
