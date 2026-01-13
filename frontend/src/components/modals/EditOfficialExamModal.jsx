import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

export default function EditOfficialExamModal({
  isOpen,
  onClose,
  onSuccess,
  examData,
}) {
  const [isLoading, setIsLoading] = useState(false);

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
    status: "",
    total_score: "",
    grade: "",
    memo: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch student list when modal opens and filter only 'ACTIVE' students
  // Uses server-side filtering (?status=ACTIVE) to optimize performance
  // 모달이 열릴 때 학생 목록을 조회하고, 'ACTIVE' 상태인 학생만 필터링
  // 성능 최적화를 위해 서버 사이드 필터링(?status=ACTIVE)을 사용
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [studentsRes, standardsRes] = await Promise.all([
            api.get("/api/students/?status=ACTIVE"),
            api.get("/api/exam-standards/"),
          ]);
          setStudents(studentsRes.data);
          setExamStandards(standardsRes.data);
        } catch (err) {
          console.error("Failed to load dropdown data:", err);
          setSubmitError("필수 데이터를 불러오는데 실패했습니다.");
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Populate form with existing data when editing
  // 수정 시 기존 데이터로 폼 필드 채우기
  useEffect(() => {
    if (isOpen && examData) {
      setFormData({
        student: examData.student,
        exam_standard: examData.exam_standard || "",
        exam_name_manual: examData.exam_name_manual || "",
        exam_date: examData.exam_date,
        status: examData.status || "WAITING",
        total_score: examData.total_score || "",
        grade: examData.grade || "",
        memo: examData.memo || "",
      });
    }
  }, [isOpen, examData]);

  if (!isOpen) return null;

  // Reset form and errors on close
  // 닫을 때 폼 상태와 에러 초기화
  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
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

  const handleStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    // Validate required fields: Student, Date, and Exam Type (Standard or Manual)
    // 필수 필드 유효성 검사: 학생, 날짜, 시험 유형(표준 또는 직접 입력)
    const newErrors = {};
    if (!formData.student) newErrors.student = "학생을 선택해주세요.";
    if (!formData.exam_date) newErrors.exam_date = "응시일을 선택해주세요.";
    if (!formData.exam_standard && !formData.exam_name_manual.trim()) {
      newErrors.exam_standard = "시험 종류를 선택하거나 직접 입력해주세요.";
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
        exam_standard: formData.exam_standard
          ? parseInt(formData.exam_standard, 10)
          : null,
      };

      // Perform partial update using PATCH
      // PATCH를 사용하여 부분 업데이트 수행
      await api.patch(`/api/official-results/${examData.id}/`, payload);
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
          responseData?.detail || "시험 정보 업데이트에 실패했습니다.",
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
  const InputLabel = ({ label, hasError }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 flex items-center gap-1 ${
        hasError ? "text-destructive" : "text-slate-500"
      }`}
    >
      {label}
    </label>
  );

  // Reusable chip component for selection (e.g., Status)
  // 선택을 위한 재사용 가능한 칩 컴포넌트 (예: 상태 선택)
  const SelectionChip = ({
    label,
    value,
    selectedValue,
    onClick,
    className = "",
    colorClass = "",
  }) => {
    const isSelected = selectedValue === value;

    // Define base styles for unselected state
    // 선택되지 않은 상태의 기본 스타일 정의
    const baseStyle =
      "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700";

    // Define active styles: Use custom color class if provided, otherwise default to primary
    // 활성 스타일 정의: 제공된 경우 커스텀 색상 클래스 사용, 그렇지 않으면 기본 프라이머리 사용
    const activeStyle = colorClass
      ? `${colorClass} ring-1 ring-offset-1 transform scale-[1.02] shadow-sm`
      : "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]";

    return (
      <button
        type="button"
        onClick={() => onClick(value)}
        className={`relative flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap border 
        ${isSelected ? activeStyle : baseStyle} ${className}`}
      >
        {label}
      </button>
    );
  };

  // Render modal via portal to ensure correct z-index stacking context
  // 올바른 z-index 스태킹 컨텍스트 보장을 위해 포털을 통해 모달 렌더링
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform transition-all m-4">
        {/* Header Section */}
        {/* 헤더 섹션 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              시험 정보 수정
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              수정이 필요한 시험 정보를 변경해주세요.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Student Selection */}
            {/* 학생 선택 */}
            <div className="space-y-1.5">
              <InputLabel label="학생" hasError={!!errors.student} />
              <div className="relative">
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm text-slate-800 appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    학생 선택
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <ErrorMessage message={errors.student} />
            </div>

            {/* Exam Date Input */}
            {/* 응시일 입력 */}
            <div className="space-y-1.5">
              <InputLabel label="응시일" hasError={!!errors.exam_date} />
              <input
                type="date"
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 text-sm cursor-pointer"
              />
              <ErrorMessage message={errors.exam_date} />
            </div>
          </div>

          {/* Exam Standard Selection */}
          {/* 시험 종류 선택 */}
          <div className="space-y-1.5">
            <InputLabel label="시험 종류" hasError={!!errors.exam_standard} />
            <div className="relative">
              <select
                name="exam_standard"
                value={formData.exam_standard}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm text-slate-800 appearance-none cursor-pointer"
              >
                <option value="">(선택지 없을 시) 직접 입력</option>
                {examStandards.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <ErrorMessage message={errors.exam_standard} />
          </div>

          {/* Manual Exam Name Input (Conditionally rendered) */}
          {/* 직접 입력 필드 (조건부 렌더링) */}
          {!formData.exam_standard && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <InputLabel
                label="시험 종류 (직접 입력)"
                hasError={!!errors.exam_standard}
              />
              <input
                name="exam_name_manual"
                value={formData.exam_name_manual}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-sm"
                placeholder="시험 명칭 입력"
              />
            </div>
          )}

          <div className="h-px bg-slate-100 w-full my-1" />

          {/* Exam Status Selection */}
          {/* 시험 상태 선택 */}
          <div className="space-y-2">
            <InputLabel label="시험 상태" hasError={false} />
            <div className="grid grid-cols-3 gap-2">
              <SelectionChip
                label="대기"
                value="WAITING"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
                colorClass="bg-slate-200 text-slate-700 border-slate-300 ring-slate-400"
              />
              <SelectionChip
                label="합격"
                value="PASSED"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
                colorClass="bg-success/15 text-success border-success/30 ring-success"
              />
              <SelectionChip
                label="불합격"
                value="FAILED"
                selectedValue={formData.status}
                onClick={handleStatusChange}
                className="cursor-pointer"
                colorClass="bg-destructive/10 text-destructive border-destructive/30 ring-destructive"
              />
            </div>
          </div>

          {/* Score & Grade Inputs */}
          {/* 점수 및 등급 입력 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <InputLabel label="점수" hasError={false} />
              <input
                name="total_score"
                value={formData.total_score}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-sm"
                placeholder="z.B. 점수/총점"
              />
              <p className="text-[11px] text-slate-400 font-medium pl-1">
                * 점수를 확인한 경우 입력하세요.
              </p>
            </div>
            <div className="space-y-1.5">
              <InputLabel label="등급" hasError={false} />
              <input
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-sm"
                placeholder="z.B. gut, sehr gut"
              />
              <p className="text-[11px] text-slate-400 font-medium pl-1">
                * 등급을 확인한 경우 입력하세요.
              </p>
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
              className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm placeholder:text-slate-400"
              placeholder="시험 관련 특이사항, 정보 등"
            />
          </div>

          {/* Action Buttons */}
          {/* 하단 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
