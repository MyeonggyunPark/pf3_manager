import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  List,
  Table as TableIcon,
  ChevronDown,
  Trash2,
  Loader2,
  Plus,
  FileText,
  X,
} from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { cn } from "../../lib/utils";
import api from "../../api";
import AddStudentModal from "./AddStudentModal";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline as UnderlineExtension } from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

// Unit Mapping Constants
// 단위 매핑 상수 (UI 표시용 -> 백엔드 저장용)
const UNIT_MAPPING = {
  Stk: "PIECE",
  Std: "HOUR",
  "Tag(e)": "DAY",
  pauschal: "FLAT_RATE",
};

// Format currency to Euro
// 유로 통화 형식 포맷터
const formatEuro = (val) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    val || 0,
  );

// Calculate due date string based on start date and days offset
// 시작일과 일수를 기준으로 만기일 계산
const calculateDueDateStr = (startDate, days) => {
  if (!startDate || !days) return "";
  const date = new Date(startDate);
  date.setDate(date.getDate() + parseInt(days));
  return date.toISOString().split("T")[0];
};

// Calculate difference in days between two dates
// 두 날짜 사이의 일수 차이 계산
const calculateDiffDays = (startDate, targetDate) => {
  if (!startDate || !targetDate) return "";
  const start = new Date(startDate);
  const target = new Date(targetDate);
  const diffTime = target - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : "";
};

const initialRecipientAddress = {
  street: "",
  zip: "",
  city: "",
  country: "",
};

const initialItems = [
  {
    id: 1,
    name: "",
    quantity: "",
    unit: "Stk",
    price: "",
    tax: 19,
    discount: "",
    discountUnit: "%",
  },
];

// Common Style Constants
// 공통 스타일 상수
const CUSTOM_INPUT_STYLE =
  "bg-slate-50/50 dark:bg-muted border-slate-200 dark:border-border focus:bg-white dark:focus:bg-card focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-lg font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 transition-all";

const LABEL_CLASS =
  "text-xs font-bold tracking-wider pl-1 mb-1.5 block text-slate-500 dark:text-muted-foreground";

const READONLY_INPUT_STYLE =
  "bg-slate-100 dark:bg-muted/50 border-slate-200 dark:border-border text-slate-500 cursor-not-allowed focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none select-none";

const DATE_INPUT_STYLE = (value) =>
  cn(
    CUSTOM_INPUT_STYLE,
    "cursor-pointer pr-10",
    value === ""
      ? "text-slate-400 dark:text-muted-foreground/60 [&::-webkit-calendar-picker-indicator]:opacity-40"
      : "text-slate-800 dark:text-foreground [&::-webkit-calendar-picker-indicator]:opacity-100",
    "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
  );

const CANCEL_BUTTON_STYLE =
  "bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-600 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 h-9 px-3 text-sm font-semibold transition-all";
const SUBMIT_BUTTON_STYLE =
  "h-9 px-3 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer transition-all";

// Tiptap Editor Component
// 팁탭 에디터 컴포넌트 (텍스트 편집기)
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

  // Sync editor content when value prop changes externally
  // 외부에서 value prop이 변경될 때 에디터 내용 동기화
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

  // Handle click outside to close table grid
  // 테이블 그리드 외부 클릭 시 닫기 처리
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
      {/* Toolbar */}
      {/* 툴바 영역 */}
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
            className="ml-auto p-1.5 rounded hover:bg-destructive/10 text-destructive text-xs flex items-center gap-1 transition-colors"
            title="표 삭제"
          >
            <Trash2 className="w-3 h-3" />표 삭제
          </button>
        )}
      </div>

      <EditorContent editor={editor} className="bg-white dark:bg-card" />
    </div>
  );
};

