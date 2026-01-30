import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

// Grading Scales Configuration
// 등급 체계 구성
const OFFICIAL_GRADING_SCALES = {
  A2: {
    ranges: [
      { min: 54, grade: "sehr gut", status: "PASSED" },
      { min: 48, grade: "gut", status: "PASSED" },
      { min: 42, grade: "befriedigend", status: "PASSED" },
      { min: 36, grade: "ausreichend", status: "PASSED" },
      { min: 0, grade: "teilgenommen", status: "FAILED" },
    ],
  },
  B1: {
    ranges: [
      { min: 270, grade: "sehr gut", status: "PASSED" },
      { min: 240, grade: "gut", status: "PASSED" },
      { min: 210, grade: "befriedigend", status: "PASSED" },
      { min: 180, grade: "ausreichend", status: "PASSED" },
      { min: 0, grade: "nicht bestanden", status: "FAILED" },
    ],
  },
  B2: {
    ranges: [
      { min: 270, grade: "sehr gut", status: "PASSED" },
      { min: 240, grade: "gut", status: "PASSED" },
      { min: 210, grade: "befriedigend", status: "PASSED" },
      { min: 180, grade: "ausreichend", status: "PASSED" },
      { min: 0, grade: "nicht bestanden", status: "FAILED" },
    ],
  },
  C1: {
    ranges: [
      { min: 193, grade: "sehr gut", status: "PASSED" },
      { min: 172, grade: "gut", status: "PASSED" },
      { min: 151, grade: "befriedigend", status: "PASSED" },
      { min: 128, grade: "ausreichend", status: "PASSED" },
      { min: 0, grade: "nicht bestanden", status: "FAILED" },
    ],
  },
};

// Helper function to calculate grade & status
// 등급 및 상태 계산 헬퍼 함수
const calculateOfficialGrade = (examName, score) => {
  if (!examName) return null;

  const upperName = examName.toUpperCase();
  let scale = null;

  if (upperName.includes("A2")) scale = OFFICIAL_GRADING_SCALES["A2"];
  else if (upperName.includes("B1")) scale = OFFICIAL_GRADING_SCALES["B1"];
  else if (upperName.includes("B2")) scale = OFFICIAL_GRADING_SCALES["B2"];
  else if (upperName.includes("C1")) scale = OFFICIAL_GRADING_SCALES["C1"];

  if (!scale) return null;

  const numScore = parseFloat(score);
  if (isNaN(numScore)) return null;

  const result = scale.ranges.find((range) => numScore >= range.min);
  return result ? { grade: result.grade, status: result.status } : null;
};

// Helper to format date string for input[type="date"] (YYYY-MM-DD)
// input[type="date"]를 위한 날짜 문자열 포맷팅 헬퍼 (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  // Check if it's already YYYY-MM-DD or ISO string
  // 이미 YYYY-MM-DD 형식이거나 ISO 문자열인지 확인 후 처리
  return new Date(dateString).toISOString().split("T")[0];
};

