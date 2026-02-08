import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  User,
  Landmark,
  Receipt,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  FileText,
  Bold,
  Italic,
  Underline,
  List,
  Table as TableIcon,
  ChevronDown,
} from "lucide-react";
import api from "../../api";
import Button from "../ui/Button";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline as UnderlineExtension } from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

// Tiptap Editor Component
// 팁탭 에디터 컴포넌트
const TiptapEditor = ({ value, onChange }) => {
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 });
  const gridContainerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class:
            "border-collapse table-auto w-full my-4 border border-slate-300 dark:border-slate-600",
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class:
            "border border-slate-300 dark:border-slate-600 p-2 min-w-[50px]",
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3 text-slate-800 dark:text-foreground dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
  });

  // Sync editor content
  // 에디터 내용 동기화
  useEffect(() => {
    if (
      editor &&
      value !== undefined &&
      value !== editor.getHTML() &&
      !editor.isFocused
    ) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  // Handle click outside for table grid
  // 테이블 그리드 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        gridContainerRef.current &&
        !gridContainerRef.current.contains(event.target)
      ) {
        setShowTableGrid(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const insertTable = (rows, cols) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: rows, cols: cols, withHeaderRow: false })
      .run();
    setShowTableGrid(false);
  };

  return (
    <div className="border border-slate-200 dark:border-border rounded-lg overflow-hidden bg-slate-50/50 dark:bg-muted focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary transition-all relative">
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-border bg-slate-100/50 dark:bg-muted/80">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("bold")
              ? "bg-slate-300 dark:bg-slate-600 text-slate-900"
              : "hover:bg-slate-200 dark:hover:bg-muted-foreground/20 text-slate-600 dark:text-foreground"
          }`}
          title="Fett (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("italic")
              ? "bg-slate-300 dark:bg-slate-600 text-slate-900"
              : "hover:bg-slate-200 dark:hover:bg-muted-foreground/20 text-slate-600 dark:text-foreground"
          }`}
          title="Kursiv (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("underline")
              ? "bg-slate-300 dark:bg-slate-600 text-slate-900"
              : "hover:bg-slate-200 dark:hover:bg-muted-foreground/20 text-slate-600 dark:text-foreground"
          }`}
          title="Unterstrichen (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-border mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("bulletList")
              ? "bg-slate-300 dark:bg-slate-600 text-slate-900"
              : "hover:bg-slate-200 dark:hover:bg-muted-foreground/20 text-slate-600 dark:text-foreground"
          }`}
          title="Liste (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-border mx-1"></div>

        <div className="relative" ref={gridContainerRef}>
          <button
            type="button"
            onClick={() => setShowTableGrid(!showTableGrid)}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              showTableGrid
                ? "bg-slate-200 dark:bg-muted-foreground/20"
                : "hover:bg-slate-200 dark:hover:bg-muted-foreground/20 text-slate-600 dark:text-foreground"
            }`}
            title="Tabelle einfügen"
          >
            <TableIcon className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>

          {showTableGrid && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-popover border border-slate-200 dark:border-border rounded-lg shadow-xl p-3 w-47.5 animate-in fade-in zoom-in-95">
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-foreground text-center">
                {hoveredCell.row > 0
                  ? `${hoveredCell.row} x ${hoveredCell.col} 표 삽입`
                  : "표 크기 선택"}
              </div>
              <div
                className="grid grid-cols-6 gap-1"
                onMouseLeave={() => setHoveredCell({ row: 0, col: 0 })}
              >
                {Array.from({ length: 36 }).map((_, i) => {
                  const row = Math.floor(i / 6) + 1;
                  const col = (i % 6) + 1;
                  const isActive =
                    row <= hoveredCell.row && col <= hoveredCell.col;

                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredCell({ row, col })}
                      onClick={() => insertTable(row, col)}
                      className={`
                        w-5 h-5 border rounded-sm cursor-pointer transition-colors
                        ${
                          isActive
                            ? "bg-primary border-primary"
                            : "bg-slate-50 dark:bg-muted border-slate-200 dark:border-border hover:border-primary/50"
                        }
                      `}
                    />
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-slate-400 text-center">
                최대 6 x 6
              </div>
            </div>
          )}
        </div>

        {editor.can().deleteTable() && (
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="ml-auto p-1.5 text-destructive/70 hover:text-destructive hover:underline text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />표 삭제
          </button>
        )}
      </div>

      <EditorContent editor={editor} className="bg-white dark:bg-card" />
    </div>
  );
};

// Tabs Configuration
// 탭 설정 상수
const TABS = [
  { id: "general", label: "사업자 정보", icon: User },
  { id: "tax", label: "세무 및 설정", icon: Receipt },
  { id: "bank", label: "은행 정보", icon: Landmark },
  { id: "logo", label: "로고", icon: ImageIcon },
  { id: "template", label: "영수증 본문 설정", icon: FileText },
];

export default function InvoiceSettingsModal({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const initialFormState = {
    company_name: "",
    manager_name: "",
    street: "",
    postcode: "",
    city: "",
    country: "Deutschland",
    phone: "",
    email: "",
    website: "",
    tax_number: "",
    vat_id: "",
    is_small_business: false,
    price_input_type: "BRUTTO",
    bank_name: "",
    account_holder: "",
    iban: "",
    bic: "",
    logo: null,
    default_intro_text: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch business profile on open
  // 모달 열릴 때 사업자 프로필 조회
  useEffect(() => {
    if (isOpen) {
      setActiveTab("general");
      const fetchProfile = async () => {
        setIsFetching(true);
        try {
          const response = await api.get("/api/business-profile/");
          if (response.data) {
            setFormData((prev) => ({ ...prev, ...response.data }));
            if (response.data.logo_url) {
              setLogoPreview(response.data.logo_url);
            }
          }
        } catch (err) {
          if (err.response?.status !== 404) {
            console.error("Failed to load business profile", err);
            setSubmitError("프로필 정보를 불러오는데 실패했습니다.");
          }
        } finally {
          setIsFetching(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrors({});
    setSubmitError(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, logo: file }));
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: "DELETE" }));
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const newErrors = {};
    if (!formData.manager_name)
      newErrors.manager_name = "대표자 성명을 입력해주세요.";
    if (!formData.street) newErrors.street = "주소를 입력해주세요.";
    if (!formData.postcode) newErrors.postcode = "우편번호를 입력해주세요.";
    if (!formData.city) newErrors.city = "도시를 입력해주세요.";
    if (!formData.tax_number)
      newErrors.tax_number = "세금 번호를 입력해주세요.";
    if (!formData.bank_name) newErrors.bank_name = "은행명을 입력해주세요.";
    if (!formData.account_holder)
      newErrors.account_holder = "예금주명을 입력해주세요.";
    if (!formData.iban) newErrors.iban = "IBAN을 입력해주세요.";
    if (!formData.bic) newErrors.bic = "BIC/SWIFT를 입력해주세요.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError("필수 입력 항목을 확인해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      await api.post("/api/business-profile/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.detail || "설정 저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // UI Components helpers
  // UI 헬퍼 컴포넌트
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
        className={`relative flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap ${
          isSelected
            ? "bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary transform scale-[1.02]"
            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80 hover:text-slate-700 dark:hover:text-foreground border border-transparent"
        } ${className}`}
      >
        {label}
      </button>
    );
  };

  const InputLabel = ({ label, required, hasError, subLabel }) => (
    <label
      className={`text-xs font-bold uppercase tracking-wider pl-1 block mb-1.5 ${
        hasError
          ? "text-destructive"
          : "text-slate-500 dark:text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-destructive">*</span>}
      {subLabel && (
        <span className="text-[10px] normal-case font-normal ml-2 opacity-70 text-slate-400">
          ({subLabel})
        </span>
      )}
    </label>
  );

  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-xs text-destructive mt-1 font-medium ml-1">
        {message}
      </p>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-card rounded-2xl shadow-2xl border border-white/20 dark:border-border overflow-hidden transform transition-all m-4 relative flex flex-col h-[65vh] max-h-250">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              사업자 정보 설정
            </h2>
            <p className="text-xs text-slate-400 dark:text-muted-foreground mt-0.5">
              영수증 발급에 필요한 필수 정보들을 입력하세요.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-5 px-4 border-b border-slate-100 dark:border-border bg-slate-50/30 dark:bg-muted/10 shrink-0 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1 px-0.5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer
                  ${
                    isActive
                      ? "border-primary text-primary"
                      : "text-slate-400 border-transparent hover:text-primary dark:text-muted-foreground "
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-card">
          {isFetching ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <form
              id="invoice-settings-form"
              onSubmit={handleSubmit}
              className="space-y-6"
              noValidate
            >
              {submitError && (
                <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium text-center animate-in slide-in-from-top-1">
                  {submitError}
                </div>
              )}

              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <InputLabel label="회사명" />
                      <input
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        placeholder="회사명 입력"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <InputLabel
                        label="대표자"
                        required
                        hasError={!!errors.manager_name}
                      />
                      <input
                        required
                        name="manager_name"
                        value={formData.manager_name}
                        onChange={handleChange}
                        placeholder="대표자 이름 입력"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.manager_name} />
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-6">
                      <InputLabel
                        label="주소"
                        required
                        hasError={!!errors.street}
                      />
                      <input
                        required
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        placeholder="주소 입력 / 예) Musterstraße 123"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.street} />
                    </div>
                    <div className="col-span-2">
                      <InputLabel
                        label="우편번호"
                        required
                        hasError={!!errors.postcode}
                      />
                      <input
                        required
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleChange}
                        placeholder="PLZ"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.postcode} />
                    </div>
                    <div className="col-span-2">
                      <InputLabel
                        label="도시"
                        required
                        hasError={!!errors.city}
                      />
                      <input
                        required
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="도시"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.city} />
                    </div>
                    <div className="col-span-2">
                      <InputLabel
                        label="국가"
                        required
                        hasError={!!errors.country}
                      />
                      <input
                        required
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="국가"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.country} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <InputLabel label="연락처" />
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="연락처"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                    </div>
                    <div>
                      <InputLabel label="이메일" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="이메일"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <InputLabel label="웹사이트" />
                      <input
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="웹사이트"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tax" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <InputLabel
                        label="세금 번호"
                        required
                        hasError={!!errors.tax_number}
                      />
                      <input
                        required
                        name="tax_number"
                        value={formData.tax_number}
                        onChange={handleChange}
                        placeholder="세금 번호"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                      <ErrorMessage message={errors.tax_number} />
                    </div>
                    <div>
                      <InputLabel label="부가세 ID" />
                      <input
                        name="vat_id"
                        value={formData.vat_id}
                        onChange={handleChange}
                        placeholder="부가세 ID"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                      />
                    </div>
                  </div>
                  <InputLabel label="부가가치세" />
                  <div className="bg-slate-50 dark:bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-border">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-foreground flex items-center gap-2">
                          소규모 사업자 규정 (Kleinunternehmer)
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                            § 19 UStG
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                          활성화 시, 영수증에 부가세(USt)가 0%로 책정됩니다.
                        </p>
                      </div>
                      <div
                        onClick={() =>
                          handleValueChange(
                            "is_small_business",
                            !formData.is_small_business,
                          )
                        }
                        className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${formData.is_small_business ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
                      >
                        <div
                          className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300 ${formData.is_small_business ? "left-[calc(100%-20px)]" : "left-1"}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <InputLabel label="가격 입력 방식 설정" required />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectionChip
                        label="Brutto (부가세 포함)"
                        value="BRUTTO"
                        selectedValue={formData.price_input_type}
                        onClick={(val) =>
                          handleValueChange("price_input_type", val)
                        }
                        className="cursor-pointer"
                      />
                      <SelectionChip
                        label="Netto (부가세 별도)"
                        value="NETTO"
                        selectedValue={formData.price_input_type}
                        onClick={(val) =>
                          handleValueChange("price_input_type", val)
                        }
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "bank" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <InputLabel
                      label="은행명"
                      hasError={!!errors.bank_name}
                      required
                    />
                    <input
                      required
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      placeholder="은행명"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    />
                    <ErrorMessage message={errors.bank_name} />
                  </div>
                  <div>
                    <InputLabel
                      label="예금주"
                      hasError={!!errors.account_holder}
                      required
                    />
                    <input
                      name="account_holder"
                      value={formData.account_holder}
                      onChange={handleChange}
                      placeholder="예금주"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    />
                    <ErrorMessage message={errors.account_holder} />
                  </div>
                  <div>
                    <InputLabel
                      label="IBAN"
                      required
                      hasError={!!errors.iban}
                    />
                    <input
                      required
                      name="iban"
                      value={formData.iban}
                      onChange={handleChange}
                      placeholder="IBAN"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    />
                    <ErrorMessage message={errors.iban} />
                  </div>
                  <div>
                    <InputLabel
                      label="BIC / SWIFT"
                      hasError={!!errors.bic}
                      required
                    />
                    <input
                      name="bic"
                      value={formData.bic}
                      onChange={handleChange}
                      placeholder="BIC"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted focus:bg-white dark:focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 text-sm"
                    />
                    <ErrorMessage message={errors.bic} />
                  </div>
                </div>
              )}

              {activeTab === "logo" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <InputLabel
                    label="회사 로고"
                    subLabel="영수증 상단에 표시됩니다"
                  />
                  <div className="flex flex-col items-center justify-center">
                    {logoPreview ? (
                      <div className="relative group w-full flex justify-center mb-4">
                        <div className="relative rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/20 p-6">
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="h-32 object-contain rounded-md"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-3 -right-3 bg-destructive text-white p-2 rounded-full shadow-md hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="relative w-full">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        id="logo-upload"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="flex items-center justify-center w-full h-16 px-4 transition bg-white dark:bg-card border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 focus:outline-none border-slate-300 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/20 group"
                      >
                        <span className="flex items-center space-x-2">
                          {logoPreview ? (
                            <>
                              <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                              <span className="text-sm font-medium text-slate-400 dark:text-muted-foreground group-hover:text-primary transition-colors">
                                로고 변경
                              </span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                              <span className="text-sm font-medium text-slate-400 dark:text-muted-foreground group-hover:text-primary transition-colors">
                                로고 업로드 (PNG, JPG)
                              </span>
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "template" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <InputLabel
                    label="영수증 기본 문구"
                    subLabel="영수증 작성 시 Kopftext 필드에 자동으로 입력되는 문구입니다."
                  />
                  <div className="rounded-xl border border-border bg-secondary/30 dark:bg-secondary/10 p-4 mb-4">
                    <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      작성 가이드
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-2 list-disc list-inside">
                      <li>
                        <strong className="text-foreground">Frau/Herr</strong>{" "}
                        뒤에는 청구인 이름이 자동으로 입력되어집니다.
                      </li>
                      <li>
                        <strong className="text-foreground">Name:</strong>{" "}
                        뒤에는 학생 이름이 자동으로 입력되어집니다.
                      </li>
                      <li>
                        표나 리스트를 활용하여 기본 문구를 추가로 수정할 수
                        있습니다.
                      </li>
                    </ul>
                  </div>

                  <TiptapEditor
                    value={formData.default_intro_text}
                    onChange={(val) =>
                      handleValueChange("default_intro_text", val)
                    }
                  />
                </div>
              )}
            </form>
          )}
        </div>

        <div className="px-6 py-4 flex gap-3">
          <Button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 h-11 text-sm font-semibold cursor-pointer transition-all"
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="submit"
            form="invoice-settings-form"
            className="flex-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all"
            disabled={isLoading || isFetching}
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
      </div>
    </div>,
    document.body,
  );
}
