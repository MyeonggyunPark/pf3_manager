from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    Tutor,
    Student,
    CourseRegistration,
    ExamStandard,
    ExamModule,
    ExamSection,
    ExamRecord,
    ExamAttachment,
    ExamDetailResult,
    ExamScoreInput,
    OfficialExamResult,
    Lesson,
    Todo,
    BusinessProfile,
    Invoice,
    InvoiceItem,
    InvoiceAdjustment,
)


# ==========================================
# 1. Tutor (Custom User) Configuration
# ==========================================
class BusinessProfileInline(admin.StackedInline):
    """
    Inline Admin for Business Profile.
    Allows editing profile directly inside Tutor admin page.

    사업자 프로필을 위한 인라인 어드민.
    튜터 관리자 페이지 내에서 프로필을 직접 수정할 수 있게 함.
    """

    model = BusinessProfile
    can_delete = False
    verbose_name_plural = "Business Profile (Settings)"


@admin.register(Tutor)
class TutorAdmin(UserAdmin):
    """
    Tutor Admin Configuration.
    Displays custom fields like 'provider' in the admin panel.
    Inherits from UserAdmin to handle password hashing correctly.

    튜터(관리자) 관리 설정.
    'provider'와 같은 커스텀 필드를 관리자 패널에 표시함.
    UserAdmin을 상속받아 비밀번호 해싱 등을 올바르게 처리함.
    """

    inlines = [BusinessProfileInline]

    list_display = ("email", "name", "provider", "is_staff", "created_at")
    list_filter = ("provider", "is_staff", "is_active")
    search_fields = ("email", "name")
    ordering = ("email",)

    # Organize fields into logical groups
    # 필드를 논리적인 그룹으로 정리 (UserAdmin 기본셋 재정의)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("name", "provider")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )


# ==========================================
# 2. Student & Course Management
# ==========================================
class CourseRegistrationInline(admin.TabularInline):
    """
    Inline view for Course Registration.
    Allows adding course history directly within the Student detail page.

    수강 등록 인라인 뷰.
    학생 상세 페이지 내에서 수강 이력을 직접 추가할 수 있도록 함.
    """

    model = CourseRegistration

    # No empty rows by default (깔끔한 UI를 위해 빈 줄 숨김)
    extra = 0


class ExamRecordInline(admin.TabularInline):
    """
    Inline view for Internal Exam Records.
    Display basic exam results directly on the Student page.
    Allows quick access to the full detail page via the change link.

    내부 모의고사 기록 인라인 뷰.
    학생 페이지에서 기본 시험 결과를 직접 표시함.
    수정 링크를 통해 전체 상세 페이지로 빠르게 접근할 수 있음.
    """

    model = ExamRecord
    extra = 0
    fields = ("exam_standard", "exam_date", "exam_mode", "total_score", "grade")

    # Score is calculated automatically, so keep it read-only here
    # 점수는 자동 계산되므로 여기서는 읽기 전용으로 설정
    readonly_fields = ("total_score",)
    show_change_link = True