export default function AddOfficialExamModal({
  isOpen,
  onClose,
  onSuccess,
  examData,
}) {
  const [isLoading, setIsLoading] = useState(false);

  // State for delete operation status and confirmation modal visibility
  // 삭제 작업 상태 및 확인 모달 표시 여부 관리
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine edit mode based on the presence of examData
  // examData 존재 여부에 따른 수정 모드 결정
  const isEditMode = !!examData;

  // Manage validation errors per field (object) and general submission errors (string)
  // 필드별 유효성 에러(객체)와 일반 제출 에러(문자열)를 구분하여 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Data for dropdowns
  // 드롭다운에 표시할 학생 및 시험 종류 데이터
  const [students, setStudents] = useState([]);
  const [examStandards, setExamStandards] = useState([]);

  // Initial form state mapping to the API structure
  // API 구조에 매핑되는 초기 폼 상태
  const initialFormState = {
    student: "",
    exam_standard: "",
    exam_name_manual: "",
    exam_date: "",
    exam_mode: "",
    status: "",
    total_score: "",
    grade: "",
    memo: "",
  };

  // Initialize form data using lazy initialization to handle examData prop
  // examData prop을 처리하기 위해 지연 초기화를 사용하여 폼 데이터 초기화
  const [formData, setFormData] = useState(() => {
    if (examData) {
      const isManualMode =
        !examData.exam_standard && !!examData.exam_name_manual;

      return {
        student: examData.student,
        exam_standard: isManualMode ? "manual" : examData.exam_standard || "",
        exam_name_manual: examData.exam_name_manual || "",
        exam_date: formatDateForInput(examData.exam_date),
        exam_mode: examData.exam_mode || "",
        status: examData.status || "",
        total_score: examData.total_score || "",
        max_score: examData.max_score || "",
        grade: examData.grade || "",
        memo: examData.memo || "",
      };
    }
    return initialFormState;
  });

  // Fetch data when modal opens (Students & Exam Standards)
  // Uses split error handling for robust feedback
  // 모달이 열릴 때 데이터(학생, 시험 기준) 조회
  // 견고한 피드백을 위해 분리된 에러 핸들링 사용
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // Clear previous errors
        // 이전 에러 초기화
        setSubmitError(null);

        // Execute API calls in parallel but handle errors individually
        // API 호출을 병렬로 실행하되 에러는 개별적으로 처리
        const [studentsRes, standardsRes] = await Promise.all([
          // 1. Handle Student API Error independently
          // 학생 API 에러 개별 처리 (실패 시 null 반환)
          api.get("/api/students/?status=ACTIVE").catch((err) => {
            console.error("Student fetch error:", err);
            return null;
          }),

          // 2. Handle Standards API Error independently
          // 시험 기준 API 에러 개별 처리
          api.get("/api/exam-standards/").catch((err) => {
            console.error("Standard fetch error:", err);
            return null;
          }),
        ]);

        // 3. Process Results & Set States
        // 결과 처리 및 상태 설정
        if (studentsRes) {
          setStudents(studentsRes.data);
        } else {
          setSubmitError("학생 목록을 불러오는데 실패했습니다.");
        }

        if (standardsRes) {
          setExamStandards(standardsRes.data);
        } else {
          // Append error message if student fetch also failed, or set new
          // 학생 목록 실패 시 메시지 추가, 아니면 새로 설정
          setSubmitError((prev) =>
            prev ? `${prev}` : "시험 기준을 불러오는데 실패했습니다.",
          );
        }
      };

      fetchData();
    }
  }, [isOpen]);

  // Populate form with existing data when editing
  // 수정 시 기존 데이터로 폼 필드 채우기
  useEffect(() => {
    if (isOpen) {
      if (examData) {
        const isManualMode =
          !examData.exam_standard && !!examData.exam_name_manual;

        setFormData({
          student: examData.student,
          exam_standard: isManualMode ? "manual" : examData.exam_standard || "",
          exam_name_manual: examData.exam_name_manual || "",
          exam_date: formatDateForInput(examData.exam_date),
          exam_mode: examData.exam_mode || "FULL",
          status: examData.status || "WAITING",
          total_score: examData.total_score || "",
          max_score: examData.max_score || "",
          grade: examData.grade || "",
          memo: examData.memo || "",
        });
      } else {
        // Reset to initial state if adding new exam
        // 새 시험 등록 시 초기 상태로 리셋
        setFormData(initialFormState);
      }
      // Clear validation errors on open/change
      // 열리거나 변경될 때 유효성 검사 에러 초기화
      setErrors({});
    }
  }, [isOpen, examData]);

  // Auto-calculate Grade & Status when Score or Standard changes
  // 점수나 시험 종류가 변경될 때 등급과 합격 여부 자동 계산
  useEffect(() => {
    if (
      !formData.total_score ||
      !formData.exam_standard ||
      formData.exam_standard === "manual"
    ) {
      return;
    }

    const selectedStandard = examStandards.find(
      (std) => std.id === parseInt(formData.exam_standard),
    );

    if (!selectedStandard) return;

    const result = calculateOfficialGrade(
      selectedStandard.name,
      formData.total_score,
    );

    if (result) {
      setFormData((prev) => ({
        ...prev,
        grade: result.grade,
        status: result.status,
      }));
    }
  }, [formData.total_score, formData.exam_standard, examStandards]);

  if (!isOpen) return null;

  // Reset form and errors on close
  // 닫을 때 폼 상태와 에러 초기화
  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Update form state and clear specific field error
  // 폼 상태 업데이트 및 특정 필드 에러 제거
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Manual handler for setting specific values directly
  // 특정 값을 직접 설정하기 위한 수동 핸들러
  const handleValueChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  // Handle Exam Mode Change
  // 응시 유형 변경 핸들러
  const handleModeChange = (value) => {
    setFormData((prev) => ({ ...prev, exam_mode: value }));
  };

  // Open delete confirmation overlay
  // 삭제 확인 오버레이 열기
  const handleRequestDelete = () => setShowDeleteConfirm(true);

  // Execute delete operation calling the API
  // API를 호출하여 삭제 작업 수행
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/official-results/${examData.id}/`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Exam Delete Failed:", err);
      setSubmitError("삭제 중 오류가 발생했습니다.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    // Validate required fields: Student, Date, Exam Type (Standard or Manual) and Exam Mode
    // 필수 필드 유효성 검사: 학생, 날짜, 시험 종류(표준 또는 직접 입력), 응시 유형
    const newErrors = {};
    if (!formData.student) newErrors.student = "학생을 선택해주세요.";
    if (!formData.exam_date) newErrors.exam_date = "응시일을 선택해주세요.";
    if (!formData.exam_mode) newErrors.exam_mode = "응시 유형을 선택해주세요.";
    if (
      (!formData.exam_standard || formData.exam_standard === "manual") &&
      !formData.exam_name_manual.trim()
    ) {
      if (formData.exam_standard === "manual") {
        newErrors.exam_name_manual = "시험 명칭을 입력해주세요.";
      } else {
        newErrors.exam_standard = "시험 종류를 선택하거나 직접 입력해주세요.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Prepare payload: Ensure foreign keys are integers and handle nullable fields
      // 페이로드 준비: 외래 키를 정수로 변환하고 null 허용 필드 처리
      const payload = {
        ...formData,
        student: parseInt(formData.student, 10),
        exam_standard:
          formData.exam_standard === "manual" || !formData.exam_standard
            ? null
            : parseInt(formData.exam_standard, 10),
        exam_name_manual: formData.exam_name_manual,
        total_score: formData.total_score
          ? parseFloat(formData.total_score)
          : null,
        max_score: formData.max_score ? parseFloat(formData.max_score) : null,
      };

      // Perform partial update using PATCH or create using POST
      // PATCH를 사용하여 부분 업데이트 수행 또는 POST로 생성
      if (isEditMode) {
        await api.patch(`/api/official-results/${examData.id}/`, payload);
      } else {
        await api.post("/api/official-results/", payload);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Exam Update Failed:", err);
      const responseData = err.response?.data;

      // Robust error handling to display field-specific validation errors from backend
      // 백엔드에서 오는 필드별 유효성 검사 에러를 표시하기 위한 견고한 에러 처리
      if (
        responseData &&
        typeof responseData === "object" &&
        !responseData.detail
      ) {
        const fieldErrors = {};
        Object.keys(responseData).forEach((key) => {
          fieldErrors[key] = Array.isArray(responseData[key])
            ? responseData[key][0]
            : responseData[key];
        });
        setErrors(fieldErrors);
      } else {
        setSubmitError(
          responseData?.detail ||
            `정규 시험 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper component for rendering error messages
  // 에러 메시지 렌더링을 위한 헬퍼 컴포넌트
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1">
        {message}
      </p>
    );
  };

  // Helper component for labels with error state styling
  // 에러 상태 스타일링이 적용된 라벨 헬퍼 컴포넌트
  const InputLabel = ({ label, required, hasError }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 flex items-center gap-1 ${
        hasError
          ? "text-destructive"
          : "text-slate-500 dark:text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-destructive">*</span>}
    </label>
  );

  // Reusable chip component for selection
  // 선택을 위한 재사용 가능한 칩 컴포넌트
  const SelectionChip = ({
    label,
    value,
    selectedValue,
    onClick,
    className = "",
  }) => {
    const isSelected = selectedValue === value;

    return (
      <button
        type="button"
        onClick={() => onClick(value)}
        className={`relative flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap ${
          isSelected
            ? "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]"
            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80 hover:text-slate-700 dark:hover:text-foreground border border-transparent"
        } ${className}`}
      >
        {label}
      </button>
    );
  };

  // Render modal via portal to ensure correct z-index stacking context
  // 올바른 z-index 스태킹 컨텍스트 보장을 위해 포털을 통해 모달 렌더링
  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden transform transition-all m-4 relative">
        {/* Delete Confirmation Overlay */}
        {/* 삭제 확인 오버레이 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white dark:bg-card backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
              삭제 확인
            </h3>
            <p className="text-slate-500 dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              정말로 삭제하시겠습니까?
              <br />
              <span className="text-destructive mt-1 block font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <Button
                type="button"
                className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold shadow-md cursor-pointer transition-all"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "삭제"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Header Section */}
        {/* 헤더 섹션 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              {isEditMode ? "정규 시험 정보 수정" : "정규 시험 등록"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              {isEditMode
                ? "수정이 필요한 정규 시험 정보를 변경해주세요."
                : "등록할 정규 시험의 정보를 입력하세요."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with validation disabled to use custom error handling */}
        {/* 커스텀 에러 처리를 사용하기 위해 기본 유효성 검사가 비활성화된 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {/* Global API Error Message */}
          {/* 전역 API 에러 메시지 */}
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2 text-center">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Student Selection */}
            {/* 학생 선택 */}
            <div className="space-y-1.5">
              <InputLabel label="학생" hasError={!!errors.student} required />
              <div className="relative">
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className={`w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer ${
                    formData.student === ""
                      ? "text-slate-400 dark:text-muted-foreground/60"
                      : "text-slate-800 dark:text-foreground"
                  }`}
                >
                  <option value="" disabled hidden>
                    학생을 선택하세요.
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                      className="text-slate-800 dark:text-foreground dark:bg-card"
                    >
                      {student.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-5 h-5 text-slate-400 dark:text-muted-foreground/60" />
                </div>
              </div>
              {students.length === 0 && (
                <p className="text-xs text-destructive mt-1 ml-1 font-medium">
                  * 등록된 수강중인 학생이 없습니다.
                </p>
              )}
              <ErrorMessage message={errors.student} />
            </div>

            {/* Exam Date Input */}
            {/* 응시일 입력 */}
            <div className="space-y-1.5">
              <InputLabel
                label="응시일"
                hasError={!!errors.exam_date}
                required
              />
              <input
                required
                type="date"
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                onClick={(e) => e.target.showPicker()}
                className={`w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm cursor-pointer ${
                  formData.exam_date === ""
                    ? "text-slate-400 dark:text-muted-foreground/60 [&::-webkit-calendar-picker-indicator]:opacity-40"
                    : "text-slate-800 dark:text-foreground [&::-webkit-calendar-picker-indicator]:opacity-100"
                }`}
              />
              <ErrorMessage message={errors.exam_date} />
            </div>
          </div>

          {/* Exam Standard Selection */}
          {/* 시험 종류 선택 */}
          <div className="space-y-1.5">
            <InputLabel
              label="시험 종류"
              hasError={!!errors.exam_standard}
              required
            />
            <div className="relative">
              <select
                name="exam_standard"
                value={formData.exam_standard}
                onChange={(e) => {
                  handleChange(e);
                  if (e.target.value !== "manual") {
                    handleValueChange("exam_name_manual", "");
                  }
                }}
                className={`w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer
                ${
                  !formData.exam_standard
                    ? "text-slate-400 dark:text-muted-foreground/60"
                    : "text-slate-800 dark:text-foreground"
                }`}
              >
                <option value="" disabled hidden>
                  시험 종류를 선택하세요.
                </option>
                <option
                  value="manual"
                  className="text-slate-800 dark:text-foreground dark:bg-card"
                >
                  (선택지 없을 시) 직접 입력
                </option>
                {examStandards.map((std) => (
                  <option
                    key={std.id}
                    value={std.id}
                    className="text-slate-800 dark:text-foreground dark:bg-card"
                  >
                    {std.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-5 h-5 text-slate-400 dark:text-muted-foreground/60" />
              </div>
            </div>
            <ErrorMessage message={errors.exam_standard} />
          </div>

          {/* Manual Exam Name Input (Conditionally rendered) */}
          {/* 직접 입력 필드 (조건부 렌더링) */}
          {formData.exam_standard === "manual" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <InputLabel
                label="시험 종류 (직접 입력)"
                hasError={!!errors.exam_name_manual}
              />
              <input
                required
                name="exam_name_manual"
                value={formData.exam_name_manual}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                placeholder="시험 명칭 입력"
                autoComplete="off"
              />
              <ErrorMessage message={errors.exam_name_manual} />
            </div>
          )}

          <div className="h-px bg-slate-100 dark:bg-border w-full my-1" />

          {/* Exam Mode Selection */}
          {/* 응시 유형 선택 */}
          <div className="space-y-2">
            <InputLabel
              label="응시 유형"
              hasError={!!errors.exam_mode}
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <SelectionChip
                label="Gesamt"
                value="FULL"
                selectedValue={formData.exam_mode}
                onClick={handleModeChange}
                className="cursor-pointer"
              />
              <SelectionChip
                label="Schriftlich"
                value="WRITTEN"
                selectedValue={formData.exam_mode}
                onClick={handleModeChange}
                className="cursor-pointer"
              />
              <SelectionChip
                label="Mündlich"
                value="ORAL"
                selectedValue={formData.exam_mode}
                onClick={handleModeChange}
                className="cursor-pointer"
              />
            </div>
            <ErrorMessage message={errors.exam_mode} />
          </div>

          {/* Exam Status Selection */}
          {/* 시험 상태 선택 */}
          <div className="space-y-2">
            <InputLabel label="시험 상태" hasError={false} required />
            <div className="grid grid-cols-3 gap-2">
              <SelectionChip
                label="대기"
                value="WAITING"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
              />
              <SelectionChip
                label="합격"
                value="PASSED"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
              />
              <SelectionChip
                label="불합격"
                value="FAILED"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Score & Grade Inputs */}
          {/* 점수 및 등급 입력 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <InputLabel label="점수" hasError={false} />
              <input
                type="number"
                step="0.01"
                min="0"
                name="total_score"
                value={formData.total_score}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-primary dark:text-primary placeholder:text-slate-400 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <p className="text-[11px] text-slate-400 dark:text-muted-foreground/60 font-medium pl-1">
                * 점수를 확인한 경우 입력하세요.
              </p>
            </div>
            <div className="cursor-not-allowed">
              <InputLabel label="등급" hasError={false} />
              <input
                name="grade"
                value={formData.grade}
                readOnly
                className="w-full h-10 px-3 mt-1.5 rounded-lg border border-slate-200 dark:border-border bg-slate-100 dark:bg-muted/50 focus:outline-none font-bold text-sm pointer-events-none text-primary dark:text-primary placeholder:text-slate-400 text-center"
                placeholder="자동 입력"
              />
            </div>
          </div>

          {/* Memo Input */}
          {/* 메모 입력 */}
          <div className="space-y-1.5">
            <InputLabel label="메모" hasError={false} />
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/30 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm text-slate-800 dark:text-foreground placeholder:text-slate-400"
              placeholder="추가사항 / 특이사항"
              autoComplete="off"
            />
          </div>

          {/* Action Buttons */}
          {/* 하단 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            {/* Delete Button - Shows confirmation overlay */}
            {/* 삭제 버튼 - 확인 오버레이 표시 (수정 모드에서만 렌더링) */}
            {isEditMode && (
              <Button
                type="button"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 h-11 w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer transition-all"
                onClick={handleRequestDelete}
                disabled={isLoading || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}

            <Button
              type="button"
              className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
              disabled={isLoading || isDeleting}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...
                </>
              ) : isEditMode ? (
                "수정"
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
