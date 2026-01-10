import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

// SVG Icon for Male
// 남성용 SVG 아이콘
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

// SVG Icon for Female
// 여성용 SVG 아이콘
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

export default function AddStudentModal({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  // Manage validation errors per field (object) and general submission errors (string)
  // 필드별 유효성 에러(객체)와 일반 제출 에러(문자열)를 구분하여 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Initial form state matching the Student model fields
  // Student 모델 필드와 일치하는 초기 폼 상태
  const initialFormState = {
    name: "",
    gender: "",
    age: "",
    current_level: "",
    target_level: "",
    target_exam_mode: "",
    status: "",
    memo: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Do not render if modal is closed
  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // Reset all states (form, field errors, submit error) on close
  // 닫기 시 모든 상태(폼, 필드 에러, 제출 에러) 초기화
  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    // 사용자가 입력을 시작하면 해당 필드의 에러 메시지 제거
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleValueChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user selects a value
    // 사용자가 값을 선택하면 해당 필드의 에러 메시지 제거
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    // [Validation Logic] Collect all errors instead of returning early
    // [유효성 검사 로직] 조기 반환 대신 모든 에러를 수집
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "이름을 입력해주세요.";
    if (!formData.age) newErrors.age = "나이를 입력해주세요.";
    if (!formData.gender) newErrors.gender = "성별을 선택해주세요.";
    if (!formData.current_level)
      newErrors.current_level = "현재 레벨을 선택해주세요.";
    if (!formData.target_level)
      newErrors.target_level = "목표 레벨을 선택해주세요.";
    if (!formData.target_exam_mode)
      newErrors.target_exam_mode = "시험 유형을 선택해주세요.";
    if (!formData.status) newErrors.status = "수강 상태를 선택해주세요.";

    // If there are validation errors, update state and stop submission
    // 유효성 에러가 존재하면 상태를 업데이트하고 제출 중단
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age, 10),
      };

      await api.post("/api/students/", payload);

      setFormData(initialFormState);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Student Create Failed:", err);
      // Handle API errors (e.g., 500 Server Error) separately
      // API 에러(예: 500 서버 에러)는 별도로 처리
      setSubmitError(
        err.response?.data?.detail ||
          "학생 등록에 실패했습니다. 입력 값을 확인해주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable Chip Component extended to support optional icons
  // 선택적 아이콘 지원을 위해 확장된 재사용 가능한 칩 컴포넌트
  const SelectionChip = ({
    label,
    value,
    selectedValue,
    onClick,
    icon: Icon,
    className = "",
  }) => {
    const isSelected = selectedValue === value;
    return (
      <button
        type="button"
        onClick={() => onClick(value)}
        className={`
            relative flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap
            ${
              isSelected
                ? "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-transparent"
            }
            ${className}
          `}
      >
        {/* Render icon if provided, changing color based on selection state */}
        {/* 아이콘 제공 시 렌더링하며 선택 상태에 따라 색상 변경 */}
        {Icon && (
          <Icon
            className={`w-4 h-4 mr-1.5 ${
              isSelected
                ? "text-white"
                : "text-slate-400 group-hover:text-slate-600"
            }`}
          />
        )}
        {label}
      </button>
    );
  };

  // Helper component for rendering inline error messages
  // 인라인 에러 메시지 렌더링을 위한 헬퍼 컴포넌트
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1">
        {message}
      </p>
    );
  };

  // Helper component for Labels with conditional error styling
  // 조건부 에러 스타일링이 적용된 라벨 헬퍼 컴포넌트
  const InputLabel = ({ label, hasError }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 flex items-center ${
        hasError ? "text-destructive" : "text-slate-500"
      }`}
    >
      {label}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform transition-all m-4">
        {/* Header */}
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              학생 등록
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              등록할 새로운 학생의 정보를 입력하세요.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {/* 폼 본문 */}
        {/* noValidate prevents browser default tooltips */}
        {/* noValidate는 브라우저 기본 툴팁 표시를 방지함 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {/* Display general API submission errors at the top */}
          {/* API 제출 관련 일반 에러는 상단에 표시 */}
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2">
              {submitError}
            </div>
          )}

          {/* Row 1: Name, Age, Gender */}
          {/* 1행: 이름, 나이, 성별 */}
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Name Input */}
            {/* 이름 입력 */}
            <div className="col-span-12 sm:col-span-5 space-y-1.5">
              <InputLabel label="이름" hasError={!!errors.name} />
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-sm"
                placeholder="학생 이름"
              />
              <ErrorMessage message={errors.name} />
            </div>

            {/* Age Input */}
            {/* 나이 입력 */}
            <div className="col-span-4 sm:col-span-2 space-y-1.5">
              <InputLabel label="나이" hasError={!!errors.age} />
              <input
                required
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="학생 나이"
              />
              <ErrorMessage message={errors.age} />
            </div>

            {/* Gender Selection */}
            {/* 성별 선택 */}
            <div className="col-span-8 sm:col-span-5 space-y-1.5">
              <InputLabel label="성별" hasError={!!errors.gender} />
              <div className="grid grid-cols-2 gap-2 h-10">
                <SelectionChip
                  label="남성"
                  value="M"
                  icon={MaleIcon}
                  selectedValue={formData.gender}
                  onClick={(val) => handleValueChange("gender", val)}
                  className="h-full cursor-pointer"
                />
                <SelectionChip
                  label="여성"
                  value="F"
                  icon={FemaleIcon}
                  selectedValue={formData.gender}
                  onClick={(val) => handleValueChange("gender", val)}
                  className="h-full cursor-pointer"
                />
              </div>
              <ErrorMessage message={errors.gender} />
            </div>
          </div>

          {/* Row 2: Levels */}
          {/* 2행: 레벨 */}
          <div className="grid grid-cols-2 gap-6 items-start">
            {/* Current Level */}
            {/* 현재 레벨 */}
            <div className="space-y-2">
              <InputLabel label="현재 레벨" hasError={!!errors.current_level} />
              <div className="grid grid-cols-3 gap-1.5">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                  <SelectionChip
                    key={`curr-${lv}`}
                    label={lv}
                    value={lv}
                    selectedValue={formData.current_level}
                    onClick={(val) => handleValueChange("current_level", val)}
                    className="cursor-pointer"
                  />
                ))}
              </div>
              <ErrorMessage message={errors.current_level} />
            </div>

            {/* Target Level */}
            {/* 목표 레벨 */}
            <div className="space-y-2">
              <InputLabel label="목표 레벨" hasError={!!errors.target_level} />
              <div className="grid grid-cols-3 gap-1.5">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                  <SelectionChip
                    key={`target-${lv}`}
                    label={lv}
                    value={lv}
                    selectedValue={formData.target_level}
                    onClick={(val) => handleValueChange("target_level", val)}
                    className="cursor-pointer"
                  />
                ))}
              </div>
              <ErrorMessage message={errors.target_level} />
            </div>
          </div>

          {/* Row 3: Exam & Status */}
          {/* 3행: 시험 유형 및 상태 */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Target Exam Mode */}
            {/* 목표 시험 유형 */}
            <div className="col-span-12 sm:col-span-7 space-y-2">
              <InputLabel
                label="목표 시험 유형"
                hasError={!!errors.target_exam_mode}
              />
              <div className="grid grid-cols-3 gap-1.5">
                <SelectionChip
                  label="Gesamt"
                  value="FULL"
                  selectedValue={formData.target_exam_mode}
                  onClick={(val) => handleValueChange("target_exam_mode", val)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="Schriftlich"
                  value="WRITTEN"
                  selectedValue={formData.target_exam_mode}
                  onClick={(val) => handleValueChange("target_exam_mode", val)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="Mündlich"
                  value="ORAL"
                  selectedValue={formData.target_exam_mode}
                  onClick={(val) => handleValueChange("target_exam_mode", val)}
                  className="cursor-pointer"
                />
              </div>
              <ErrorMessage message={errors.target_exam_mode} />
            </div>

            {/* Status */}
            {/* 수강 상태 */}
            <div className="col-span-12 sm:col-span-5 space-y-2">
              <InputLabel label="수강 상태" hasError={!!errors.status} />
              <div className="grid grid-cols-3 gap-1.5">
                <SelectionChip
                  label="수강중"
                  value="ACTIVE"
                  selectedValue={formData.status}
                  onClick={(val) => handleValueChange("status", val)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="일시중지"
                  value="PAUSED"
                  selectedValue={formData.status}
                  onClick={(val) => handleValueChange("status", val)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="종료"
                  value="FINISHED"
                  selectedValue={formData.status}
                  onClick={(val) => handleValueChange("status", val)}
                  className="cursor-pointer"
                />
              </div>
              <ErrorMessage message={errors.status} />
            </div>
          </div>

          {/* Row 4: Memo */}
          {/* 4행: 메모 */}
          <div className="space-y-1.5">
            <InputLabel label="메모" hasError={false} />
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              rows={4}
              className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm placeholder:text-slate-400"
              placeholder="학생에 대한 추가 정보 / 특이사항"
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