class OfficialExamResultInline(admin.TabularInline):
    """
    Inline view for Official Exam Results.
    Display official certification results directly on the Student page.
    Crucial for tracking certification progress (Pass/Fail/Partial).

    정규 시험 결과 인라인 뷰.
    학생 페이지에서 정규 자격증 시험 결과를 직접 표시함.
    자격증 취득 현황(합격/불합격/부분합격)을 추적하는 데 중요함.
    """

    model = OfficialExamResult
    extra = 0
    fields = ("exam_standard", "exam_name_manual", "exam_date", "exam_mode", "status")
    show_change_link = True


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """
    Student Admin Interface.
    Optimized to fetch Tutor data efficiently using select_related.
    Provides search fields for autocomplete widgets in other models.

    학생 관리 인터페이스.
    select_related를 사용하여 튜터 데이터를 효율적으로 가져오도록 최적화됨.
    다른 모델의 자동 완성 위젯을 위한 검색 필드를 제공함.
    """

    list_display = (
        "name",
        "customer_number",  # Added: Critical for invoicing (추가: 송장 발행에 필수)
        "tutor",
        "status",
        "current_level",
        "target_level",
        "target_exam_mode",
    )
    list_filter = ("status", "current_level", "target_level", "gender")

    # Added customer_number and billing_name to search fields
    # 검색 필드에 고객 번호(customer_number)와 청구인 이름(billing_name) 추가
    search_fields = ("name", "customer_number", "billing_name", "tutor__name")

    # Optimization: Fetch tutor data in a single query (N+1 Problem Fix)
    # 최적화: 튜터 정보를 한 번의 쿼리로 가져옴
    list_select_related = ("tutor",)

    # Add CourseRegistration AND Exam Inlines inside Student page
    # Consolidates all student history (Courses, Mock Exams, Official Exams) in one view
    # 학생 페이지 내부에 수강 등록 및 시험 이력 테이블 삽입
    # 학생의 모든 이력(수강, 모의고사, 정규 시험)을 한 화면에서 통합 관리
    inlines = [CourseRegistrationInline, ExamRecordInline, OfficialExamResultInline]

    # Organize fields logically with the new address structure
    # 새로운 주소 구조에 맞춰 필드를 논리적으로 그룹화
    fieldsets = (
        (
            "Basic Info",
            {"fields": ("tutor", "name", "customer_number", "gender", "age", "memo")},
        ),
        (
            "Academic Status",
            {
                "fields": (
                    "status",
                    "current_level",
                    "target_level",
                    "target_exam_mode",
                )
            },
        ),
        (
            "Invoice Information (Rechnungsdaten)",
            {
                "fields": (
                    "billing_name",
                    "street",
                    ("postcode", "city"),
                    "country",
                ),
                "classes": ("collapse",),
            },
        ),
    )
    # Make customer_number read-only to prevent manual errors (auto-generated)
    # 고객 번호는 자동 생성되므로 실수 방지를 위해 읽기 전용으로 설정
    readonly_fields = ("customer_number",)


@admin.register(CourseRegistration)
class CourseRegistrationAdmin(admin.ModelAdmin):
    """
    Course Registration List.
    Useful for checking total sales or active students at a glance.
    Uses autocomplete_fields for better UX with many students.

    수강 등록 전체 목록.
    전체 매출이나 활성 학생 현황을 한눈에 파악하기 위해 등록.
    학생 수가 많을 때의 UX 개선을 위해 자동 완성 필드 사용.
    """

    list_display = (
        "student",
        "status",
        "start_date",
        "end_date",
        "total_fee",
        "is_paid",
    )
    list_filter = ("status", "is_paid")
    search_fields = ("student__name",)

    # Optimization: Fetch student data efficiently
    # 최적화: 학생 데이터 효율적 로딩
    list_select_related = ("student",)

    # UI Improvement: Searchable dropdown for Student
    # UI 개선: 학생 검색 선택 기능
    autocomplete_fields = ["student"]


# ==========================================
# 3. Exam Meta Data (Hierarchy Visualization)
# ==========================================
class ExamSectionInline(admin.TabularInline):
    """
    Inline view for Exam Sections.
    Used within ExamModule to manage sections (e.g., Teil 1, Teil 2).

    시험 섹션 인라인 뷰.
    ExamModule 내에서 섹션(예: Teil 1, Teil 2)을 관리하기 위해 사용됨.
    """

    model = ExamSection
    extra = 0
    fields = (
        "category",
        "name",
        "is_question_based",
        "points_per_question",
        "section_max_score",
    )


@admin.register(ExamStandard)
class ExamStandardAdmin(admin.ModelAdmin):
    """
    Exam Standard Admin.
    Manages high-level exam definitions (e.g., Telc B1).
    Provides search fields for autocomplete usage.

    시험 표준 관리.
    상위 레벨의 시험 정의를 관리함 (예: Telc B1).
    자동 완성을 위한 검색 필드 제공.
    """

    list_display = ("name", "level", "total_score")
    list_filter = ("level",)
    search_fields = ("name",)


