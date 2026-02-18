import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
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

// Current Level Options
// 현재 레벨: A0(왕초보)부터 C1까지
const CURRENT_LEVEL_OPTIONS = ["A0", "A1", "A2", "B1", "B2", "C1"];

// Target Level Options
// 목표 레벨: A1부터 C2(원어민 수준)까지
const TARGET_LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
  studentData = null,
}) {
  const { t, i18n } = useTranslation();
  const isGerman = i18n?.resolvedLanguage?.startsWith("de") || false;
  const defaultCountry = isGerman ? "Deutschland" : "독일";

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage validation errors per field (object) and general submission errors (string)
  // 필드별 유효성 에러(객체)와 일반 제출 에러(문자열)를 구분하여 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // State for managing delete confirmation overlay visibility
  // 삭제 확인 오버레이 표시 여부를 관리하는 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine if the modal is in edit mode
  // 수정 모드인지 확인
  const isEditMode = !!studentData;

  // Initial form state matching the Student model fields
  // Student 모델 필드와 일치하는 초기 폼 상태
  const initialFormState = useMemo(
    () => ({
      name: "",
      gender: "",
      age: "",
      current_level: "",
      target_level: "",
      target_exam_mode: "",
      status: "",
      street: "",
      postcode: "",
      city: "",
      country: defaultCountry,
      billing_name: "",
      memo: "",
    }),
    [defaultCountry],
  );

  const [formData, setFormData] = useState(initialFormState);

  // Populate form data when opening in edit mode
  // 수정 모드일 때 폼 데이터 채우기
  useEffect(() => {
    if (isOpen && studentData) {
      setFormData({
        name: studentData.name,
        gender: studentData.gender,
        age: studentData.age,
        current_level: studentData.current_level,
        target_level: studentData.target_level,
        target_exam_mode: studentData.target_exam_mode,
        status: studentData.status,
        street: studentData.street || "",
        postcode: studentData.postcode || "",
        city: studentData.city || "",
        country: studentData.country || defaultCountry,
        billing_name: studentData.billing_name || "",
        memo: studentData.memo || "",
      });
    } else if (isOpen) {
      setFormData(initialFormState);
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, studentData, initialFormState, defaultCountry]);

  // Do not render if modal is closed
  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // Reset all states (form, field errors, submit error) on close
  // 닫기 시 모든 상태(폼, 필드 에러, 제출 에러) 초기화
  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
    setShowDeleteConfirm(false);
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

  // Trigger delete confirmation
  // 삭제 확인창 띄우기
  const handleRequestDelete = () => setShowDeleteConfirm(true);

  // Execute delete operation
  // 삭제 실행
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/students/${studentData.id}/`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Delete Failed:", err);
      setSubmitError(t("student_modal_error_delete"));
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    // [Validation Logic] Collect all errors instead of returning early
    // [유효성 검사 로직] 조기 반환 대신 모든 에러를 수집
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = t("student_modal_error_name");
    if (!formData.gender) newErrors.gender = t("student_modal_error_gender");
    if (!formData.current_level)
      newErrors.current_level = t("student_modal_error_current_level");
    if (!formData.target_level)
      newErrors.target_level = t("student_modal_error_target_level");
    if (!formData.target_exam_mode)
      newErrors.target_exam_mode = t("student_modal_error_exam_mode");
    if (!formData.status) newErrors.status = t("student_modal_error_status");

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
        age: formData.age ? parseInt(formData.age, 10) : null,
        billing_name: formData.billing_name.trim() || formData.name,
      };

      if (isEditMode) {
        await api.patch(`/api/students/${studentData.id}/`, payload);
      } else {
        await api.post("/api/students/", payload);
      }

      setFormData(initialFormState);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Student Create Failed:", err);
      const responseData = err.response?.data;

      // Robust Error Handling for Django Rest Framework (DRF)
      // Check if the error response is an object with field-specific errors
      // DRF의 필드별 상세 에러 객체를 처리하여 UI에 반영
      if (
        responseData &&
        typeof responseData === "object" &&
        !responseData.detail
      ) {
        const fieldErrors = {};
        Object.keys(responseData).forEach((key) => {
          // DRF returns errors as arrays
          // DRF는 에러를 배열로 반환하므로 첫 번째 메시지를 추출
          fieldErrors[key] = Array.isArray(responseData[key])
            ? responseData[key][0]
            : responseData[key];
        });
        setErrors(fieldErrors);

        // 필드 에러가 있어도 상단에 에러 메시지 표시
        setSubmitError(t("student_modal_error_check_input"));
      } else {
        // Fallback for general errors
        // 일반 에러 처리
        setSubmitError(
          responseData?.detail ||
            t("student_modal_error_save", {
              action: isEditMode
                ? t("student_modal_action_edit")
                : t("student_modal_action_add"),
            }),
        );
      }
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
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-transparent dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80"
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
                : "text-slate-400 group-hover:text-slate-600 dark:text-muted-foreground/70"
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
  const InputLabel = ({ label, required, hasError, subLabel }) => (
    <label
      className={`text-xs font-bold tracking-wider pl-1 flex items-center mb-1.5 ${
        hasError
          ? "text-destructive"
          : "text-slate-500 dark:text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-destructive ml-0.5">*</span>}
      {subLabel && (
        <span className="text-[10px] normal-case font-normal ml-2 opacity-70 text-slate-400">
          ({subLabel})
        </span>
      )}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden transform transition-all m-4 relative flex flex-col max-h-[85vh]">
        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white dark:bg-card backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
              {t("delete_modal_title")}
            </h3>
            <p className="text-slate-500 dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              {t("delete_modal_question")}
              <br />
              <span className="text-destructive mt-1 block font-medium">
                {t("delete_modal_desc_highlight_irreversible")}
              </span>
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <Button
                type="button"
                className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t("delete_modal_cancel")}
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold shadow-md cursor-pointer transition-all"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("delete_modal_delete")
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              {isEditMode
                ? t("student_modal_title_edit")
                : t("student_modal_title_add")}
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              {isEditMode
                ? t("student_modal_desc_edit")
                : t("student_modal_desc_add")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        {/* 폼 본문 (스크롤 가능) */}
        {/* noValidate prevents browser default tooltips */}
        {/* noValidate는 브라우저 기본 툴팁 표시를 방지함 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form
            id="student-form"
            onSubmit={handleSubmit}
            className="p-6 space-y-6"
            noValidate
          >
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
                <InputLabel
                  label={t("student_modal_field_name")}
                  hasError={!!errors.name}
                  required
                />
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                  placeholder={t("student_modal_placeholder_name")}
                  autoComplete="off"
                />
                <ErrorMessage message={errors.name} />
              </div>

              {/* Age Input */}
              {/* 나이 입력 */}
              <div className="col-span-4 sm:col-span-2 space-y-1.5">
                <InputLabel label={t("student_modal_field_age")} hasError={!!errors.age} />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={t("student_modal_placeholder_age")}
                />
                <ErrorMessage message={errors.age} />
              </div>

              {/* Gender Selection */}
              {/* 성별 선택 */}
              <div className="col-span-8 sm:col-span-5 space-y-1.5">
                <InputLabel
                  label={t("student_modal_field_gender")}
                  hasError={!!errors.gender}
                  required
                />
                <div className="grid grid-cols-2 gap-2 h-10">
                  <SelectionChip
                    label={t("student_modal_gender_male")}
                    value="M"
                    icon={MaleIcon}
                    selectedValue={formData.gender}
                    onClick={(val) => handleValueChange("gender", val)}
                    className="h-full cursor-pointer dark:hover:text-foreground"
                  />
                  <SelectionChip
                    label={t("student_modal_gender_female")}
                    value="F"
                    icon={FemaleIcon}
                    selectedValue={formData.gender}
                    onClick={(val) => handleValueChange("gender", val)}
                    className="h-full cursor-pointer dark:hover:text-foreground"
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
                <InputLabel
                  label={t("student_modal_field_current_level")}
                  hasError={!!errors.current_level}
                  required
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {CURRENT_LEVEL_OPTIONS.map((lv) => (
                    <SelectionChip
                      key={`curr-${lv}`}
                      label={lv}
                      value={lv}
                      selectedValue={formData.current_level}
                      onClick={(val) => handleValueChange("current_level", val)}
                      className="cursor-pointer dark:hover:text-foreground"
                    />
                  ))}
                </div>
                <ErrorMessage message={errors.current_level} />
              </div>

              {/* Target Level */}
              {/* 목표 레벨 */}
              <div className="space-y-2">
                <InputLabel
                  label={t("student_modal_field_target_level")}
                  hasError={!!errors.target_level}
                  required
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {TARGET_LEVEL_OPTIONS.map((lv) => (
                    <SelectionChip
                      key={`target-${lv}`}
                      label={lv}
                      value={lv}
                      selectedValue={formData.target_level}
                      onClick={(val) => handleValueChange("target_level", val)}
                      className="cursor-pointer dark:hover:text-foreground"
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
                  label={t("student_modal_field_target_exam_mode")}
                  hasError={!!errors.target_exam_mode}
                  required
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <SelectionChip
                    label={t("student_exam_mode_full")}
                    value="FULL"
                    selectedValue={formData.target_exam_mode}
                    onClick={(val) =>
                      handleValueChange("target_exam_mode", val)
                    }
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                  <SelectionChip
                    label={t("student_exam_mode_written")}
                    value="WRITTEN"
                    selectedValue={formData.target_exam_mode}
                    onClick={(val) =>
                      handleValueChange("target_exam_mode", val)
                    }
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                  <SelectionChip
                    label={t("student_exam_mode_oral")}
                    value="ORAL"
                    selectedValue={formData.target_exam_mode}
                    onClick={(val) =>
                      handleValueChange("target_exam_mode", val)
                    }
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                </div>
                <ErrorMessage message={errors.target_exam_mode} />
              </div>

              {/* Status */}
              {/* 수강 상태 */}
              <div className="col-span-12 sm:col-span-5 space-y-2">
                <InputLabel
                  label={t("student_modal_field_status")}
                  hasError={!!errors.status}
                  required
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <SelectionChip
                    label={t("student_status_active")}
                    value="ACTIVE"
                    selectedValue={formData.status}
                    onClick={(val) => handleValueChange("status", val)}
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                  <SelectionChip
                    label={t("student_status_paused")}
                    value="PAUSED"
                    selectedValue={formData.status}
                    onClick={(val) => handleValueChange("status", val)}
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                  <SelectionChip
                    label={t("student_status_finished")}
                    value="FINISHED"
                    selectedValue={formData.status}
                    onClick={(val) => handleValueChange("status", val)}
                    className="cursor-pointer dark:hover:text-foreground"
                  />
                </div>
                <ErrorMessage message={errors.status} />
              </div>
            </div>

            {/* Row 4: Memo */}
            {/* 4행: 메모 */}
            <div className="space-y-1.5">
              <InputLabel label={t("student_modal_field_memo")} hasError={false} />
              <textarea
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/30 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm text-slate-800 dark:text-foreground placeholder:text-slate-400"
                placeholder={t("student_modal_placeholder_memo")}
                autoComplete="off"
              />
            </div>

            {/* Raw 5: Invoice Information */}
            {/* 5행: 영수증 정보 입력 */}
            <div className="pt-2">
              <h4 className="text-sm font-bold text-slate-700 dark:text-foreground mb-3 flex items-center gap-2">
                {t("student_modal_billing_section")}
                <div className="h-px flex-1 bg-slate-100 dark:bg-border"></div>
              </h4>
              <div className="grid grid-cols-6 gap-4">

                {/* Billing Name Input (Full Width) */}
                {/* 청구인 이름 입력 (전체 너비) */}
                <div className="col-span-6 space-y-1.5">
                  <InputLabel
                    label={t("student_modal_field_billing_name")}
                    subLabel={t("student_modal_field_billing_name_sub")}
                  />
                  <input
                    name="billing_name"
                    value={formData.billing_name}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    placeholder={t("student_modal_placeholder_billing_name")}
                    autoComplete="off"
                  />
                </div>

                {/* Street Input */}
                {/* 주소 입력 */}
                <div className="col-span-6 space-y-1.5">
                  <InputLabel label={t("student_modal_field_street")} />
                  <input
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    placeholder={t("student_modal_placeholder_street")}
                    autoComplete="off"
                  />
                </div>

                {/* Postcode Input */}
                {/* 우편번호 입력 */}
                <div className="col-span-2 space-y-1.5">
                  <InputLabel label={t("student_modal_field_postcode")} />
                  <input
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    placeholder={t("student_modal_placeholder_postcode")}
                    autoComplete="off"
                  />
                </div>

                {/* City Input */}
                {/* 도시 입력 */}
                <div className="col-span-2 space-y-1.5">
                  <InputLabel label={t("student_modal_field_city")} />
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    placeholder={t("student_modal_placeholder_city")}
                    autoComplete="off"
                  />
                </div>

                {/* Country Input */}
                {/* 국가 입력 */}
                <div className="col-span-2 space-y-1.5">
                  <InputLabel label={t("student_modal_field_country")} />
                  <input
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    placeholder={t("student_modal_placeholder_country")}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        {/* 하단 액션 버튼 */}
        <div className="px-6 py-4 flex gap-3">
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
            {t("student_modal_cancel")}
          </Button>
          <Button
            type="submit"
            form="student-form"
            className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
            disabled={isLoading || isDeleting}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                {isEditMode
                  ? t("student_modal_saving_edit")
                  : t("student_modal_saving_add")}
              </>
            ) : isEditMode ? (
              t("student_modal_action_edit")
            ) : (
              t("student_modal_action_add")
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
