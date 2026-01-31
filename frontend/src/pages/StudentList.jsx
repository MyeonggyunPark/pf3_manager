import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { cn } from "../lib/utils";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import AddStudentModal from "../components/modals/AddStudentModal";
import AddCourseModal from "../components/modals/AddCourseModal"; 
import AddOfficialExamModal from "../components/modals/AddOfficialExamModal"; 
import AddMockExamModal from "../components/modals/AddMockExamModal";

const MaleIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="10" cy="14" r="5" />
    <path d="m19 5-5.4 5.4" />
    <path d="M19 5h-5" />
    <path d="M19 5v5" />
  </svg>
);
const FemaleIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="10" r="5" />
    <path d="M12 15v6" />
    <path d="M9 18h6" />
  </svg>
);

// UI Styles and Label Mappings
// UI 스타일 및 라벨 매핑 상수
const statusStyles = {
  ACTIVE: "bg-accent/20 text-[#4a7a78] border-accent/50 hover:bg-accent/20 dark:text-accent-foreground",
  PAUSED:
    "bg-secondary/50 text-muted-foreground border-secondary hover:bg-secondary/50",
  FINISHED:
    "bg-success/20 text-[#5f6e63] border-success/50 hover:bg-success/20 dark:text-success-foreground",
};
const STATUS_LABELS = {
  ACTIVE: "수강중",
  PAUSED: "일시중지",
  FINISHED: "종료",
};