@admin.register(ExamModule)
class ExamModuleAdmin(admin.ModelAdmin):
    """
    Exam Module Admin.
    Manages specific modules and their sections inline.
    Optimized with select_related for ExamStandard.

    시험 모듈 관리.
    개별 모듈을 관리하며 하위 섹션을 인라인으로 포함함.
    ExamStandard에 대한 select_related 최적화 적용.
    """

    list_display = ("__str__", "exam_standard", "module_type", "max_score")
    list_filter = ("exam_standard", "module_type")
    search_fields = ("exam_standard__name",)

    # Optimization
    list_select_related = ("exam_standard",)

    # Manage sections directly inside the module page
    # 모듈 페이지 내부에서 섹션을 직접 관리
    inlines = [ExamSectionInline]


@admin.register(ExamSection)
class ExamSectionAdmin(admin.ModelAdmin):
    """
    Exam Section List Configuration.
    Displays hierarchy (Module -> Category -> Name) for easy identification.
    Uses autocomplete for selecting Exam Module.

    시험 섹션 목록 설정.
    계층 구조(모듈 -> 카테고리 -> 이름)를 표시하여 쉽게 식별 가능하게 함.
    시험 모듈 선택 시 자동 완성 기능 사용.
    """

    list_display = (
        "exam_module",
        "category",
        "name",
        "question_start_num",
        "question_end_num",
        "points_per_question",
        "allow_partial_score",
        "is_question_based",
        "section_max_score",
    )
    list_filter = ("exam_module__exam_standard", "category", "is_question_based")
    search_fields = ("name", "category")
    ordering = ("exam_module", "id")

    # Optimization: Double hop (Module -> Standard) pre-fetching
    # 최적화: 모듈 및 표준 정보 미리 가져오기
    list_select_related = ("exam_module", "exam_module__exam_standard")

    # UI Improvement
    autocomplete_fields = ["exam_module"]


# ==========================================
# 4. Exam Records (Results & Attachments)
# ==========================================
class ExamAttachmentInline(admin.TabularInline):
    """
    Inline for File Attachments.
    Allows uploading scanned exam papers directly in the Exam Record page.

    파일 첨부 인라인.
    시험 기록 페이지 내에서 스캔된 시험지를 직접 업로드할 수 있게 함.
    """

    model = ExamAttachment

    # Show one empty row for quick upload (빠른 업로드를 위해 빈 줄 1개 표시)
    extra = 1


@admin.register(ExamRecord)
class ExamRecordAdmin(admin.ModelAdmin):
    """
    Exam Record Admin.
    Tracks student attempts, scores, and file attachments.
    Highly optimized for large datasets using autocomplete and select_related.

    시험 응시 기록 관리.
    학생의 응시 내역, 점수, 첨부파일을 추적함.
    자동 완성 및 select_related를 사용하여 대용량 데이터셋에 고도로 최적화됨.
    """

    list_display = (
        "student",
        "exam_standard",
        "exam_date",
        "exam_mode",
        "total_score",
        "grade",
    )
    list_filter = ("exam_standard", "exam_mode", "exam_date")
    search_fields = ("student__name",)

    # Add date navigation bar (날짜 탐색 바 추가)
    date_hierarchy = "exam_date"

    # Optimization: Fetch Student and Standard in one go
    # 최적화: 학생과 시험 정보를 미리 로딩
    list_select_related = ("student", "exam_standard")

    # UI Improvement: Search instead of scrolling through dropdowns
    # UI 개선: 드롭다운 스크롤 대신 검색창 사용
    autocomplete_fields = ["student", "exam_standard"]

    # Upload files directly here
    # 여기서 파일 직접 업로드
    inlines = [ExamAttachmentInline]


