import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, AlertTriangle, Calculator } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0);
};

export default function AddCourseModal({
  isOpen,
  onClose,
  onSuccess,
  courseData = null,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [students, setStudents] = useState([]);

  // Status für Animationssteuerung hinzugefügt
  // 애니메이션 제어용 상태 추가
  const [allowAnimation, setAllowAnimation] = useState(false);

  // Determine edit mode
  // 수정 모드 여부 확인
  const isEditMode = !!courseData;

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Initial Form State
  // 초기 폼 상태 정의
  const initialFormState = {
    student: "",
    start_date: "",
    end_date: "",
    total_hours: "",
    hourly_rate: "",
    status: "",
    is_paid: false,
    memo: "",
  };

  const [formData, setFormData] = useState(() => {
    if (courseData) {
      return {
        student: courseData.student,
        start_date: courseData.start_date,
        end_date: courseData.end_date,
        total_hours: courseData.total_hours,
        hourly_rate: courseData.hourly_rate,
        status: courseData.status,
        is_paid: courseData.is_paid,
        memo: courseData.memo || "",
      };
    }
    return initialFormState;
  });

  // Calculated field for Total Fee preview
  // 총 금액 미리보기를 위한 계산된 값
  const calculatedTotalFee =
    (parseFloat(formData.total_hours) || 0) *
    (parseFloat(formData.hourly_rate) || 0);

  // Fetch student list when modal opens and filter only 'ACTIVE' students for valid scheduling
  // 모달이 열릴 때 학생 목록을 조회하고, 유효한 수업 예약을 위해 'ACTIVE' 상태인 학생만 필터링
  useEffect(() => {
    if (isOpen) {
      const fetchStudents = async () => {
        try {
          const response = await api.get("/api/students/");
          const activeStudents = response.data.filter(
            (student) => student.status === "ACTIVE",
          );
          setStudents(activeStudents);
        } catch (err) {
          console.error("Failed to load students:", err);
          setSubmitError("학생 목록을 불러오는데 실패했습니다.");
        }
      };
      fetchStudents();
    }
  }, [isOpen]);

  // Populate data on Edit Mode
  // 수정 모드 시 데이터 채우기
  useEffect(() => {
    if (isOpen) {

      setAllowAnimation(false);

      if (courseData) {
        setFormData({
          student: courseData.student,
          start_date: courseData.start_date,
          end_date: courseData.end_date,
          total_hours: courseData.total_hours,
          hourly_rate: courseData.hourly_rate,
          status: courseData.status,
          is_paid: courseData.is_paid,
          memo: courseData.memo || "",
        });
      } else {
        setFormData(initialFormState);
        setErrors({});
        setSubmitError(null);
      }
      
      const timer = setTimeout(() => {
        setAllowAnimation(true);
      }, 200);
  
      return () => clearTimeout(timer);
    }
  }, [isOpen, courseData]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
    setShowDeleteConfirm(false);
    setAllowAnimation(false);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleValueChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Delete Handlers
  // 삭제 핸들러
  const handleRequestDelete = () => setShowDeleteConfirm(true);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/courses/${courseData.id}/`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Delete Failed:", err);
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

    // Validation Logic
    // 유효성 검사 로직
    const newErrors = {};
    if (!formData.student) newErrors.student = "학생을 선택해주세요.";
    if (!formData.status) newErrors.status = "진행 상태를 선택해주세요.";
    if (!formData.start_date) newErrors.start_date = "시작일을 입력해주세요.";
    if (!formData.end_date) newErrors.end_date = "종료일을 입력해주세요.";
    if (!formData.total_hours)
      newErrors.total_hours = "총 시간을 입력해주세요.";
    if (!formData.hourly_rate)
      newErrors.hourly_rate = "시간당 금액을 입력해주세요.";

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = "종료일은 시작일보다 늦어야 합니다.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        student: parseInt(formData.student, 10),
        total_hours: parseFloat(formData.total_hours),
        hourly_rate: parseFloat(formData.hourly_rate),
      };

      if (isEditMode) {
        await api.patch(`/api/courses/${courseData.id}/`, payload);
      } else {
        await api.post("/api/courses/", payload);
      }

      setFormData(initialFormState);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Course Create Failed:", err);

      // Set dynamic error message based on the mode (Edit vs Create)
      // 모드(수정 vs 생성)에 따라 동적인 에러 메시지 설정
      setSubmitError(
        err.response?.data?.detail ||
          `수강권 ${
            isEditMode ? "변경" : "등록"
          }에 실패했습니다. 입력 값을 확인해주세요.`,
      );
    } finally {
      setIsLoading(false);
    }
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
      className={`text-xs font-bold uppercase tracking-wider pl-1 block mb-1.5 ${
        hasError ? "text-destructive" : "text-slate-500"
      }`}
    >
      {label}
    </label>
  );

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
            : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-transparent"
        } ${className}`}
      >
        {label}
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform transition-all m-4 relative">
        {/* Delete Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">삭제 확인</h3>
            <p className="text-slate-500 text-center mb-8 max-w-xs text-sm">
              정말로 삭제하시겠습니까? <br />
              <span className="text-destructive mt-1 block">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <Button
                type="button"
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 h-11 text-sm font-semibold cursor-pointer"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold cursor-pointer"
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {isEditMode ? "수강권 정보 수정" : "수강권 등록"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? "수정이 필요한 수강권 정보를 변경해주세요."
                : "등록할 새로운 수강권의 정보를 입력하세요."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium">
              {submitError}
            </div>
          )}

          {/* Row 1: Student & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <InputLabel label="학생" hasError={!!errors.student} />
              <div className="relative">
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer
                    ${
                      formData.student === ""
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                >
                  <option value="" disabled hidden>
                    학생을 선택하세요.
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                      className="text-slate-800"
                    >
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
              {students.length === 0 && (
                <p className="text-xs text-destructive mt-1 ml-1">
                  * 등록된 수강중인 학생이 없습니다.
                </p>
              )}
              <ErrorMessage message={errors.student} />
            </div>

            <div>
              <InputLabel label="진행 상태" hasError={!!errors.status} />
              <div className="grid grid-cols-3 gap-2">
                <SelectionChip
                  label="진행중"
                  value="ACTIVE"
                  selectedValue={formData.status}
                  onClick={(v) => handleValueChange("status", v)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="일시중지"
                  value="PAUSED"
                  selectedValue={formData.status}
                  onClick={(v) => handleValueChange("status", v)}
                  className="cursor-pointer"
                />
                <SelectionChip
                  label="종료"
                  value="FINISHED"
                  selectedValue={formData.status}
                  onClick={(v) => handleValueChange("status", v)}
                  className="cursor-pointer"
                />
              </div>
              <ErrorMessage message={errors.status} />
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <InputLabel label="시작일" hasError={!!errors.start_date} />
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onClick={(e) => e.target.showPicker()}
                onChange={handleChange}
                className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm cursor-pointer ${
                  formData.start_date === ""
                    ? "text-slate-400 [&::-webkit-calendar-picker-indicator]:opacity-40"
                    : "text-slate-800 [&::-webkit-calendar-picker-indicator]:opacity-100"
                }`}
              />
              <ErrorMessage message={errors.start_date} />
            </div>
            <div>
              <InputLabel label="종료일" hasError={!!errors.end_date} />
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onClick={(e) => e.target.showPicker()}
                onChange={handleChange}
                className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm cursor-pointer ${
                  formData.end_date === ""
                    ? "text-slate-400 [&::-webkit-calendar-picker-indicator]:opacity-40"
                    : "text-slate-800 [&::-webkit-calendar-picker-indicator]:opacity-100"
                }`}
              />
              <ErrorMessage message={errors.end_date} />
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Row 3: Financials & Payment Status (Merged) */}
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* 1. Total Hours */}
            <div className="col-span-6 sm:col-span-3">
              <InputLabel label="총 시간 (h)" hasError={!!errors.total_hours} />
              <input
                type="number"
                name="total_hours"
                value={formData.total_hours}
                onChange={handleChange}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 text-sm
                placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* 2. Hourly Rate */}
            <div className="col-span-6 sm:col-span-3">
              <InputLabel label="시간당 (€)" hasError={!!errors.hourly_rate} />
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleChange}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 text-sm placeholder:text-slate-400  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* 3. Total Fee (Read Only) */}
            <div className="col-span-6 sm:col-span-3">
              <InputLabel label="총 금액" hasError={false} />
              <div className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
                <span className="text-sm font-bold text-primary truncate">
                  {formatCurrency(calculatedTotalFee)}
                </span>
              </div>
            </div>

            {/* 4. Payment Status (Redesigned Toggle) */}
            <div className="col-span-6 sm:col-span-3">
              <InputLabel label="결제 상태" hasError={false} />
              <div
                onClick={() => handleValueChange("is_paid", !formData.is_paid)}
                className={`relative w-full h-10 rounded-lg cursor-pointer flex items-center px-1 border border-transparent ${
                  allowAnimation ? "transition-colors duration-300" : ""
                } ${formData.is_paid ? "bg-accent/50" : "bg-destructive/50"}`}
              >
                {/* Text Layer: 미납 (Left side, visible when !is_paid) */}
                <span
                  className={`absolute left-0 w-full text-center text-sm font-bold text-destructive transition-opacity duration-300 pl-8 ${
                    !formData.is_paid ? "opacity-100" : "opacity-0"
                  }`}
                >
                  미납
                </span>

                {/* Text Layer: 완납 (Right side, visible when is_paid) */}
                <span
                  className={`absolute left-0 w-full text-center text-sm font-bold text-[#4a7a78] transition-opacity duration-300 pr-8 ${
                    formData.is_paid ? "opacity-100" : "opacity-0"
                  }`}
                >
                  완납
                </span>

                {/* Sliding Circle */}
                <div
                  className={`absolute bg-slate-100 w-8 h-8 rounded-md shadow-sm ease-in-out
                    ${allowAnimation ? "transition-all duration-500" : ""}
                    ${formData.is_paid ? "left-[calc(100%-36px)]" : "left-1"}`}
                />
              </div>
            </div>
          </div>
          <ErrorMessage message={errors.total_hours || errors.hourly_rate} />

          {/* Row 5: Memo */}
          <div>
            <InputLabel label="메모" hasError={false} />
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              rows={2}
              className="w-full p-3 rounded-lg border border-slate-200 bg-destructive30 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm placeholder:text-slate-400"
              placeholder="추가사항 / 특이사항"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEditMode && (
              <Button
                type="button"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 h-11 w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer"
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
              className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 cursor-pointer"
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