const examResultStyles = {
  PASSED: "bg-accent/20 text-[#4a7a78] border-accent/50 hover:bg-accent/20 dark:text-accent-foreground",
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

  useEffect(() => {
    const handleClose = () => setIsOpen(false);

    if (isOpen) {
      window.addEventListener("click", handleClose);
      window.addEventListener("resize", handleClose);
      const scrollContainer = document.querySelector(".custom-scrollbar");
      if (scrollContainer)
        scrollContainer.addEventListener("scroll", handleClose);
    }

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("resize", handleClose);
      const scrollContainer = document.querySelector(".custom-scrollbar");
      if (scrollContainer)
        scrollContainer.removeEventListener("scroll", handleClose);
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
                    fileName = decodeURIComponent(
                      file.file.split("/").pop().split("?")[0],
                    );
                  } catch (e) {
                    console.log("Error decoding file name:", e);
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
                    <LucideIcons.FileText className="w-4.5 h-4.5 text-slate-400 group-hover:text-primary shrink-0" />
                    <span className="truncate flex-1 text-left text-xs">
                      {fileName}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

// Format date string to German locale (DD.MM.YYYY)
// 날짜 문자열을 독일 로케일(일.월.년) 형식으로 변환
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Format number to Euro currency style
// 숫자를 유로 통화 형식으로 변환
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function StudentList() {
  const location = useLocation();

  // Ref and State for scroll detection
  // 스크롤 감지를 위한 Ref와 State
  const tableBodyRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  // State for student list and refresh mechanism
  // 학생 목록 데이터 및 리스트 갱신 트리거 상태
  const [students, setStudents] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search and Filter states
  // 검색 및 필터링 상태
  const [statusFilter, setStatusFilter] = useState(location.state?.status || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  // Modal and Selection states
  // 모달 표시 여부 및 선택된 학생 관리 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);

  // States for Course and Exam Modals
  // 수강권 및 시험 수정 모달 상태
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isMockExamModalOpen, setIsMockExamModalOpen] = useState(false);
  const [selectedMockExam, setSelectedMockExam] = useState(null);

  // Detailed data for the active student (fetched separately)
  // 활성 학생의 상세 데이터 (개별 호출로 가져옴)
  const [studentCourses, setStudentCourses] = useState([]);
  const [studentExams, setStudentExams] = useState([]);
  const [studentMockExams, setStudentMockExams] = useState([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("courses");

  // Effect: Check for scrollbar presence in the table body
  // 데이터나 탭이 변경될 때 스크롤 생성 여부 체크
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
  }, [
    activeTab,
    studentCourses,
    studentExams,
    studentMockExams,
    isDetailsLoading,
    activeStudentId,
  ]);

  // Effect: Fetch student list when filters or refresh trigger change
  // 필터나 갱신 트리거 변경 시 학생 목록 조회
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Construct query parameters conditionally
        // 조건부로 쿼리 파라미터 구성
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (levelFilter) params.target_level = levelFilter;

        const res = await api.get("/api/students/", { params });
        setStudents(res.data);

        // Auto-select removal: Only keep selection if the currently selected student still exists in the list
        // 자동 선택 제거: 현재 선택된 학생이 리스트에 여전히 존재할 때만 유지하고, 아니면 선택 해제
        if (res.data.length > 0) {
          const isCurrentActiveInList = res.data.some(
            (s) => s.id === activeStudentId,
          );
          if (!isCurrentActiveInList) {
            setActiveStudentId(null);
          }
        } else {
          setActiveStudentId(null);
        }
      } catch (err) {
        console.error("Failed to fetch students:", err);
      }
    };

    fetchStudents();
  }, [refreshTrigger, statusFilter, levelFilter]);

  // Effect: Fetch detailed records (courses, exams) for the active student
  // 활성 학생의 상세 기록(수강 이력, 시험) 조회
  useEffect(() => {
    if (!activeStudentId) return;

    const fetchDetails = async () => {
      setIsDetailsLoading(true);
      try {
        // Execute API calls in parallel for performance
        // 성능을 위해 API 호출을 병렬로 실행
        const [coursesRes, examsRes, mockExamsRes] = await Promise.all([
          api.get("/api/courses/", { params: { student: activeStudentId } }),
          api.get("/api/official-results/", {
            params: { student: activeStudentId },
          }),
          api.get("/api/exam-records/", {
            params: { student: activeStudentId },
          }),
        ]);

        // Sort data by date (newest first)
        // 날짜 기준 내림차순 정렬 (최신순)
        setStudentCourses(
          coursesRes.data.sort(
            (a, b) => new Date(b.start_date) - new Date(a.start_date),
          ),
        );
        setStudentExams(
          examsRes.data.sort(
            (a, b) => new Date(b.exam_date) - new Date(a.exam_date),
          ),
        );
        setStudentMockExams(
          mockExamsRes.data.sort(
            (a, b) => new Date(b.exam_date) - new Date(a.exam_date),
          ),
        );
      } catch (err) {
        console.error("Failed to fetch student details:", err);
      } finally {
        setIsDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [activeStudentId, refreshTrigger]);

  const openCreateModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const openEditCourseModal = (course) => {
    setSelectedCourse(course);
    setIsCourseModalOpen(true);
  };

  const openEditExamModal = (exam) => {
    setSelectedExam(exam);
    setIsExamModalOpen(true);
  };

  const openEditMockExamModal = (exam) => {
    setSelectedMockExam(exam); // 클릭한 시험 데이터 설정 (수정 모드)
    setIsMockExamModalOpen(true);
  };

  // Trigger list refresh after successful create/edit/delete
  // 등록/수정/삭제 성공 후 리스트 갱신 트리거
  const handleSuccess = () => setRefreshTrigger((prev) => prev + 1);

  const handleSearchClick = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };

  // Derived state for easier access to current student object
  // 현재 학생 객체에 쉽게 접근하기 위한 파생 상태
  const activeStudent = students.find((s) => s.id === activeStudentId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] space-y-4 animate-in overflow-hidden">
      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        studentData={selectedStudent}
      />

      <AddCourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSuccess={handleSuccess}
        courseData={selectedCourse}
      />

      <AddOfficialExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onSuccess={handleSuccess}
        examData={selectedExam}
      />

      <AddMockExamModal
        isOpen={isMockExamModalOpen}
        onClose={() => setIsMockExamModalOpen(false)}
        onSuccess={handleSuccess}
        examData={selectedMockExam}
      />

      {/* Filter and Search Bar Section */}
      {/* 필터 및 검색 바 섹션 */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Filters */}
          {/* 필터들 */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              {/* Status Filter Dropdown */}
              {/* 상태 필터 드롭다운 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full sm:w-32 appearance-none rounded-xl border border-border bg-white dark:bg-card px-4 text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium"
              >
                <option value="">전체(상태)</option>
                <option value="ACTIVE">수강중</option>
                <option value="PAUSED">일시중지</option>
                <option value="FINISHED">종료</option>
              </select>
              <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Level Filter Dropdown */}
            {/* 레벨 필터 드롭다운 */}
            <div className="relative">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="h-10 w-full sm:w-29 appearance-none rounded-xl border border-border bg-white dark:bg-card px-3 text-md focus:outline-none focus:border-primary cursor-pointer text-foreground font-medium"
              >
                <option value="">전체(레벨)</option>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <LucideIcons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

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
              <Button
                variant="default"
                className="w-full xl:w-auto h-9 px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer"
                onClick={handleSearchClick}
              >
                검색
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="default"
          className="w-full xl:w-auto h-10 px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
          onClick={openCreateModal}
        >
          <LucideIcons.UserPlus className="w-4 h-4" /> 학생 등록
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel: Student List */}
        {/* 좌측 패널: 학생 목록 */}
        <Card className="w-1/3 min-w-[320px] h-full bg-white dark:bg-card border-none shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {students.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 gap-2">
                <LucideIcons.SearchX className="w-8 h-8" />
                <p className="font-semibold text-sm">검색된 학생이 없습니다.</p>
              </div>
            ) : (
              students.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveStudentId(s.id)}
                  className={cn(
                    "px-5 py-4 rounded-xl cursor-pointer transition-all border border-transparent flex items-center gap-3",
                    activeStudentId === s.id
                      ? "bg-primary/10 border-primary/20 shadow-sm"
                      : "hover:bg-slate-50 dark:hover:bg-muted/50 group",
                  )}
                >
                  <div
                    className={cn(
                      "h-6.5 w-6.5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                      s.gender === "M"
                        ? "bg-primary/10 border-primary/20"
                        : "bg-destructive/10 border-destructive/20",
                    )}
                  >
                    {s.gender === "M" ? (
                      <MaleIcon className="w-4 h-4 text-primary" />
                    ) : (
                      <FemaleIcon className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg font-semibold text-slate-800 group-hover:text-primary dark:text-foreground">
                          {s.name}
                        </span>
                        <span className="text-[10px] h-5 px-1.5 rounded-md border border-primary/30 text-primary bg-white dark:bg-card font-semibold flex items-center">
                          {s.target_level}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "border text-[12px] px-2 py-0.5 h-5 font-medium",
                          statusStyles[s.status],
                        )}
                      >
                        {STATUS_LABELS[s.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right Panel: Student Details */}
        {/* 우측 패널: 학생 상세 정보 */}
        <Card className="flex-1 h-full bg-white dark:bg-card border-none shadow-sm rounded-2xl overflow-hidden flex flex-col relative">
          {activeStudent ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Student Header Info */}
              <div className="p-8 pb-6 border-b border-slate-100 dark:border-border bg-linear-to-b from-white to-slate-50/50 dark:from-card dark:to-muted/10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        "h-15 w-15 rounded-full flex items-center justify-center border shadow-sm shrink-0 bg-white dark:bg-card",
                        activeStudent.gender === "M"
                          ? "border-primary/20 bg-primary/10"
                          : "border-destructive/20 bg-destructive/10",
                      )}
                    >
                      {activeStudent.gender === "M" ? (
                        <MaleIcon className="w-9 h-9 text-primary" />
                      ) : (
                        <FemaleIcon className="w-9 h-9 text-destructive" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-5">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-foreground tracking-tight">
                          {activeStudent.name}
                        </h1>
                        <Badge
                          className={cn(
                            "border text-sm px-2.5 py-0.5 font-medium rounded-full",
                            statusStyles[activeStudent.status],
                          )}
                        >
                          {STATUS_LABELS[activeStudent.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium pl-1">
                        {activeStudent.age && (
                          <>
                            <span>{activeStudent.age}세</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-border" />
                          </>
                        )}
                        <span>
                          등록일 - {formatDate(activeStudent.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => openEditModal(activeStudent)}
                    className="w-full xl:w-auto h-10 px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LucideIcons.Edit3 className="w-4 h-4 mr-2" /> 정보 수정
                  </Button>
                </div>

                {/* Stat Cards */}
                <div className="flex gap-6 mt-8">
                  <div className="flex-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 shadow-sm">
                    <div className="w-full">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        현재 레벨
                      </p>
                      <p className="text-[22px] font-bold text-slate-800 dark:text-foreground text-right pr-12">
                        {activeStudent.current_level}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 bg-primary/5 border border-primary/10 rounded-xl p-4 shadow-sm">
                    <div className="w-full">
                      <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                        목표 레벨
                      </p>
                      <p className="text-[22px] font-bold text-primary text-right pr-12">
                        {activeStudent.target_level}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 bg-primary/5 border border-primary/10 rounded-xl p-4 shadow-sm">
                    <div className="w-full">
                      <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                        목표 시험
                      </p>
                      <p className="text-[22px] font-bold text-primary text-right pr-9">
                        {EXAM_MODE_LABELS[activeStudent.target_exam_mode] ||
                          activeStudent.target_exam_mode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Memo Section */}
                <div className="mt-5 flex gap-3 items-start bg-secondary/30 dark:bg-secondary/20 p-3 rounded-lg border border-secondary/50">
                  <LucideIcons.StickyNote className="w-4 h-4 text-secondary-foreground mt-0.5 shrink-0" />
                  <p
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      activeStudent.memo
                        ? "text-slate-800 dark:text-card-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {activeStudent.memo || "추가사항 / 특이사항"}
                  </p>
                </div>
              </div>

              {/* Tab Navigation and Content Area */}
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-muted/5">
                <div className="flex items-center px-8 pt-4 border-b border-slate-100 dark:border-border bg-white dark:bg-card sticky top-0 z-10 gap-8">
                  <button
                    onClick={() => setActiveTab("courses")}
                    className={cn(
                      "pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 cursor-pointer",
                      activeTab === "courses"
                        ? "text-primary border-primary"
                        : "text-slate-400 dark:text-muted-foreground border-transparent hover:text-primary",
                    )}
                  >
                    <LucideIcons.CreditCard className="w-4 h-4" /> 수강 이력
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 py-0 h-4 text-[10px] bg-slate-100 dark:bg-secondary/50 text-slate-500 dark:text-muted-foreground"
                    >
                      {studentCourses.length}
                    </Badge>
                  </button>

                  <button
                    onClick={() => setActiveTab("mock-exams")}
                    className={cn(
                      "pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 cursor-pointer",
                      activeTab === "mock-exams"
                        ? "text-primary border-primary"
                        : "text-slate-400 dark:text-muted-foreground border-transparent hover:text-primary",
                    )}
                  >
                    <LucideIcons.FileEdit className="w-4 h-4" /> 모의고사
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 py-0 h-4 text-[10px] bg-slate-100 dark:bg-secondary/50 text-slate-500 dark:text-muted-foreground"
                    >
                      {studentMockExams.length}
                    </Badge>
                  </button>

                  <button
                    onClick={() => setActiveTab("exams")}
                    className={cn(
                      "pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 cursor-pointer",
                      activeTab === "exams"
                        ? "text-primary border-primary"
                        : "text-slate-400 dark:text-muted-foreground border-transparent hover:text-primary",
                    )}
                  >
                    <LucideIcons.GraduationCap className="w-4 h-4" /> 정규 시험
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 py-0 h-4 text-[10px] bg-slate-100 dark:bg-secondary/50 text-slate-500 dark:text-muted-foreground"
                    >
                      {studentExams.length}
                    </Badge>
                  </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden p-6">
                  {isDetailsLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <LucideIcons.Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* 수강 이력 */}
                      {activeTab === "courses" && (
                        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
                          <div
                            className={cn(
                              "bg-slate-50/80 dark:bg-muted/30 border-b border-slate-100 dark:border-border",
                              hasScroll ? "pr-2.75" : "",
                            )}
                          >
                            <table className="w-full text-sm table-fixed">
                              <thead className="text-xs text-slate-500 dark:text-muted-foreground uppercase">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-center w-[29%]">
                                    기간
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[14%]">
                                    총 시간
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    시간당 금액
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    총 금액
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[12%]">
                                    수강 상태
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    결제
                                  </th>
                                </tr>
                              </thead>
                            </table>
                          </div>

                          <div
                            ref={tableBodyRef}
                            className="flex-1 overflow-y-auto custom-scrollbar"
                          >
                            <table className="w-full text-sm table-fixed">
                              <tbody className="divide-y divide-slate-50 dark:divide-border/50">
                                {studentCourses.length > 0 ? (
                                  studentCourses.map((course) => (
                                    <tr
                                      key={course.id}
                                      onClick={() =>
                                        openEditCourseModal(course)
                                      }
                                      className="hover:bg-slate-50 dark:hover:bg-muted/10 transition-colors cursor-pointer"
                                    >
                                      <td className="px-4 py-4 text-center text-slate-700 dark:text-card-foreground truncate w-[29%]">
                                        {formatDate(course.start_date)} ~{" "}
                                        {formatDate(course.end_date)}
                                      </td>
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[14%]">
                                        {Number(course.total_hours)}h
                                      </td>
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[15%]">
                                        {formatCurrency(course.hourly_rate)}
                                      </td>
                                      <td className="px-4 py-4 text-center font-bold text-slate-800 dark:text-card-foreground w-[15%]">
                                        {formatCurrency(course.total_fee)}
                                      </td>
                                      <td className="px-1 py-4 text-center w-[12%]">
                                        <div className="flex justify-center items-center w-full">
                                          <Badge
                                            className={cn(
                                              "text-[11px] px-2 py-0.5 border font-medium shadow-none justify-center min-w-12.5",
                                              statusStyles[course.status],
                                            )}
                                          >
                                            {STATUS_LABELS[course.status]}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center w-[15%]">
                                        <div className="flex justify-center items-center w-full">
                                          {course.is_paid ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-xl border bg-accent/20 text-[#4a7a78] dark:text-accent-foreground border-accent/50">
                                              <LucideIcons.CheckCircle2 className="w-3 h-3" />{" "}
                                              완납
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-xl border border-destructive/20">
                                              <LucideIcons.XCircle className="w-3 h-3" />{" "}
                                              미납
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan="6"
                                      className="px-6 py-12 text-center text-slate-400 text-sm"
                                    >
                                      등록된 수강 이력이 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 모의고사 */}
                      {activeTab === "mock-exams" && (
                        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
                          <div
                            className={cn(
                              "bg-slate-50/80 dark:bg-muted/30 border-b border-slate-100 dark:border-border",
                              hasScroll ? "pr-2.75" : "",
                            )}
                          >
                            <table className="w-full text-sm table-fixed">
                              <thead className="text-xs text-slate-500 dark:text-muted-foreground uppercase">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    응시일
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[30%]">
                                    시험명
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    응시 유형
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    점수
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    등급
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[10%]">
                                    파일
                                  </th>
                                </tr>
                              </thead>
                            </table>
                          </div>
                          <div
                            ref={tableBodyRef}
                            className="flex-1 overflow-y-auto custom-scrollbar"
                          >
                            <table className="w-full text-sm table-fixed">
                              <tbody className="divide-y divide-slate-50 dark:divide-border/50">
                                {studentMockExams.length > 0 ? (
                                  studentMockExams.map((exam) => (
                                    <tr
                                      key={exam.id}
                                      onClick={() =>
                                        openEditMockExamModal(exam)
                                      }
                                      className="hover:bg-slate-50 dark:hover:bg-muted/10 transition-colors cursor-pointer"
                                    >
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[15%]">
                                        {formatDate(exam.exam_date)}
                                      </td>
                                      <td className="px-2 py-4 text-center w-[30%] align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                          <span className="font-bold text-slate-800 dark:text-card-foreground truncate max-w-full">
                                            {exam.exam_name}
                                          </span>
                                          {exam.source && (
                                            <span className="text-[12px] text-muted-foreground font-medium truncate max-w-full mt-0.5">
                                              ({exam.source})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center w-[15%]">
                                        <div className="flex justify-center items-center w-full">
                                          <Badge
                                            variant="default"
                                            className="text-[11px] border border-primary/10 rounded-md px-2 py-0.5 justify-center hover:bg-primary/10"
                                          >
                                            {EXAM_MODE_LABELS[exam.exam_mode] ||
                                              exam.exam_mode}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[15%]">
                                        <span
                                          className={cn(
                                            "font-bold",
                                            Number(exam.total_score) === 0
                                              ? "text-slate-400"
                                              : "text-slate-800 dark:text-card-foreground",
                                          )}
                                        >
                                          {Number(exam.total_score) === 0
                                            ? "-"
                                            : Number(exam.total_score)}
                                        </span>
                                        <span className="mx-1">/</span>
                                        <span>{exam.max_score || "-"}</span>
                                      </td>
                                      <td className="px-4 py-4 text-center w-[15%]">
                                        <div className="flex justify-center items-center w-full">
                                          {exam.grade ? (
                                            <Badge
                                              variant="default"
                                              className="text-[11px] text-slate-800 rounded-md dark:text-card-foreground border border-slate-200 dark:border-border bg-muted/30 dark:bg-card px-2 py-0.5 justify-center hover:bg-muted/30"
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
                                        <div className="flex justify-center w-full">
                                          <FilePopover
                                            attachments={exam.attachments}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan="6"
                                      className="px-6 py-12 text-center text-slate-400 text-sm"
                                    >
                                      등록된 모의고사 기록이 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 정규 시험 */}
                      {activeTab === "exams" && (
                        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
                          <div
                            className={cn(
                              "bg-slate-50/80 dark:bg-muted/30 border-b border-slate-100 dark:border-border",
                              hasScroll ? "pr-2.75" : "",
                            )}
                          >
                            <table className="w-full text-sm table-fixed">
                              <thead className="text-xs text-slate-500 dark:text-muted-foreground uppercase">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    응시일
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[30%]">
                                    시험명
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[15%]">
                                    응시 유형
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[14%]">
                                    점수
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[14%]">
                                    등급
                                  </th>
                                  <th className="px-4 py-3 font-semibold text-center w-[12%]">
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
                            <table className="w-full text-sm table-fixed">
                              <tbody className="divide-y divide-slate-50 dark:divide-border/50">
                                {studentExams.length > 0 ? (
                                  studentExams.map((exam) => (
                                    <tr
                                      key={exam.id}
                                      onClick={() => openEditExamModal(exam)}
                                      className="hover:bg-slate-50 dark:hover:bg-muted/10 transition-colors cursor-pointer"
                                    >
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[15%]">
                                        {formatDate(exam.exam_date)}
                                      </td>
                                      <td className="px-2 py-4 text-center font-bold text-slate-800 dark:text-card-foreground truncate w-[30%]">
                                        {exam.exam_standard_name ||
                                          exam.exam_name_manual}
                                      </td>
                                      <td className="px-4 py-4 w-[15%]">
                                        <div className="flex justify-center items-center w-full">
                                          <Badge
                                            variant="default"
                                            className="text-[11px] border border-primary/10 rounded-md px-2 py-0.5 justify-center hover:bg-primary/10"
                                          >
                                            {EXAM_MODE_LABELS[exam.exam_mode] ||
                                              "Gesamt"}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center text-slate-500 dark:text-muted-foreground w-[14%]">
                                        <span
                                          className={cn(
                                            "font-bold",
                                            exam.total_score === ""
                                              ? "text-slate-800 dark:text-card-foreground"
                                              : "text-slate-500 dark:text-muted-foreground",
                                          )}
                                        >
                                          {exam.total_score || "-"}
                                        </span>
                                        {exam.max_score && (
                                          <>
                                            <span className="mx-1">/</span>
                                            <span>{exam.max_score}</span>
                                          </>
                                        )}
                                      </td>
                                      <td className="px-4 py-4 w-[14%]">
                                        <div className="flex justify-center items-center w-full">
                                          {exam.grade ? (
                                            <Badge
                                              variant="default"
                                              className="text-[11px] text-slate-800 rounded-md dark:text-card-foreground border border-slate-200 dark:border-border bg-muted/30 dark:bg-card px-2 py-0.5 justify-center hover:bg-muted/30 dark:hover:bg-card"
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
                                      <td className="px-4 py-4 w-[12%]">
                                        <div className="flex justify-center items-center w-full">
                                          <Badge
                                            className={cn(
                                              "text-[12px] px-2 py-0.5 border font-medium shadow-none justify-center min-w-12.5",
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
                                ) : (
                                  <tr>
                                    <td
                                      colSpan="6"
                                      className="px-6 py-12 text-center text-slate-400 text-sm"
                                    >
                                      등록된 시험 결과가 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 dark:bg-muted/5 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-100 dark:bg-muted/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-200 dark:ring-border/50">
                <LucideIcons.UserRoundSearch className="w-10 h-10 text-slate-300 dark:text-muted-foreground/40" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-primary">
                  선택된 학생이 없습니다.
                </h3>
                <p className="text-slate-500 dark:text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  좌측 목록에서 학생을 선택하면
                  <br />
                  선택된 학생의 <strong>상세 정보</strong>를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}