@admin.register(ExamAttachment)
class ExamAttachmentAdmin(admin.ModelAdmin):
    """
    Attachment List Configuration.
    Enables searching files by student name or exam date.
    Optimized to display related student and exam info efficiently.

    첨부파일 목록 설정.
    학생 이름이나 시험 날짜로 파일을 검색할 수 있게 함.
    관련 학생 및 시험 정보를 효율적으로 표시하도록 최적화됨.
    """

    list_display = (
        "id",
        "get_student_name",
        "get_exam_standard",
        "file",
        "created_at",
    )
    search_fields = ("exam_record__student__name", "original_name")
    list_filter = ("created_at",)

    # Optimization
    list_select_related = (
        "exam_record",
        "exam_record__student",
        "exam_record__exam_standard",
    )

    @admin.display(description="Student", ordering="exam_record__student__name")
    def get_student_name(self, obj):
        return obj.exam_record.student.name

    @admin.display(description="Exam", ordering="exam_record__exam_standard__name")
    def get_exam_standard(self, obj):
        return obj.exam_record.exam_standard.name


@admin.register(ExamScoreInput)
class ExamScoreInputAdmin(admin.ModelAdmin):
    """
    Score Input List Configuration.
    Useful for reviewing subjective scores (Writing/Speaking) across all students.
    Uses autocomplete for filtering by Record or Section.

    점수 입력 목록 설정.
    모든 학생의 주관식 점수(쓰기/말하기)를 검토할 때 유용함.
    기록 또는 섹션별 필터링을 위해 자동 완성 기능 사용.
    """

    list_display = ("get_student_name", "exam_section", "score", "updated_at")
    list_filter = ("exam_section__category", "exam_record__exam_standard")
    search_fields = ("exam_record__student__name",)

    # Optimization
    list_select_related = ("exam_record", "exam_record__student", "exam_section")

    autocomplete_fields = ["exam_record", "exam_section"]

    @admin.display(description="Student", ordering="exam_record__student__name")
    def get_student_name(self, obj):
        return obj.exam_record.student.name


@admin.register(ExamDetailResult)
class ExamDetailResultAdmin(admin.ModelAdmin):
    """
    Detailed O/X Results.
    Registered to verify if bulk data (JSON) was loaded correctly.
    Optimized for handling large volumes of question data.

    O/X 상세 결과 전체 목록.
    대량의 데이터(JSON)가 문항별로 잘 들어갔는지 검증하기 위해 등록.
    대량의 문항 데이터를 처리하도록 최적화됨.
    """

    list_display = ("exam_record", "exam_section", "question_number", "is_correct")
    list_filter = ("is_correct", "exam_section__category")

    # Optimization
    list_select_related = ("exam_record", "exam_section")


# ==========================================
# 5. Official Exam Results
# ==========================================
@admin.register(OfficialExamResult)
class OfficialExamResultAdmin(admin.ModelAdmin):
    """
    Official Exam Result Admin.
    Manages external certification results.
    Displays either the Standard name or the manually entered name.

    정규 시험 결과 관리.
    정규 자격증 시험 결과를 관리함.
    시험 표준명 또는 직접 입력된 시험명을 표시함.
    """

    list_display = (
        "student",
        "get_exam_name",
        "exam_date",
        "exam_mode",
        "status",
    )

    list_filter = ("status", "exam_mode", "exam_date")
    search_fields = ("student__name", "exam_name_manual", "exam_standard__name")

    # Optimization: Fetch student and standard data efficiently
    # 최적화: 학생 및 시험 표준 데이터 효율적 로딩
    list_select_related = ("student", "exam_standard")

    # UI Improvement
    # UI 개선: 자동 완성 필드 사용
    autocomplete_fields = ["student", "exam_standard"]

    @admin.display(description="Exam", ordering="exam_standard__name")
    def get_exam_name(self, obj):
        # Return Standard Name if exists, otherwise return Manual Name
        # 표준 시험명이 있으면 반환, 없으면 직접 입력한 이름 반환
        return obj.exam_standard.name if obj.exam_standard else obj.exam_name_manual


# ==========================================
# 6. Schedule Management
# ==========================================
@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    """
    Lesson Schedule Admin.
    Manages daily classes and tracks attendance/status.
    Includes date hierarchy navigation and optimized student lookups.

    수업 일정 관리.
    일별 수업 및 출석/상태를 관리함.
    날짜 계층 탐색 기능을 포함하며 학생 조회 성능이 최적화됨.
    """

    list_display = ("date", "start_time", "student", "topic", "status")
    list_filter = ("date", "status", "student")
    search_fields = ("topic", "memo", "student__name")

    # Add date navigation bar (날짜 탐색 바 추가)
    date_hierarchy = "date"

    # Optimization: Fetch student data efficiently (최적화: 학생 데이터 효율적 로딩)
    list_select_related = ("student",)


