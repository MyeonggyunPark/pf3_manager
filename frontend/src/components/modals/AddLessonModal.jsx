import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

export default function AddLessonModal({
  isOpen,
  onClose,
  onSuccess,
  lessonData = null,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [students, setStudents] = useState([]);

  // State for managing delete confirmation overlay visibility
  // 삭제 확인 오버레이 표시 여부를 관리하는 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine if the modal is in edit mode based on provided lessonData
  // lessonData 존재 여부를 기반으로 수정 모드인지 확인
  const isEditMode = !!lessonData;

  // Manage validation errors per field (object) and general submission errors (string)
  // 필드별 유효성 에러(객체)와 일반 제출 에러(문자열)를 구분하여 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Generate 30-minute time slots (00:00 to 23:30) for dropdown selection efficiently
  // 드롭다운 선택을 위한 30분 단위 시간 슬롯(00:00 ~ 23:30)을 효율적으로 생성
  const timeOptions = useMemo(() => {
    const times = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, "0");
      times.push(`${hour}:00`);
      times.push(`${hour}:30`);
    }
    return times;
  }, []);

  // Define initial form state with default values, setting date to today
  // 기본값으로 초기 폼 상태를 정의하며, 날짜는 오늘로 설정
  const initialFormState = {
    student: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    topic: "",
    status: "",
    memo: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Populate form data when opening in edit mode, or reset to defaults in create mode
  // 수정 모드로 열릴 때 폼 데이터를 채우거나, 생성 모드일 때 기본값으로 초기화
  useEffect(() => {
    if (isOpen && lessonData) {
      setFormData({
        student: lessonData.student,
        date: lessonData.date,
        // Format HH:MM:SS to HH:MM for input compatibility
        // 입력 필드 호환성을 위해 HH:MM:SS 형식을 HH:MM으로 포맷팅
        start_time: lessonData.start_time.slice(0, 5),
        end_time: lessonData.end_time.slice(0, 5),
        topic: lessonData.topic || "",
        status: lessonData.status,
        memo: lessonData.memo || "",
      });
    } else if (isOpen && !lessonData) {
      setFormData(initialFormState);
    }
  }, [isOpen, lessonData]);

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

  if (!isOpen) return null;

  // Reset form state and error messages before closing the modal to prevent stale data
  // 모달을 닫기 전 폼 데이터와 에러 메시지를 초기화하여 잔존 데이터 방지
  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setSubmitError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Update form state and clear specific field error to provide immediate feedback
  // 폼 상태를 업데이트하고 즉각적인 피드백을 위해 해당 필드의 에러를 제거
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  // Trigger the delete confirmation overlay instead of window.confirm
  // window.confirm 대신 삭제 확인 오버레이를 활성화
  const handleRequestDelete = () => {
    setShowDeleteConfirm(true);
  };

  // Execute the actual delete operation when confirmed in the overlay
  // 오버레이에서 확인 시 실제 삭제 작업 실행
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/lessons/${lessonData.id}/`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Delete Failed:", err);
      setSubmitError("삭제 중 오류가 발생했습니다.");
      // Close overlay on error (에러 발생 시 오버레이 닫기)
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    // Perform frontend validation including logic check to ensure end time is after start time
    // 종료 시간이 시작 시간보다 늦는지 확인하는 로직을 포함한 프론트엔드 유효성 검사 수행
    const newErrors = {};

    if (!formData.student) newErrors.student = "학생을 선택해주세요.";
    if (!formData.date) newErrors.date = "날짜를 선택해주세요.";
    if (!formData.start_time)
      newErrors.start_time = "시작 시간을 선택해주세요.";
    if (!formData.end_time) newErrors.end_time = "종료 시간을 선택해주세요.";
    if (!formData.status) newErrors.status = "수업 상태를 선택해주세요.";
    if (formData.start_time && formData.end_time) {
      if (formData.end_time <= formData.start_time) {
        newErrors.end_time = "종료 시간은 시작 시간보다 늦어야 합니다.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Convert student ID to integer to match backend requirements and submit data
      // 백엔드 요구사항에 맞춰 학생 ID를 정수로 변환하여 데이터 전송
      const payload = {
        ...formData,
        student: parseInt(formData.student, 10),
      };

      // Call API: PATCH for updates (Edit), POST for creation (Add)
      // API 호출: 수정 시 PATCH, 생성 시 POST 사용
      if (isEditMode) {
        await api.patch(`/api/lessons/${lessonData.id}/`, payload);
      } else {
        await api.post("/api/lessons/", payload);
      }

      setFormData(initialFormState);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Lesson Create Failed:", err);
      // Set dynamic error message based on the mode (Edit vs Create)
      // 모드(수정 vs 생성)에 따라 동적인 에러 메시지 설정
      setSubmitError(
        err.response?.data?.detail ||
          `수업 ${
            isEditMode ? "변경" : "등록"
          }에 실패했습니다. 입력 값을 확인해주세요.`,
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
      className={`text-xs font-bold uppercase tracking-wider pl-1 flex items-center gap-1 ${
        hasError ? "text-destructive" : "text-slate-500"
      }`}
    >
      {label}
    </label>
  );

  // Use portal to render modal outside the parent DOM hierarchy for correct z-index stacking
  // 올바른 z-index 스태킹을 위해 부모 DOM 계층 외부에서 모달을 렌더링하도록 포털 사용
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform transition-all m-4 relative">
        {/* Delete Confirmation Overlay (Conditional Rendering) */}
        {/* 삭제 확인 오버레이 (조건부 렌더링) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              삭제 확인
            </h3>
            <p className="text-slate-500 text-center mb-8 max-w-xs">
              정말로 삭제하시겠습니까?
              <br />
              <span className="text-sm text-destructive mt-1 block">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <Button
                type="button"
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 shadow-md shadow-destructive/20 text-sm font-semibold cursor-pointer transition-all"
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

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {/* Dynamic title based on mode */}
              {/* 모드에 따른 동적 타이틀 */}
              {isEditMode ? "수업 변경" : "수업 추가"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditMode
                ? "수정이 필요한 수업 정보를 변경해주세요."
                : "추가할 새로운 수업의 정보를 입력하세요."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disable default browser validation to use custom UI error handling */}
        {/* 커스텀 UI 에러 처리를 사용하기 위해 브라우저 기본 유효성 검사 비활성화 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <InputLabel label="학생" hasError={!!errors.student} />
              <div className="relative">
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer ${
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

            <div className="space-y-1.5">
              <InputLabel label="수업일" hasError={!!errors.date} />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                onClick={(e) => e.target.showPicker()}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 text-sm cursor-pointer"
              />
              <ErrorMessage message={errors.date} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-1.5">
              <InputLabel
                label="수업 시간"
                hasError={!!errors.start_time || !!errors.end_time}
              />
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer text-center ${
                      formData.start_time === ""
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    <option value="" disabled hidden>
                      시작
                    </option>
                    {timeOptions.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-400 font-bold">-</span>

                <div className="relative flex-1">
                  <select
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer text-center ${
                      formData.end_time === ""
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    <option value="" disabled hidden>
                      종료
                    </option>
                    {timeOptions.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ErrorMessage message={errors.start_time || errors.end_time} />
            </div>

            <div className="space-y-1.5">
              <InputLabel label="수업 주제" hasError={false} />
              <input
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 text-sm"
                placeholder="예: Chapter 5 문법"
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full my-2" />

          <div className="space-y-2">
            <InputLabel label="수업 상태" hasError={!!errors.status} />
            <div className="grid grid-cols-4 gap-2">
              <SelectionChip
                label="예정"
                value="SCHEDULED"
                selectedValue={formData.status}
                onClick={(val) => handleValueChange("status", val)}
                className="cursor-pointer"
              />
              <SelectionChip
                label="완료"
                value="COMPLETED"
                selectedValue={formData.status}
                onClick={(val) => handleValueChange("status", val)}
                className="cursor-pointer"
              />
              <SelectionChip
                label="취소"
                value="CANCELLED"
                selectedValue={formData.status}
                onClick={(val) => handleValueChange("status", val)}
                className="cursor-pointer"
              />
              <SelectionChip
                label="결석"
                value="NOSHOW"
                selectedValue={formData.status}
                onClick={(val) => handleValueChange("status", val)}
                className="cursor-pointer"
              />
            </div>
            <ErrorMessage message={errors.status} />
          </div>

          <div className="space-y-1.5">
            <InputLabel label="메모" hasError={false} />
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm placeholder:text-slate-400"
              placeholder="추가사항 / 특이사항"
            />
          </div>

          {/* Action Buttons with Delete Option */}
          {/* 삭제 옵션이 포함된 액션 버튼 */}
          <div className="flex items-center gap-3 pt-2">

            {/* Show delete button only in edit mode */}
            {/* 수정 모드일 때만 삭제 버튼 표시 */}
            {isEditMode && (
              <Button
                type="button"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 h-11 w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer transition-all"
                
                // Call handleRequestDelete to show overlay
                // 오버레이 표시를 위해 handleRequestDelete 호출
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
              disabled={isLoading || isDeleting}
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "변경 중..." : "저장 중..."}
                </>
              ) : isEditMode ? (
                "변경"
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