export default function InvoiceCreateModal({ isOpen, onClose, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);

  // Invoice Data States
  // 영수증 데이터 상태 관리
  const [recipientId, setRecipientId] = useState("");
  const [recipientAddress, setRecipientAddress] = useState(
    initialRecipientAddress,
  );

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [isPeriodMode, setIsPeriodMode] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [refNumber, setRefNumber] = useState("");
  const [dueDays, setDueDays] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [subject, setSubject] = useState("");

  const [templateBase, setTemplateBase] = useState("");
  const [introText, setIntroText] = useState("");

  const [items, setItems] = useState([{ ...initialItems[0], id: 1 }]);
  const [priceMode, setPriceMode] = useState("BRUTTO");

  const [globalAdjustments, setGlobalAdjustments] = useState([]);

  const [taxConfig, setTaxConfig] = useState({
    is_small_business: false,
    vat_rate: 19,
  });

  const [footerText, setFooterText] = useState(
    "Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto.\nDer Rechnungsbetrag ist bis zum [%ZAHLUNGSZIEL%] fällig.\n\nMit freundlichen Grüßen\n[%KONTAKTPERSON%]",
  );

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form to initial state
  // 폼 초기화 함수
  const resetForm = useCallback(() => {
    setRecipientId("");
    setRecipientAddress(initialRecipientAddress);
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setIsPeriodMode(false);
    setDeliveryDate("");
    setPeriodStart("");
    setPeriodEnd("");
    setRefNumber("");
    setDueDays("");
    setDueDate("");
    setSubject("");
    setIntroText(templateBase);
    setItems([{ ...initialItems[0], id: Date.now() }]);
    setPriceMode("BRUTTO");
    setGlobalAdjustments([]);
    setIsPreviewLoading(false);
    setIsSubmitting(false);
  }, [templateBase]);

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  // Fetch initial data (students, next invoice number, business profile)
  // 초기 데이터 조회 (학생 목록, 다음 송장 번호, 사업자 프로필)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [studentsRes, nextNumRes, profileRes] = await Promise.all([
          api.get("/api/students/"),
          api.get("/api/invoices/next_number/"),
          api.get("/api/business-profile/"),
        ]);

        const activeStudents = studentsRes.data.filter(
          (student) => student.status === "ACTIVE",
        );
        setStudents(activeStudents);

        setInvoiceNumber(nextNumRes.data.next_number);
        setSubject(`Rechnung Nr. ${nextNumRes.data.next_number}`);

        const config = nextNumRes.data.tax_config;
        setTaxConfig(config);

        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            tax: config.is_small_business ? 0 : 19,
          })),
        );

        const fetchedTemplate = profileRes.data.default_intro_text;
        const finalTemplate = fetchedTemplate || "";

        setTemplateBase(finalTemplate);
        setIntroText(finalTemplate);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };

    if (isOpen) {
      fetchInitialData();
    }

    return () => {
      resetForm();
    };
  }, [isOpen, resetForm]);

  // Calculate totals for a single item line
  // 개별 품목 라인의 총액 계산
  const calculateItemTotal = useCallback((item) => {
    const qty = item.unit === "pauschal" ? 1 : Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const discount = Number(item.discount || 0);

    const base = qty * price;
    let discounted = base;

    if (item.discountUnit === "%") {
      discounted = base * (1 - discount / 100);
    } else {
      discounted = base - discount;
    }
    return Math.max(0, discounted);
  }, []);

  // Calculate overall invoice totals (Net, Tax, Gross)
  // 전체 영수증 총액 계산 (순액, 세금, 총액)
  const totals = useMemo(() => {
    let calculatedGross = 0;
    let calculatedTax = 0;

    items.forEach((item) => {
      const lineTotal = calculateItemTotal(item);
      const itemTaxRate = item.tax / 100;

      if (priceMode === "BRUTTO") {
        calculatedGross += lineTotal;
        calculatedTax += lineTotal - lineTotal / (1 + itemTaxRate);
      } else {
        const taxPart = lineTotal * itemTaxRate;
        calculatedGross += lineTotal + taxPart;
        calculatedTax += taxPart;
      }
    });

    let finalGross = calculatedGross;
    let finalTax = calculatedTax;

    // Apply global adjustments (discounts/surcharges)
    // 전체 조정(할인/추가금) 적용
    globalAdjustments.forEach((adj) => {
      const currentNet = finalGross - finalTax;
      let adjustmentAmount = 0;

      const adjValue = Number(adj.value || 0);

      if (adj.unit === "%") {
        adjustmentAmount = currentNet * (adjValue / 100);
      } else {
        adjustmentAmount = adjValue;
        if (priceMode === "BRUTTO") {
          const avgTaxRate = taxConfig.is_small_business ? 0 : 0.19;
          adjustmentAmount = adjValue / (1 + avgTaxRate);
        }
      }

      if (adj.type === "DISCOUNT") {
        const reducedNet = Math.max(0, currentNet - adjustmentAmount);
        const reductionRatio = currentNet > 0 ? reducedNet / currentNet : 0;

        finalTax = finalTax * reductionRatio;
        finalGross = reducedNet + finalTax;
      } else {
        const addedNet = currentNet + adjustmentAmount;
        const surchargeTaxRate = taxConfig.is_small_business ? 0 : 0.19;
        const addedTax = adjustmentAmount * surchargeTaxRate;

        finalTax += addedTax;
        finalGross = addedNet + finalTax;
      }
    });

    return {
      net: finalGross - finalTax,
      tax: Math.max(0, finalTax),
      gross: Math.max(0, finalGross),
    };
  }, [items, calculateItemTotal, globalAdjustments, priceMode, taxConfig]);

  const handleInvoiceDateChange = (e) => {
    const newDate = e.target.value;
    setInvoiceDate(newDate);
    if (dueDays) {
      setDueDate(calculateDueDateStr(newDate, dueDays));
    }
  };

  const togglePeriodMode = () => {
    setIsPeriodMode(!isPeriodMode);
    setDeliveryDate("");
    setPeriodStart("");
    setPeriodEnd("");
  };

  const handleDueDaysChange = (e) => {
    const days = e.target.value;
    setDueDays(days);
    if (days && invoiceDate) {
      setDueDate(calculateDueDateStr(invoiceDate, days));
    } else {
      setDueDate("");
    }
  };

  const handleDueDateChange = (e) => {
    const date = e.target.value;
    setDueDate(date);
    if (date && invoiceDate) {
      setDueDays(calculateDiffDays(invoiceDate, date));
    } else {
      setDueDays("");
    }
  };

  // Handle recipient selection and populate address fields
  // 수신자 선택 처리 및 주소 필드 자동 완성
  const handleRecipientChange = (e) => {
    const id = Number(e.target.value);
    setRecipientId(id);
    const student = students.find((s) => s.id === id);

    if (student) {
      setRecipientAddress({
        street: student.street || "",
        zip: student.postcode || "",
        city: student.city || "",
        country: student.country || "Deutschland",
      });

      const recipientName = student.billing_name || student.name || "";
      const studentName = student.name || "";
      let newText = templateBase;
      newText = newText.replace(/Frau\/Herr,/g, `Frau/Herr ${recipientName},`);
      newText = newText.replace(/Name:/g, `Name: ${studentName}`);

      setIntroText(newText);
    }
  };

  const handleEditAddress = () => {
    if (!recipientId) return;
    const student = students.find((s) => s.id === recipientId);
    if (student) {
      setSelectedStudentForEdit(student);
      setIsStudentModalOpen(true);
    }
  };

  const handleStudentSaveSuccess = async () => {
    setIsStudentModalOpen(false);
    const updatedStudents = await api
      .get("/api/students/")
      .then((res) => res.data.filter((s) => s.status === "ACTIVE"));
    setStudents(updatedStudents);
    if (recipientId && updatedStudents) {
      const updatedStudent = updatedStudents.find((s) => s.id === recipientId);
      if (updatedStudent) {
        setRecipientAddress({
          street: updatedStudent.street || "",
          zip: updatedStudent.postcode || "",
          city: updatedStudent.city || "",
          country: updatedStudent.country || "Deutschland",
        });
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        name: "",
        quantity: "",
        unit: "Stk",
        price: "",
        tax: taxConfig.is_small_business ? 0 : 19,
        discount: "",
        discountUnit: "%",
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleAddAdjustment = () => {
    setGlobalAdjustments([
      ...globalAdjustments,
      {
        id: Date.now(),
        type: "DISCOUNT",
        label: "Gesamtrabatt",
        value: "",
        unit: "%",
      },
    ]);
  };

  const handleRemoveAdjustment = (index) => {
    setGlobalAdjustments(globalAdjustments.filter((_, i) => i !== index));
  };

  const handleAdjustmentChange = (index, field, value) => {
    const newAdjustments = [...globalAdjustments];
    newAdjustments[index] = { ...newAdjustments[index], [field]: value };
    setGlobalAdjustments(newAdjustments);
  };

  // Construct payload for API submission
  // API 제출을 위한 페이로드 구성
  const getInvoicePayload = useCallback(() => {
    const globalTaxRate = taxConfig.is_small_business ? 0 : 0.19;

    const selectedStudent = students.find((s) => s.id === recipientId);
    const recipientNameStr = selectedStudent
      ? selectedStudent.billing_name || selectedStudent.name
      : "Unbekannt";

    return {
      student: recipientId ? recipientId : null,
      recipient_name: recipientNameStr,
      recipient_address: JSON.stringify(recipientAddress),
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      delivery_date_start: (isPeriodMode ? periodStart : deliveryDate) || null,
      delivery_date_end: (isPeriodMode ? periodEnd : null) || null,
      due_date: dueDate || null,
      subject: subject,
      header_text: introText,
      footer_text: footerText,

      items: items.map((item) => {
        const finalQty =
          item.unit === "pauschal" ? 1 : Number(item.quantity || 0);
        const itemPrice = Number(item.price || 0);
        const itemDiscount = Number(item.discount || 0);
        const taxRate = item.tax / 100;
        let netPrice = itemPrice;
        if (priceMode === "BRUTTO") {
          netPrice = itemPrice / (1 + taxRate);
        }

        let finalDiscountValue = itemDiscount;
        if (item.discountUnit !== "%" && priceMode === "BRUTTO") {
          finalDiscountValue = itemDiscount / (1 + taxRate);
        }

        return {
          description: item.name,
          quantity: finalQty,
          unit: UNIT_MAPPING[item.unit] || "PIECE",
          unit_price: netPrice,
          discount_value: finalDiscountValue,
          discount_unit: item.discountUnit === "%" ? "PERCENT" : "CURRENCY",
          vat_rate: item.tax,
          total_price:
            netPrice *
              finalQty *
              (item.discountUnit === "%" ? 1 - itemDiscount / 100 : 1) -
            (item.discountUnit !== "%" ? finalDiscountValue : 0),
        };
      }),

      adjustments: globalAdjustments.map((adj) => ({
        label: adj.label,
        type: adj.type,
        value:
          adj.unit !== "%" && priceMode === "BRUTTO"
            ? Number(adj.value || 0) / (1 + globalTaxRate)
            : Number(adj.value || 0),
        unit: adj.unit === "%" ? "PERCENT" : "CURRENCY",
      })),

      subtotal: totals.net,
      vat_amount: totals.tax,
      total_amount: totals.gross,
    };
  }, [
    recipientId,
    students,
    recipientAddress,
    invoiceNumber,
    invoiceDate,
    isPeriodMode,
    periodStart,
    deliveryDate,
    periodEnd,
    dueDate,
    subject,
    introText,
    footerText,
    items,
    priceMode,
    globalAdjustments,
    taxConfig,
    totals,
  ]);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const payload = getInvoicePayload();
      const response = await api.post("/api/invoices/preview_pdf/", payload, {
        responseType: "blob",
      });
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    } catch (err) {
      console.error("Preview failed", err);
      alert("Die Vorschau konnte nicht geladen werden.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!recipientId) {
      alert("Bitte wählen Sie einen Empfänger aus.");
      return;
    }
    if (!deliveryDate && (!periodStart || !periodEnd)) {
      alert("Bitte geben Sie ein Lieferdatum oder einen Leistungszeitraum an.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = getInvoicePayload();
      console.log("Submitting Payload:", payload);

      await api.post("/api/invoices/create_full/", payload);
      onSuccess();
    } catch (err) {
      console.error("Submission failed", err);
      let errorMessage = "Fehler beim Speichern der Rechnung.";
      if (err.response && err.response.data) {
        errorMessage += `\n${JSON.stringify(err.response.data)}`;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (isSubmitting) return;

    if (!recipientId) {
      alert("Bitte wählen Sie einen Empfänger aus.");
      return;
    }
    if (!deliveryDate && (!periodStart || !periodEnd)) {
      alert("Bitte geben Sie ein Lieferdatum oder einen Leistungszeitraum an.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = getInvoicePayload();
      const createRes = await api.post("/api/invoices/create_full/", payload);
      const newInvoiceId = createRes.data.id;
      const pdfRes = await api.get(
        `/api/invoices/${newInvoiceId}/download_pdf/`,
        {
          responseType: "blob",
        },
      );

      const pdfBlob = new Blob([pdfRes.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      onSuccess();
    } catch (err) {
      console.error("Save & Print failed", err);
      let errorMessage = "Fehler beim Speichern und Drucken.";
      if (err.response && err.response.data) {
        errorMessage += `\n${JSON.stringify(err.response.data)}`;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const DYNAMIC_GRID_CLASS = isPeriodMode
    ? "grid-cols-[35%_65%]"
    : "grid-cols-2";

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-card w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-border flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border bg-white dark:bg-card">
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground tracking-tight">
              Neue Rechnung
            </h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className={CANCEL_BUTTON_STYLE}
                onClick={handlePreview}
                disabled={isPreviewLoading || isSubmitting}
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vorschau...
                  </>
                ) : (
                  "Vorschau"
                )}
              </Button>
              <Button
                type="button"
                className={CANCEL_BUTTON_STYLE}
                onClick={handleSubmit}
                disabled={isPreviewLoading || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Speichern"
                )}
              </Button>
              <Button
                variant="default"
                className={SUBMIT_BUTTON_STYLE}
                onClick={handleSaveAndPrint}
                disabled={isPreviewLoading || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  "Versenden / Drucken"
                )}
              </Button>
              <button
                onClick={handleCloseModal}
                className="p-2 ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-white dark:bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
                  Empfänger
                </h3>

                <div className="space-y-1">
                  <label className={LABEL_CLASS}>
                    Kontakt <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={cn(
                        "flex h-10 w-full rounded-lg border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none appearance-none cursor-pointer",
                        CUSTOM_INPUT_STYLE,
                        recipientId === ""
                          ? "text-slate-400 dark:text-muted-foreground/60"
                          : "",
                      )}
                      value={recipientId}
                      onChange={handleRecipientChange}
                    >
                      <option value="" disabled hidden>
                        Person oder Organisation wählen
                      </option>
                      {students.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          className="text-slate-800 dark:text-foreground"
                        >
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-muted-foreground/60">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-end mb-1.5 min-h-5">
                    <label className="text-xs font-bold tracking-wider pl-1 block text-slate-500 dark:text-muted-foreground mb-0">
                      Anschrift <span className="text-destructive">*</span>
                    </label>
                    {recipientId && !recipientAddress.street && (
                      <button
                        type="button"
                        onClick={handleEditAddress}
                        className="flex items-center text-[11px] text-primary/70 font-semibold hover:text-primary hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adresse hinzufügen
                      </button>
                    )}
                  </div>
                  <Input
                    className={CUSTOM_INPUT_STYLE}
                    placeholder="Straße und Hausnummer"
                    value={recipientAddress.street}
                    onChange={(e) =>
                      setRecipientAddress({
                        ...recipientAddress,
                        street: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input
                      className={cn(CUSTOM_INPUT_STYLE, "col-span-1")}
                      placeholder="PLZ"
                      value={recipientAddress.zip}
                      onChange={(e) =>
                        setRecipientAddress({
                          ...recipientAddress,
                          zip: e.target.value,
                        })
                      }
                    />
                    <Input
                      className={cn(CUSTOM_INPUT_STYLE, "col-span-2")}
                      placeholder="Ort"
                      value={recipientAddress.city}
                      onChange={(e) =>
                        setRecipientAddress({
                          ...recipientAddress,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mt-2">
                    <Input
                      className={CUSTOM_INPUT_STYLE}
                      placeholder="Land"
                      value={recipientAddress.country}
                      onChange={(e) =>
                        setRecipientAddress({
                          ...recipientAddress,
                          country: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
                  Rechnungsinformationen
                </h3>

                <div
                  className={cn(
                    "grid gap-4 transition-all duration-300 ease-in-out",
                    DYNAMIC_GRID_CLASS,
                  )}
                >
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>
                      Rechnungsdatum <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        className={DATE_INPUT_STYLE(invoiceDate)}
                        value={invoiceDate}
                        onChange={handleInvoiceDateChange}
                        onClick={(e) => e.target.showPicker()}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between mb-1.5">
                      <label className="text-xs font-bold tracking-wider pl-1 block text-slate-500 dark:text-muted-foreground">
                        {isPeriodMode ? "Leistungszeitraum" : " ferdatum"}{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <button
                        onClick={togglePeriodMode}
                        className="text-[10px] text-primary/70 font-semibold hover:text-primary hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
                      >
                        {isPeriodMode ? "Datum" : "Zeitraum"}
                      </button>
                    </div>
                    {isPeriodMode ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="date"
                            className={cn(
                              DATE_INPUT_STYLE(periodStart),
                              "px-2",
                            )}
                            value={periodStart}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            onClick={(e) => e.target.showPicker()}
                          />
                        </div>
                        <span className="text-slate-400">-</span>
                        <div className="relative flex-1">
                          <Input
                            type="date"
                            className={cn(DATE_INPUT_STYLE(periodEnd), "px-2")}
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            onClick={(e) => e.target.showPicker()}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="date"
                          className={DATE_INPUT_STYLE(deliveryDate)}
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          onClick={(e) => e.target.showPicker()}
                        />
                      </div>
                    )}
                    {isPeriodMode &&
                      periodStart &&
                      periodEnd &&
                      periodEnd < periodStart && (
                        <p className="text-[10px] text-destructive mt-1 font-medium">
                          * Das Enddatum liegt vor dem Startdatum.
                        </p>
                      )}
                  </div>
                </div>

                <div
                  className={cn(
                    "grid gap-4 transition-all duration-300 ease-in-out",
                    DYNAMIC_GRID_CLASS,
                  )}
                >
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>
                      Rechnungsnummer{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      className={cn(READONLY_INPUT_STYLE, "font-bold")}
                      value={invoiceNumber}
                      readOnly
                      tabIndex="-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Referenznummer</label>
                    <Input
                      className={CUSTOM_INPUT_STYLE}
                      value={refNumber}
                      onChange={(e) => setRefNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "grid gap-4 transition-all duration-300 ease-in-out",
                    DYNAMIC_GRID_CLASS,
                  )}
                >
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Zahlungsziel</label>
                    <div className="relative">
                      <Input
                        type="date"
                        className={DATE_INPUT_STYLE(dueDate)}
                        value={dueDate}
                        onChange={handleDueDateChange}
                        onClick={(e) => e.target.showPicker()}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-4.5 mb-1.5"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 font-medium">
                        in
                      </span>
                      <Input
                        type="number"
                        className={cn(
                          CUSTOM_INPUT_STYLE,
                          "w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        )}
                        value={dueDays}
                        onChange={handleDueDaysChange}
                        placeholder="0"
                      />
                      <span className="text-sm text-slate-500 font-medium truncate">
                        Tagen
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-border" />

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
                Kopftext
              </h3>
              <div className="space-y-1">
                <label className={LABEL_CLASS}>Betreff</label>
                <Input
                  className={cn(
                    READONLY_INPUT_STYLE,
                    "text-base font-semibold",
                  )}
                  value={subject}
                  readOnly
                  tabIndex="-1"
                />
              </div>
              <TiptapEditor value={introText} onChange={setIntroText} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
                  Positionen
                </h3>
                <div className="flex gap-2 bg-slate-100 dark:bg-muted p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPriceMode("BRUTTO")}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                      priceMode === "BRUTTO"
                        ? "bg-white dark:bg-card text-slate-800 dark:text-foreground shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                    )}
                  >
                    Brutto
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode("NETTO")}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                      priceMode === "NETTO"
                        ? "bg-white dark:bg-card text-slate-800 dark:text-foreground shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                    )}
                  >
                    Netto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 px-1 text-sm font-bold tracking-wider text-slate-500 dark:text-muted-foreground">
                <div className="col-span-4 pl-6">Service</div>
                <div className="col-span-2 pl-1">Menge</div>
                <div className="col-span-2 pl-1">
                  Preis ({priceMode === "BRUTTO" ? "Brutto" : "Netto"})
                </div>
                <div className="col-span-1 pl-1">USt.</div>
                <div className="col-span-1 pl-1">Rabatt</div>
                <div className="col-span-2 pl-6">Betrag</div>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-3 items-center group"
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4 text-center">
                        {index + 1}.
                      </span>
                      <div className="flex-1 relative">
                        <FileText className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          className={cn(CUSTOM_INPUT_STYLE, "h-9 pl-8 pr-3")}
                          placeholder="Service beschreiben"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, "name", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="col-span-2 flex shadow-sm rounded-lg isolate">
                      {item.unit !== "pauschal" && (
                        <Input
                          type="number"
                          step="any"
                          className={cn(
                            CUSTOM_INPUT_STYLE,
                            "h-9 w-full text-center rounded-r-none border-r-0 focus:z-10 px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400",
                          )}
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => {
                            handleItemChange(index, "quantity", e.target.value);
                          }}
                        />
                      )}
                      <select
                        className={cn(
                          "flex border px-1 py-1 text-sm ring-offset-background focus-visible:outline-none appearance-none cursor-pointer bg-slate-50 dark:bg-muted/50 border-slate-200 dark:border-border",
                          "h-9 text-xs text-center focus:z-10 font-medium text-slate-600",
                          item.unit === "pauschal"
                            ? "w-full rounded-md"
                            : "w-16 rounded-l-none rounded-r-md border-l",
                        )}
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                      >
                        <option value="Stk">Stk</option>
                        <option value="Std">Std</option>
                        <option value="Tag(e)">Tag(e)</option>
                        <option value="pauschal">pauschal</option>
                      </select>
                    </div>

                    <div className="col-span-2 relative">
                      <Input
                        type="number"
                        step="any"
                        className={cn(
                          CUSTOM_INPUT_STYLE,
                          "h-9 pr-8 pl-2 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400",
                        )}
                        placeholder="0"
                        value={item.price}
                        onChange={(e) => {
                          handleItemChange(index, "price", e.target.value);
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                        EUR
                      </span>
                    </div>

                    <div className="col-span-1 relative">
                      <select
                        className={cn(
                          "flex h-9 w-full rounded-lg border px-1 py-1 text-xs text-center font-medium ring-offset-background focus-visible:outline-none appearance-none cursor-pointer",
                          CUSTOM_INPUT_STYLE,
                          taxConfig.is_small_business
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "",
                        )}
                        value={taxConfig.is_small_business ? 0 : item.tax}
                        disabled={taxConfig.is_small_business}
                        onChange={(e) =>
                          handleItemChange(index, "tax", Number(e.target.value))
                        }
                      >
                        <option value={19}>19%</option>
                        <option value={7}>7%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>

                    <div className="col-span-1 flex shadow-sm rounded-lg isolate">
                      <Input
                        type="number"
                        step="any"
                        className={cn(
                          CUSTOM_INPUT_STYLE,
                          "h-9 px-2 text-center w-full rounded-r-none border-r-0 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400",
                        )}
                        placeholder="0"
                        value={item.discount}
                        onChange={(e) => {
                          handleItemChange(index, "discount", e.target.value);
                        }}
                      />
                      <select
                        className={cn(
                          "flex border px-1 py-1 text-sm ring-offset-background focus-visible:outline-none appearance-none cursor-pointer bg-slate-50 dark:bg-muted/50 border-slate-200 dark:border-border",
                          "h-9 w-14 text-center text-xs rounded-l-none rounded-r-md border-l focus:z-10 font-medium text-slate-600",
                        )}
                        value={item.discountUnit}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "discountUnit",
                            e.target.value,
                          )
                        }
                      >
                        <option value="%">%</option>
                        <option value="EUR">€</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <span
                        className="font-bold text-sm text-slate-800 dark:text-foreground flex-1 min-w-0 truncate pl-6"
                        title={formatEuro(calculateItemTotal(item))}
                      >
                        {formatEuro(calculateItemTotal(item))}
                      </span>
                      <button
                        onClick={() => removeItem(index)}
                        className="shrink-0 transition-opacity p-1 text-destructive/40 hover:text-destructive rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {globalAdjustments.map((adj, index) => (
                <div
                  key={adj.id}
                  className="grid grid-cols-12 gap-3 items-center group bg-slate-50/50 dark:bg-muted/30 p-2 rounded-lg border border-dashed border-slate-200 dark:border-border mt-2"
                >
                  <div className="col-span-2">
                    <select
                      className={cn(
                        CUSTOM_INPUT_STYLE,
                        "h-9 text-xs font-semibold px-2",
                      )}
                      value={adj.type}
                      onChange={(e) =>
                        handleAdjustmentChange(index, "type", e.target.value)
                      }
                    >
                      <option value="DISCOUNT">Rabatt</option>
                      <option value="SURCHARGE">Aufschlag</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <Input
                      className={cn(CUSTOM_INPUT_STYLE, "h-9")}
                      placeholder="Rabatt / Aufschlag beschreiben"
                      onChange={(e) =>
                        handleAdjustmentChange(index, "label", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400 pr-2">
                    {adj.type === "DISCOUNT"
                      ? "wird abgezogen"
                      : "wird addiert"}
                  </div>
                  <div className="col-span-1 text-center text-slate-400 text-xs">
                    -
                  </div>
                  <div className="col-span-2 flex shadow-sm rounded-lg isolate">
                    <Input
                      type="number"
                      step="any"
                      className={cn(
                        CUSTOM_INPUT_STYLE,
                        "h-9 px-2 text-center w-full rounded-r-none border-r-0 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      )}
                      placeholder="0"
                      value={adj.value}
                      onChange={(e) =>
                        handleAdjustmentChange(index, "value", e.target.value)
                      }
                    />
                    <select
                      className={cn(
                        "flex border px-1 py-1 text-sm ring-offset-background focus-visible:outline-none appearance-none cursor-pointer bg-slate-50 dark:bg-muted/50 border-slate-200 dark:border-border",
                        "h-9 w-14 text-center text-xs rounded-l-none rounded-r-md border-l focus:z-10 font-medium text-slate-600",
                      )}
                      value={adj.unit}
                      onChange={(e) =>
                        handleAdjustmentChange(index, "unit", e.target.value)
                      }
                    >
                      <option value="%">%</option>
                      <option value="EUR">€</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleRemoveAdjustment(index)}
                      className="transition-opacity p-1 text-destructive/40 hover:text-destructive rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-start mt-6">
                <div className="flex flex-wrap gap-4 items-center px-5 text-sm font-semibold text-primary max-w-2xl">
                  <button
                    onClick={addItem}
                    className="hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-primary/70 transition-colors hover:text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" /> Position hinzufügen
                  </button>
                  <button
                    onClick={handleAddAdjustment}
                    className="hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-primary/70 transition-colors hover:text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" /> Gesamtrabatt hinzufügen
                  </button>
                </div>

                <div className="w-110 text-right text-sm">
                  <div className="space-y-1 pb-2">
                    <div className="flex justify-between text-slate-500 dark:text-muted-foreground">
                      <span>Gesamtsumme Netto (inkl. Rabatt / Aufschläge)</span>
                      <span>{formatEuro(totals.net)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-muted-foreground">
                      <span>
                        Umsatzsteuer {taxConfig.is_small_business ? 0 : 19}%
                      </span>
                      <span>{formatEuro(totals.tax)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg text-slate-800 dark:text-foreground pt-2 border-t border-slate-100 dark:border-border mt-2">
                    <span>Gesamt</span>
                    <span className="text-primary">
                      {formatEuro(totals.gross)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
                Fußtext
              </h3>
              <div className="relative">
                <textarea
                  className={cn(
                    "flex min-h-20 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none",
                    CUSTOM_INPUT_STYLE,
                    "h-32 p-3 resize-none",
                  )}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isStudentModalOpen && (
        <AddStudentModal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          onSuccess={handleStudentSaveSuccess}
          studentData={selectedStudentForEdit}
        />
      )}
    </>,
    document.body
  );
}