# ==========================================
# 7. Todo Management
# ==========================================
@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    """
    Todo Admin Configuration.
    Enhanced to show categories and priorities.
    Allows quick editing of status and priority from the list view.

    투두 관리자 설정.
    카테고리와 중요도를 표시하도록 개선됨.
    목록 화면에서 상태와 중요도를 빠르게 수정할 수 있음.
    """

    # Display key metrics first (Priority, Category)
    # 핵심 지표(중요도, 카테고리)를 먼저 표시
    list_display = (
        "tutor",
        "priority",
        "category",
        "content",
        "is_completed",
        "due_date",
        "created_at",
    )

    # Filters for efficient task management
    # 효율적인 업무 관리를 위한 필터
    list_filter = ("priority", "category", "is_completed", "due_date")

    search_fields = ("content",)

    # Allow direct editing in the list view for improved productivity
    # 생산성 향상을 위해 목록 뷰에서 직접 수정 허용
    list_editable = ("is_completed", "priority")

    # Default sorting for admin view
    # 관리자 뷰 기본 정렬
    ordering = ("is_completed", "priority", "due_date")


# ==========================================
# 8. Invoice Management
# ==========================================
class InvoiceItemInline(admin.TabularInline):
    """
    Inline for Invoice Line Items.
    Allows managing products/services within the invoice.

    영수증 상세 항목 인라인.
    영수증 내에서 상품/서비스를 관리할 수 있게 함.
    """

    model = InvoiceItem
    extra = 1


class InvoiceAdjustmentInline(admin.TabularInline):
    """
    Inline for Invoice Adjustments.
    Allows managing global discounts or surcharges.

    영수증 조정(할인/추가금) 인라인.
    전체 할인이나 추가금을 관리할 수 있게 함.
    """

    model = InvoiceAdjustment
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """
    Invoice Admin Configuration.
    Manages generated invoices. Sender data is read-only as it's a snapshot.
    Updated to include Adjustments (Discounts/Surcharges).

    영수증 관리 설정.
    생성된 영수증을 관리함. 발신자 데이터는 스냅샷이므로 읽기 전용임.
    조정 항목(할인/추가금) 관리가 포함되도록 업데이트됨.
    """

    list_display = (
        "full_invoice_code",
        "recipient_name",
        "total_amount",
        "due_date",
        "is_paid",
        "created_at",
    )
    list_filter = ("is_paid", "created_at", "is_small_business")
    search_fields = ("full_invoice_code", "recipient_name", "student__name")

    # Included InvoiceAdjustmentInline for complete invoice management
    # 완전한 영수증 관리를 위해 조정 항목 인라인 포함
    inlines = [InvoiceItemInline, InvoiceAdjustmentInline]

    # Protect integrity of the invoice and calculated fields
    # 영수증 무결성 및 계산된 필드 보호
    readonly_fields = (
        "full_invoice_code",
        "invoice_number",
        "sender_data",
        "subtotal",
        "vat_amount",
        "total_adjustment_amount",
        "total_amount",
    )

    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "tutor",
                    "student",
                    "course_registration",
                    "full_invoice_code",
                    "created_at",
                )
            },
        ),
        ("Recipient", {"fields": ("recipient_name", "recipient_address")}),
        ("Dates", {"fields": ("delivery_date_start", "delivery_date_end", "due_date")}),
        ("Content", {"fields": ("subject", "header_text", "footer_text")}),
        (
            "Financials (Read-Only)",
            {
                "fields": (
                    "subtotal",
                    "total_adjustment_amount",
                    "vat_amount",
                    "total_amount",
                    "is_paid",
                    "is_small_business",
                )
            },
        ),
        ("Snapshot", {"fields": ("sender_data",)}),
        (
            "Delivery Options",
            {
                "fields": ("is_sent",),
                "classes": ("collapse",),
            },
        ),
    )
