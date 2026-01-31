import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  UploadCloud,
  Check,
  FileSignature,
  MessageCircle,
  ChevronDown,
  FileText,
} from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

// Grading scales configuration by level and exam mode
// 레벨 및 응시 유형별 등급 산정 기준 설정
const MOCK_GRADING_SCALES = {
  A2: {
    FULL: [
      { min: 54, grade: "sehr gut" },
      { min: 48, grade: "gut" },
      { min: 42, grade: "befriedigend" },
      { min: 36, grade: "ausreichend" },
      { min: 0, grade: "teilgenommen" },
    ],
    WRITTEN: [
      { min: 40.5, grade: "sehr gut" },
      { min: 36, grade: "gut" },
      { min: 31.5, grade: "befriedigend" },
      { min: 27, grade: "ausreichend" },
      { min: 0, grade: "teilgenommen" },
    ],
    ORAL: [
      { min: 13.5, grade: "sehr gut" },
      { min: 12, grade: "gut" },
      { min: 10.5, grade: "befriedigend" },
      { min: 9, grade: "ausreichend" },
      { min: 0, grade: "teilgenommen" },
    ],
  },
  B1: {
    FULL: [
      { min: 270, grade: "sehr gut" },
      { min: 240, grade: "gut" },
      { min: 210, grade: "befriedigend" },
      { min: 180, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    WRITTEN: [
      { min: 202.5, grade: "sehr gut" },
      { min: 180, grade: "gut" },
      { min: 157.5, grade: "befriedigend" },
      { min: 135, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    ORAL: [
      { min: 67.5, grade: "sehr gut" },
      { min: 60, grade: "gut" },
      { min: 52.5, grade: "befriedigend" },
      { min: 45, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
  },
  B2: {
    FULL: [
      { min: 270, grade: "sehr gut" },
      { min: 240, grade: "gut" },
      { min: 210, grade: "befriedigend" },
      { min: 180, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    WRITTEN: [
      { min: 202.5, grade: "sehr gut" },
      { min: 180, grade: "gut" },
      { min: 157.5, grade: "befriedigend" },
      { min: 135, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    ORAL: [
      { min: 67.5, grade: "sehr gut" },
      { min: 60, grade: "gut" },
      { min: 52.5, grade: "befriedigend" },
      { min: 45, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
  },
  C1: {
    FULL: [
      { min: 193, grade: "sehr gut" },
      { min: 172, grade: "gut" },
      { min: 151, grade: "befriedigend" },
      { min: 128, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    WRITTEN: [
      { min: 149, grade: "sehr gut" },
      { min: 132, grade: "gut" },
      { min: 116, grade: "befriedigend" },
      { min: 99, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
    ORAL: [
      { min: 43, grade: "sehr gut" },
      { min: 38, grade: "gut" },
      { min: 33, grade: "befriedigend" },
      { min: 29, grade: "ausreichend" },
      { min: 0, grade: "nicht bestanden" },
    ],
  },
};

// Calculate grade based on score, exam level, and mode
// 점수, 시험 레벨, 응시 유형에 따른 등급 계산 함수
const calculateMockGrade = (examName, score, examMode) => {
  if (!examName || !examMode) return "";

  const upperName = examName.toUpperCase();
  let levelData = null;

  if (upperName.includes("A2")) levelData = MOCK_GRADING_SCALES["A2"];
  else if (upperName.includes("B1")) levelData = MOCK_GRADING_SCALES["B1"];
  else if (upperName.includes("B2")) levelData = MOCK_GRADING_SCALES["B2"];
  else if (upperName.includes("C1")) levelData = MOCK_GRADING_SCALES["C1"];

  if (!levelData) return "";

  // Select scale based on mode (FULL, WRITTEN, ORAL)
  // 응시 유형에 따른 기준 선택
  const scale = levelData[examMode];
  if (!scale) return "";

  const numScore = parseFloat(score);
  if (isNaN(numScore)) return "";

  const result = scale.find((range) => numScore >= range.min);
  return result ? result.grade : "";
};

// Format date for HTML input (YYYY-MM-DD)
// HTML 입력용 날짜 포맷 변환 함수 (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
};

export default function AddMockExamModal({
  isOpen,
  onClose,
  onSuccess,
  examData = null,
}) {
  // UI State Management (Loading, Delete Confirmation)
  // UI 상태 관리 (로딩, 삭제 확인)
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Data States (Students, Exam Standards)
  // 데이터 상태 (학생 목록, 시험 기준)
  const [students, setStudents] = useState([]);
  const [examStandards, setExamStandards] = useState([]);
  const [selectedStandardData, setSelectedStandardData] = useState(null);

  // Detailed Input States (Checks, Scores)
  // 상세 입력 상태 (체크박스, 점수)
  const [detailInputs, setDetailInputs] = useState({});
  const [scoreInputs, setScoreInputs] = useState({});

  // File Upload State (Multiple)
  // 파일 업로드 상태 (다중 파일)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  // File Deletion State
  // 파일 삭제 상태
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isFileDeleting, setIsFileDeleting] = useState(false);

  const isEditMode = !!examData;

  // Initial Form State
  // 초기 폼 상태 정의
  const initialFormState = {
    student: "",
    exam_standard: "",
    exam_date: "",
    exam_mode: "",
    source: "",
    total_score: 0,
    grade: "",
    memo: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Error States
  // 에러 상태 관리
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // --- 1. Load Initial Data ---
  // 모달 열림 시 초기 데이터(학생, 시험 기준) 로드
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setSubmitError(null);

        const [resStudents, resStandards] = await Promise.all([
          api.get("/api/students/?status=ACTIVE").catch((err) => {
            console.error("Student fetch error:", err);
            return null;
          }),
          api.get("/api/exam-standards/").catch((err) => {
            console.error("Standard fetch error:", err);
            return null;
          }),
        ]);

        if (resStudents) setStudents(resStudents.data);
        else setSubmitError("학생 목록을 불러오는데 실패했습니다.");

        if (resStandards) setExamStandards(resStandards.data);
        else
          setSubmitError((prev) =>
            prev
              ? prev + " / 시험 기준 로딩 실패"
              : "시험 기준을 불러오는데 실패했습니다.",
          );
      };
      loadData();
    }
  }, [isOpen]);

  // --- 2. Populate Form for Edit Mode ---
  // 수정 모드 시 폼 데이터 채우기
  useEffect(() => {
    if (isOpen) {
      if (examData) {
        setFormData({
          student: examData.student,
          exam_standard: examData.exam_standard,
          exam_date: formatDateForInput(examData.exam_date),
          exam_mode: examData.exam_mode,
          source: examData.source || "",
          total_score: examData.total_score,
          grade: examData.grade || "",
          memo: examData.memo || "",
        });

        // Restore Detail Results (Checkboxes)
        // 상세 결과 복원 (체크박스)
        if (examData.detail_results) {
          const details = {};
          examData.detail_results.forEach((d) => {
            details[`${d.exam_section}-${d.question_number}`] = d.is_correct;
          });
          setDetailInputs(details);
        }

        // Restore Score Inputs
        // 점수 입력 복원
        if (examData.score_inputs) {
          const scores = {};
          examData.score_inputs.forEach((s) => {
            scores[s.exam_section] = parseFloat(s.score);
          });
          setScoreInputs(scores);
        }

        // Restore Existing Attachments
        // 기존 첨부파일 복원
        if (examData.attachments) {
          setExistingFiles(examData.attachments);
        }

      } else {
        // Reset for Create Mode
        // 생성 모드 초기화
        setFormData(initialFormState);
        setDetailInputs({});
        setScoreInputs({});
        setErrors({});
        setExistingFiles([]);
        setSelectedFiles([]);
      }
    }
  }, [isOpen, examData]);

  // --- 3. Update Selected Standard Data ---
  // 선택된 시험 기준 데이터 업데이트
  useEffect(() => {
    if (formData.exam_standard) {
      const standard = examStandards.find(
        (s) => s.id === parseInt(formData.exam_standard),
      );
      setSelectedStandardData(standard || null);
    } else {
      setSelectedStandardData(null);
    }
  }, [formData.exam_standard, examStandards, isOpen, isEditMode]);

  // --- 4. Auto-Calculate Score and Grade ---
  // 총점 및 등급 자동 계산 로직
  useEffect(() => {
    if (!selectedStandardData || !selectedStandardData.modules) return;

    let calculatedScore = 0;

    if (!formData.exam_mode) return;

    // Filter Active Modules based on Mode
    // 응시 유형에 따라 활성 모듈 필터링
    const activeModules = selectedStandardData.modules.filter((mod) => {
      if (formData.exam_mode === "FULL") return true;
      return mod.module_type === formData.exam_mode;
    });

    // Calculate score from Checkboxes
    // 체크박스 입력으로부터 점수 계산
    Object.entries(detailInputs).forEach(([key, isCorrect]) => {
      if (isCorrect) {
        const [sectionId] = key.split("-");
        let points = 0;
        activeModules.forEach((mod) => {
          const section = mod.sections?.find(
            (s) => s.id === parseInt(sectionId),
          );
          if (section) points = parseFloat(section.points_per_question);
        });
        calculatedScore += points;
      }
    });

    // Calculate score from Numeric Inputs
    // 숫자 입력으로부터 점수 계산
    Object.entries(scoreInputs).forEach(([sectionId, score]) => {
      let isValidSection = false;
      activeModules.forEach((mod) => {
        if (mod.sections?.some((s) => s.id === parseInt(sectionId))) {
          isValidSection = true;
        }
      });
      if (isValidSection) {
        calculatedScore += parseFloat(score || 0);
      }
    });

    const finalScore = parseFloat(calculatedScore.toFixed(1));

    // Determine Grade
    // 등급 결정
    let calculatedGrade = "";
    if (
      selectedStandardData &&
      selectedStandardData.name &&
      formData.exam_mode
    ) {

      // Pass exam_mode to grade calculator
      // 등급 계산기에 응시 유형(exam_mode) 전달
      calculatedGrade = calculateMockGrade(
        selectedStandardData.name,
        finalScore,
        formData.exam_mode,
      );
    }

    setFormData((prev) => ({
      ...prev,
      total_score: finalScore,
      grade: calculatedGrade || prev.grade,
    }));
  }, [detailInputs, scoreInputs, selectedStandardData, formData.exam_mode]);

  if (!isOpen) return null;

  // Close Modal Handler
  // 모달 닫기 및 상태 초기화 핸들러
  const handleClose = () => {
    setFormData(initialFormState);
    setDetailInputs({});
    setScoreInputs({});
    setErrors({});
    setSubmitError(null);
    setSelectedFiles([]);
    setExistingFiles([]);
    setShowDeleteConfirm(false);
    setFileToDelete(null);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Handle File Input Change (Multiple)
  // 파일 선택 처리 (다중 파일)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      // Filter out duplicates based on name and size
      // 기존 파일 목록에 없는 파일만 필터링 (이름과 크기로 비교)
      const uniqueFiles = newFiles.filter(
        (newFile) =>
          !selectedFiles.some(
            (existingFile) =>
              existingFile.name === newFile.name &&
              existingFile.size === newFile.size,
          ),
      );

      if (uniqueFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...uniqueFiles]);
      } else {

        // Alert user about duplicates
        // 중복 파일 알림 (여기서는 '아무 일도 안 일어남'으로 처리)
        console.log("Duplicate files ignored.");
      }
    }

    // Reset input value to allow re-selecting the same file after deletion
    // 동일한 파일을 삭제 후 다시 선택할 수 있도록 input 값 초기화
    e.target.value = "";
  };

  // Remove File from Selected List
  // 선택된 파일 목록에서 파일 제거
  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  // Prepare to Delete Existing File
  // 기존 파일 삭제 준비
  const handleDeleteExistingFileClick = (fileId) => {
    setFileToDelete(fileId);
  };


  // Delete Existing File from Server
  // 서버에서 기존 파일 삭제
  const executeFileDelete = async () => {
    if (!fileToDelete) return;
    setIsFileDeleting(true);
    try {
      await api.delete(`/api/attachments/${fileToDelete}/`);
      setExistingFiles((prev) => prev.filter((f) => f.id !== fileToDelete));
      setFileToDelete(null); // 모달 닫기
    } catch (err) {
      console.error("Delete file failed:", err);
      // 에러 메시지는 상단 submitError에 표시하거나, 여기서는 간단히 로그만
      setSubmitError("파일 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsFileDeleting(false);
    }
  };

  // Toggle Checkbox Detail Input
  // 체크박스 상세 입력 토글
  const toggleDetailInput = (sectionId, questionNum) => {
    const key = `${sectionId}-${questionNum}`;
    setDetailInputs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle Numeric Score Input
  // 숫자 점수 입력 처리
  const handleScoreInputChange = (sectionId, value, maxScore) => {
    if (parseFloat(value) > maxScore) return;
    setScoreInputs((prev) => ({
      ...prev,
      [sectionId]: value,
    }));
  };

  const handleModeChange = (val) => {
    setFormData((prev) => ({ ...prev, exam_mode: val }));

    if (errors.exam_mode) setErrors((prev) => ({ ...prev, exam_mode: null }));
  };

  // Handle Delete Record
  // 기록 삭제 처리
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/exam-records/${examData.id}/`);
      onSuccess();
      handleClose();
    } catch (e) {
      console.error("Delete error:", e);
      setSubmitError("삭제 실패");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Form Submit (Create/Update)
  // 폼 제출 처리 (생성/수정)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    // Validation
    // 유효성 검사
    const newErrors = {};
    if (!formData.student) newErrors.student = "학생을 선택해주세요.";
    if (!formData.exam_standard)
      newErrors.exam_standard = "시험 종류를 선택해주세요.";
    if (!formData.exam_date) newErrors.exam_date = "응시일을 입력해주세요.";
    if (!formData.exam_mode) newErrors.exam_mode = "응시 유형을 선택해주세요.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        student: parseInt(formData.student),
        exam_standard: parseInt(formData.exam_standard),
        total_score: parseFloat(formData.total_score),
      };

      let recordId;
      // API Call: Create or Update Record
      // API 호출: 기록 생성 또는 수정
      if (isEditMode) {
        await api.patch(`/api/exam-records/${examData.id}/`, payload);
        recordId = examData.id;
      } else {
        const res = await api.post("/api/exam-records/", payload);
        recordId = res.data.id;
      }

      const detailPromises = [];

      if (!formData.exam_mode) return;

      const activeModules = selectedStandardData.modules.filter((mod) => {
        if (formData.exam_mode === "FULL") return true;
        return mod.module_type === formData.exam_mode;
      });

      const isSectionActive = (sectionId) => {
        return activeModules.some((mod) =>
          mod.sections?.some((s) => s.id === parseInt(sectionId)),
        );
      };

      // Save Detail Results (Checkboxes)
      // 상세 결과 저장 (체크박스)
      Object.entries(detailInputs).forEach(([key, isCorrect]) => {
        const [sectionId, questionNum] = key.split("-");

        if (isSectionActive(sectionId)) {
          detailPromises.push(
            api.post("/api/exam-detail-results/", {
              exam_record: recordId,
              exam_section: parseInt(sectionId),
              question_number: parseInt(questionNum),
              is_correct: isCorrect,
            }),
          );
        }
      });

      // Save Score Inputs (Numeric)
      // 점수 입력 저장 (숫자)
      Object.entries(scoreInputs).forEach(([sectionId, score]) => {
        if (score && isSectionActive(sectionId)) {
          detailPromises.push(
            api.post("/api/exam-score-inputs/", {
              exam_record: recordId,
              exam_section: parseInt(sectionId),
              score: parseFloat(score),
            }),
          );
        }
      });

      // Upload Multiple Attachments
      // 다중 첨부파일 업로드
      if (selectedFiles.length > 0 && recordId) {

        // Create an array of upload promises
        // 업로드 프로미스 배열 생성
        const uploadPromises = selectedFiles.map((file) => {
          const fileData = new FormData();
          fileData.append("exam_record", recordId);
          fileData.append("file", file);
          fileData.append("original_name", file.name);
          return api.post("/api/attachments/", fileData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        });

        // Wait for all uploads to complete
        // 모든 업로드가 완료될 때까지 대기
        await Promise.all(uploadPromises);
      }

      // Wait for all detail/score/file saves
      // 모든 상세/점수/파일 저장이 완료될 때까지 대기
      await Promise.all(detailPromises);

      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Mock Exam Submit Failed:", err);
      setSubmitError(
        err.response?.data?.detail ||
          `모의고사 결과 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sub-components for cleaner render
  // 렌더링을 위한 서브 컴포넌트
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1">
        {message}
      </p>
    );
  };

  const InputLabel = ({ label, required, hasError }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 mb-1.5 block ${
        hasError
          ? "text-destructive"
          : "text-slate-500 dark:text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-destructive">*</span>}
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
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-out whitespace-nowrap ${
          isSelected
            ? "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]"
            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80 hover:text-slate-700 dark:hover:text-foreground border border-transparent"
        } ${className}`}
      >
        {label}
      </button>
    );
  };

  // Helper to group sections by category for display
  // 화면 표시를 위해 섹션을 카테고리별로 그룹화하는 헬퍼
  const groupSectionsByCategory = (sections) => {
    const groups = {};
    sections.forEach((sec) => {
      const category = sec.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(sec);
    });
    return groups;
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden m-4 relative flex flex-col max-h-[90vh]">
        {/* Delete Confirmation Overlay */}
        {/* 삭제 확인 오버레이 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 bg-white dark:bg-card backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
              삭제 확인
            </h3>
            <p className="text-slate-500 dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              정말로 삭제하시겠습니까? <br />
              <span className="text-destructive mt-1 block font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold cursor-pointer shadow-md"
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

        {/* File Delete Confirmation Overlay */}
        {/* 파일 삭제 확인 오버레이 */}
        {fileToDelete && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-card backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-foreground mb-2">
              파일 삭제
            </h3>
            <p className="text-slate-500 dark:text-muted-foreground text-center mb-8 max-w-xs text-sm">
              정말로 삭제하시겠습니까? <br />
              <span className="text-destructive mt-1 block font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={executeFileDelete}
                disabled={isFileDeleting}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-11 text-sm font-semibold cursor-pointer shadow-md"
              >
                {isFileDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "삭제"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Modal Header */}
        {/* 모달 헤더 */}
        <div className="flex justify-between px-6 py-4 border-b border-slate-100 dark:border-border shrink-0 bg-white dark:bg-card z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              {isEditMode ? "모의고사 결과 수정" : "모의고사 결과 입력"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              {isEditMode
                ? "수정이 필요한 모의고사 결과를 변경해주세요."
                : "등록할 새로운 모의고사 결과를 입력하세요."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs Section */}
        {/* 폼 입력 섹션 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-card">
          <form
            id="mock-exam-form"
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
          >
            {submitError && (
              <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium animate-in slide-in-from-top-2 text-center">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <InputLabel
                    label="학생"
                    hasError={!!errors.student}
                    required
                  />
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
                        학생을 선택하세요
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
                  <ErrorMessage message={errors.student} />
                </div>

                <div>
                  <InputLabel
                    label="응시일"
                    hasError={!!errors.exam_date}
                    required
                  />
                  <input
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <InputLabel
                    label="시험 종류"
                    hasError={!!errors.exam_standard}
                    required
                  />
                  <div className="relative">
                    <select
                      name="exam_standard"
                      value={formData.exam_standard}
                      onChange={handleChange}
                      className={`w-full h-10 px-2 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm appearance-none cursor-pointer ${
                        formData.exam_standard === ""
                          ? "text-slate-400 dark:text-muted-foreground/60"
                          : "text-slate-800 dark:text-foreground"
                      }`}
                    >
                      <option value="" disabled hidden>
                        시험 종류를 선택하세요
                      </option>
                      {examStandards.map((standard) => (
                        <option
                          key={standard.id}
                          value={standard.id}
                          className="text-slate-800 dark:text-foreground dark:bg-card"
                        >
                          {standard.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-slate-400 dark:text-muted-foreground/60" />
                    </div>
                  </div>
                  <ErrorMessage message={errors.exam_standard} />
                </div>

                <div>
                  <InputLabel
                    label="응시 유형"
                    hasError={!!errors.exam_mode}
                    required
                  />
                  <div className="flex gap-2">
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
              </div>
            </div>

            <div>
              <InputLabel label="시험 출처" />
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="모의고사 출처"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-sm placeholder:text-slate-400 dark:placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Dynamic Section Rendering based on Module */}
            {/* 모듈에 따른 동적 섹션 렌더링 */}
            {formData.exam_mode &&
            selectedStandardData &&
            selectedStandardData.modules &&
            selectedStandardData.modules.length > 0 ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="h-px bg-slate-100 dark:bg-border w-full" />
                <h3 className="text-sm font-bold text-slate-500 dark:text-muted-foreground flex items-center gap-2">
                  상세 결과 입력
                </h3>

                <div className="grid grid-cols-1 gap-6">
                  {selectedStandardData.modules
                    .filter((mod) => {
                      if (formData.exam_mode === "FULL") return true;
                      return mod.module_type === formData.exam_mode;
                    })
                    .sort((a, b) => b.module_type.localeCompare(a.module_type))
                    .map((mod) => {
                      const sortedSections = [...(mod.sections || [])].sort(
                        (a, b) => a.id - b.id,
                      );
                      const groupedSections =
                        groupSectionsByCategory(sortedSections);

                      return (
                        <div
                          key={mod.id}
                          className="bg-slate-50/50 dark:bg-muted/40 rounded-xl border border-slate-200 dark:border-border p-5 transition-all"
                        >
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/60 dark:border-border">
                            <h4 className="font-bold text-primary dark:text-foreground flex items-center gap-2">
                              {mod.module_type === "WRITTEN" ? (
                                <FileSignature className="w-5 h-5" />
                              ) : (
                                <MessageCircle className="w-5 h-5" />
                              )}
                              {mod.module_type === "WRITTEN"
                                ? "Schriftlich"
                                : "Mündlich"}
                            </h4>
                            <span className="text-xs font-medium text-muted-foreground bg-white dark:bg-card px-2 py-1 rounded border border-slate-300 dark:border-border">
                              Max. {mod.max_score}점
                            </span>
                          </div>

                          <div className="space-y-6">
                            {Object.entries(groupedSections).map(
                              ([category, sections]) => (
                                <div key={category} className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wide px-1">
                                    {category}
                                  </h5>

                                  <div className="grid grid-cols-1 gap-2">
                                    {sections.map((sec) => (
                                      <div
                                        key={sec.id}
                                        className="bg-white dark:bg-card rounded-lg border border-slate-100 dark:border-border p-4 shadow-sm flex flex-col gap-3"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-semibold text-slate-500 dark:text-foreground">
                                            {sec.name}
                                          </span>
                                          <span className="text-xs text-slate-400 dark:text-muted-foreground">
                                            {sec.is_question_based
                                              ? `${parseFloat(sec.points_per_question)}점 x ${
                                                  sec.question_end_num -
                                                  sec.question_start_num +
                                                  1
                                                }문항`
                                              : `Max. ${parseFloat(sec.section_max_score)}점`}
                                          </span>
                                        </div>

                                        {sec.is_question_based ? (
                                          <div className="flex flex-wrap gap-2">
                                            {Array.from(
                                              {
                                                length:
                                                  sec.question_end_num -
                                                  sec.question_start_num +
                                                  1,
                                              },
                                              (_, i) =>
                                                sec.question_start_num + i,
                                            ).map((qNum) => {
                                              const isCorrect =
                                                !!detailInputs[
                                                  `${sec.id}-${qNum}`
                                                ];
                                              return (
                                                <button
                                                  key={qNum}
                                                  type="button"
                                                  onClick={() =>
                                                    toggleDetailInput(
                                                      sec.id,
                                                      qNum,
                                                    )
                                                  }
                                                  className={`
                                                  w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all border cursor-pointer
                                                  ${
                                                    isCorrect
                                                      ? "bg-accent/80 text-white border-accent shadow-sm transform scale-105"
                                                      : "bg-slate-100 dark:bg-muted text-slate-300 dark:text-muted-foreground border-slate-200 dark:border-border hover:border-slate-400 dark:hover:border-muted-foreground"
                                                  }
                                                `}
                                                >
                                                  {isCorrect ? (
                                                    <Check className="w-4 h-4" />
                                                  ) : (
                                                    qNum
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="number"
                                              value={scoreInputs[sec.id] || ""}
                                              onChange={(e) =>
                                                handleScoreInputChange(
                                                  sec.id,
                                                  e.target.value,
                                                  sec.section_max_score,
                                                )
                                              }
                                              className="w-20 h-9 px-3 rounded-md border border-slate-200 dark:border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-center font-medium text-slate-700 dark:text-foreground bg-slate-50 dark:bg-muted focus:bg-white dark:focus:bg-card placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              placeholder="0"
                                              max={sec.section_max_score}
                                            />
                                            <span className="text-sm text-slate-500 dark:text-muted-foreground">
                                              / {sec.section_max_score} 점
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                            {Object.keys(groupedSections).length === 0 && (
                              <div className="text-xs text-slate-400 dark:text-muted-foreground text-center py-2 font-medium">
                                등록된 섹션이 없습니다.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-muted/30 rounded-xl border border-dashed border-slate-200 dark:border-border p-12 text-center text-slate-400 dark:text-muted-foreground text-sm flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-muted-foreground/40" />
                <p className="font-medium">
                  상세 결과 입력 양식
                  <br />( <strong>시험 종류</strong>와 {""}
                  <strong>응시 유형</strong>을 선택해주세요. )
                </p>
                {formData.exam_standard && !selectedStandardData && (
                  <p className="text-xs text-destructive font-medium">
                    선택한 시험의 상세 데이터를 불러오는 중이거나 데이터가
                    없습니다.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <InputLabel label="점수" />
                    <div className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-100 dark:bg-muted/50 flex items-center overflow-hidden cursor-not-allowed">
                      <span
                        className={`text-sm font-bold truncate w-full text-end ${formData.total_score > 0 ? "text-primary dark:text-primary" : "text-slate-400 dark:text-muted-foreground/40"}`}
                      >
                        {formData.total_score}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-muted-foreground/40 font-medium w-full text-end pl-1">
                        점
                      </span>
                    </div>
                  </div>
                  <div className="cursor-not-allowed">
                    <InputLabel label="등급" />
                    <input
                      name="grade"
                      value={formData.grade}
                      readOnly
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-100 dark:bg-muted/50 font-bold focus:outline-none text-sm pointer-events-none text-center text-primary dark:text-primary placeholder:text-slate-400"
                      placeholder="자동 입력"
                    />
                  </div>
                </div>

                <div>
                  <InputLabel label="시험지 파일" />
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <input
                        type="file"
                        id="mock-file-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        multiple
                      />
                      <label
                        htmlFor="mock-file-upload"
                        className="flex items-center justify-center w-full h-12 px-4 transition bg-white dark:bg-card border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 focus:outline-none border-slate-300 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/20 group"
                      >
                        <span className="flex items-center space-x-2">
                          <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-slate-400 dark:text-muted-foreground group-hover:text-primary transition-colors">
                            파일 업로드
                          </span>
                        </span>
                      </label>
                    </div>

                    {existingFiles.length > 0 && (
                      <div className="space-y-2">
                        <InputLabel label="기존 파일" />
                        {existingFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border rounded-md group"
                          >
                            <a
                              href={file.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 overflow-hidden hover:underline cursor-pointer"
                            >
                              <div className="bg-white dark:bg-card p-1.5 rounded border border-slate-300 dark:border-border">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm text-slate-700 dark:text-foreground truncate font-medium max-w-45 md:max-w-50">
                                {file.original_name ||
                                  decodeURIComponent(
                                    file.file.split("/").pop().split("?")[0],
                                  )}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteExistingFileClick(file.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
                              title="파일 삭제"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 새로 추가할 파일 목록 */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <InputLabel label="추가 파일" />
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`new-${index}`}
                            className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border rounded-md group"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <div className="bg-white dark:bg-card p-1.5 rounded border border-slate-200 dark:border-border">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm text-slate-700 dark:text-foreground truncate font-medium max-w-45 md:max-w-50">
                                {file.name}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-muted-foreground whitespace-nowrap">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
                              title="파일 삭제"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <InputLabel label="메모" />
                <textarea
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  rows={5}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/30 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm text-slate-800 dark:text-foreground placeholder:text-slate-400 h-33"
                  placeholder="추가사항 / 특이사항"
                  autoComplete="off"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Action Buttons Footer */}
        {/* 액션 버튼 푸터 */}
        <div className="flex gap-3 p-4 shrink-0 bg-white dark:bg-card">
          {isEditMode && (
            <Button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 h-11 w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-11 text-sm font-semibold cursor-pointer transition-all"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={() =>
              document.getElementById("mock-exam-form").requestSubmit()
            }
            disabled={isLoading}
            className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? "수정 중..." : "저장 중..."}
              </>
            ) : isEditMode ? (
              "수정"
            ) : (
              "등록"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
