from datetime import datetime
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


# ==========================================
# 1. User & Student Management (회원 및 학생)
# ==========================================
class Tutor(AbstractUser):
    """
    Custom User Model for Tutors.
    Extends AbstractUser to support social login providers.

    튜터(선생님)를 위한 커스텀 유저 모델.
    AbstractUser를 상속받아 소셜 로그인 제공자 정보를 포함함.
    """

    class ProviderChoices(models.TextChoices):
        EMAIL = "email", _("E-mail")
        GOOGLE = "google", _("Google")
        KAKAO = "kakao", _("Kakao")

    # Use email as the unique identifier
    # 이메일을 고유 식별자로 사용
    email = models.EmailField(_("E-mail-Adresse"), unique=True)
    name = models.CharField(_("Name"), max_length=50)
    provider = models.CharField(
        max_length=20, choices=ProviderChoices.choices, default=ProviderChoices.EMAIL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.name})"


class BusinessProfile(models.Model):
    """
    Tutor's Business & Tax Profile.
    Stores sender information for invoices based on user screenshots.
    Separated from Tutor model to handle specific German tax regulations (e.g., Kleinunternehmer).

    튜터의 사업자 및 세무 프로필.
    사용자 스크린샷에 기반하여 영수증 발신자 정보를 저장함.
    독일 세법 규정(소규모 사업자 등) 처리를 위해 튜터 모델에서 분리됨.
    """

    class PriceInputChoices(models.TextChoices):
        NETTO = "NETTO", _("Netto (zzgl. USt)")
        BRUTTO = "BRUTTO", _("Brutto (inkl. USt)")

    tutor = models.OneToOneField(
        Tutor, on_delete=models.CASCADE, related_name="business_profile"
    )

    # Allgemein (General Info)
    # 일반 정보
    company_name = models.CharField(
        _("Firma"), max_length=100, blank=True, help_text=_("Firmenname (falls vorhanden)")
    )
    manager_name = models.CharField(
        _("Geschäftsführer/-in"), max_length=100, blank=True, help_text=_("Name des Vertreters")
    )

    street = models.CharField(_("Straße & Hausnummer"), max_length=100, blank=True)
    postcode = models.CharField(_("PLZ"), max_length=10, blank=True)
    city = models.CharField(_("Stadt"), max_length=50, blank=True)
    country = models.CharField(_("Land"), max_length=50, default="Deutschland")

    phone = models.CharField(_("Telefon"), max_length=30, blank=True)
    email = models.EmailField(_("E-Mail-Adresse"), blank=True)
    website = models.URLField(_("Webseite"), blank=True)

    # Buchhaltung & Steuer (Accounting & Tax)
    # 회계 및 세무 정보
    vat_id = models.CharField(
        _("Umsatzsteuer-ID"), max_length=50, blank=True, help_text=_("z.B. DE123456789")
    )
    tax_number = models.CharField(_("Steuernummer"), max_length=50, blank=True)

    # Kleinunternehmer Regulation (§19 UStG)
    # 소규모 사업자 규정 (부가세 면세 여부)
    is_small_business = models.BooleanField(
        _("Kleinunternehmer"),
        default=False,
        help_text=_("Wenn aktiviert: 0% USt und automatischer Hinweis auf §19 UStG"),
    )

    # Price Input Setting (Netto vs Brutto)
    # 가격 입력 방식 설정 (부가세 별도 vs 포함)
    price_input_type = models.CharField(
        max_length=10,
        choices=PriceInputChoices.choices,
        default=PriceInputChoices.BRUTTO,
        help_text=_("Wählen Sie, ob die eingegebenen Preise inklusive (Brutto) oder exklusive (Netto) USt sind.")
    )

    # Bankverbindung (Bank Details)
    # 은행 정보 (송장에 출력될 계좌 정보)
    bank_name = models.CharField(_("Bankname"), max_length=100, blank=True)
    account_holder = models.CharField(_("Kontoinhaber"), max_length=100, blank=True) 
    iban = models.CharField(_("IBAN"), max_length=34, blank=True)
    bic = models.CharField(_("BIC"), max_length=11, blank=True)

    # Legacy fields (Optional)
    # 구식 은행 정보 (선택사항)
    account_number = models.CharField(_("Kontonummer"), max_length=20, blank=True)
    bank_code = models.CharField(_("BLZ"), max_length=20, blank=True)

    # Logo
    # 로고 이미지
    logo = models.ImageField(upload_to="business_logos/", blank=True, null=True)

    # Invoice Template Settings
    # 영수증 기본 문구 템플릿 (Kopftext)
    default_intro_text = models.TextField(
        _("Standard Kopftext"),
        blank=True,
        help_text="HTML 형식의 송장 기본 인사말 템플릿",
        default="""
        <p>Sehr geehrte(r) Frau/Herr,</p>
        <p>vielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!</p>
        <p>Hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:</p>
        <p>Name: </p>
        """,
    )

    # Internal Settings
    # 내부 설정
    next_invoice_number = models.PositiveIntegerField(
        _("Nächste Rechnungsnummer"),
        default=1000,
        help_text=_("Nummer der nächsten Rechnung (wird automatisch erhöht)"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Business Profile: {self.company_name or self.manager_name}"


class Student(models.Model):
    """
    Student Information Model.
    Managed by a Tutor. Includes exam preferences.
    Updated to include billing address and unique customer number.

    학생 정보 모델.
    튜터에 의해 관리되며 주 시험 응시 목표를 포함함.
    청구 주소 및 고유 고객 번호 필드가 추가됨.
    """

    class GenderChoices(models.TextChoices):
        MALE = "M", _("Männlich")
        FEMALE = "F", _("Weiblich")

    class ExamModeChoices(models.TextChoices):
        FULL = "FULL", _("Gesamtprüfung")
        WRITTEN = "WRITTEN", _("Schriftliche Prüfung")
        ORAL = "ORAL", _("Mündliche Prüfung")

    class StatusChoices(models.TextChoices):
        ACTIVE = "ACTIVE", _("Fortschritt")
        PAUSED = "PAUSED", _("Pause")
        FINISHED = "FINISHED", _("Ende")

    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, related_name="students")
    name = models.CharField(max_length=50)

    # Customer Number for Invoicing
    # 송장 발행을 위한 고유 고객 번호 (자동 생성)
    customer_number = models.CharField(
        _("Kundennummer"),
        max_length=20,
        blank=True,
        unique=True,
        help_text=_("Eindeutige Kundennummer (z.B. KD-1001)"),
    )

    gender = models.CharField(
        max_length=10, choices=GenderChoices.choices, blank=True, null=True
    )
    age = models.PositiveIntegerField(null=True, blank=True)
    current_level = models.CharField(max_length=10, help_text=_("z.B. A2, B1"))
    target_level = models.CharField(max_length=10, help_text=_("z.B. B2, C1"))

    # Billing Information
    # 청구서 수신자 정보
    billing_name = models.CharField(
        _("Rechnungsempfänger"),
        max_length=100,
        blank=True,
        help_text=_("Falls abweichend vom Schülernamen (z.B. Elternteil)")
    )
    street = models.CharField(_("Straße & Hausnummer"), max_length=100, blank=True)
    postcode = models.CharField(_("PLZ"), max_length=10, blank=True)
    city = models.CharField(_("Stadt"), max_length=50, blank=True)
    country = models.CharField(_("Land"), max_length=50, default="Deutschland")

    # Default exam mode filter for the input interface
    # 시험 결과 입력 화면에서의 기본 필터링 옵션
    target_exam_mode = models.CharField(
        max_length=20, choices=ExamModeChoices.choices, default=ExamModeChoices.FULL
    )

    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
        help_text=_("Aktueller Status des Schülers")
    )

    memo = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Schüler")
        verbose_name_plural = _("Schüler")

    def save(self, *args, **kwargs):
        # Auto-generate Customer Number if not present
        # 고객 번호가 없을 경우 자동 생성 로직 (KD-1000 + ID)
        if not self.customer_number:
            is_new = self.pk is None
            super().save(*args, **kwargs)

            if is_new:
                self.customer_number = f"KD-{1000 + self.pk}"
                Student.objects.filter(pk=self.pk).update(
                    customer_number=self.customer_number
                )
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.customer_number})"


# ==========================================
# 2. Course Management (수강 관리)
# ==========================================
class CourseRegistration(models.Model):
    """
    Course Registration History.
    Tracks billing status and calculates total fees automatically.

    수강 등록 및 계약 이력.
    결제 상태를 추적하며 총 수강료를 자동 계산함.
    """

    class StatusChoices(models.TextChoices):
        ACTIVE = "ACTIVE", _("Fortschritt")
        PAUSED = "PAUSED", _("Pause")
        FINISHED = "FINISHED", _("Ende")

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="registrations"
    )
    status = models.CharField(
        max_length=10, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )
    start_date = models.DateField()
    end_date = models.DateField()

    # Use DecimalField for financial accuracy
    # 금융 데이터 정확성을 위해 DecimalField 사용
    hourly_rate = models.DecimalField(
        max_digits=6, decimal_places=2, help_text=_("Stundensatz in Euro (€)")
    )
    total_hours = models.DecimalField(max_digits=5, decimal_places=1)
    total_fee = models.DecimalField(
        max_digits=8, decimal_places=2, blank=True, null=True
    )
    is_paid = models.BooleanField(default=False)

    memo = models.TextField(blank=True, null=True, help_text=_("Anmerkungen zum Vertrag"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Kursregistrierung")
        verbose_name_plural = _("Kursregistrierungen")

    def save(self, *args, **kwargs):
        # Auto-calculate total fee before saving
        # 저장 전 수강료(시간 * 시급) 자동 계산
        if self.hourly_rate and self.total_hours:
            self.total_fee = self.hourly_rate * self.total_hours
        super().save(*args, **kwargs)


# ==========================================
# 3. Exam Meta Data (시험 정의)
# ==========================================
class ExamStandard(models.Model):
    """
    Exam Standard Definition (Metadata).
    Defines high-level exam types (e.g., Telc B1).

    시험 표준 정의 (메타 데이터).
    상위 레벨의 시험 종류를 정의함 (예: Telc B1).
    """

    name = models.CharField(max_length=100, unique=True)
    level = models.CharField(max_length=5)
    total_score = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ExamModule(models.Model):
    """
    Exam Module Definition.
    Separates Written and Oral exams for partial attempts.

    시험 모듈 정의.
    부분 응시 지원을 위해 필기와 구술 시험을 분리함.
    """

    class ModuleTypeChoices(models.TextChoices):
        WRITTEN = "WRITTEN", _("Schriftliche Prüfung")
        ORAL = "ORAL", _("Mündliche Prüfung")

    exam_standard = models.ForeignKey(
        ExamStandard, on_delete=models.CASCADE, related_name="modules"
    )
    module_type = models.CharField(max_length=20, choices=ModuleTypeChoices.choices)
    max_score = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.exam_standard.name} - {self.get_module_type_display()}"


class ExamSection(models.Model):
    """
    Exam Section Definition.
    Defines specific parts.
    'category' allows grouping for statistics.

    시험 섹션 정의.
    구체적인 문제 영역을 정의함.
    'category' 필드를 통해 통계 산출 시 그룹핑 가능.
    """

    exam_module = models.ForeignKey(
        ExamModule, on_delete=models.CASCADE, related_name="sections"
    )

    category = models.CharField(
        max_length=50, help_text=_("z.B. Leseverstehen, Hörverstehen")
    )

    name = models.CharField(max_length=50, help_text=_("z.B. Hören Teil1, Lesen Teil2"))

    # UI logic: Checkbox (True) vs Input (False)
    # UI 로직: 체크박스형(True) vs 점수 입력형(False)
    is_question_based = models.BooleanField(default=True)

    # Allow Partial Score Flag
    # 부분 점수 허용 여부 플래그 (예: C1 Hörverstehen Teil 3)
    allow_partial_score = models.BooleanField(
        default=False,
        help_text=_("Teilpunkte pro Frage erlauben (True: Punkteingabe, False: Richtig/Falsch)")
    )

    question_start_num = models.PositiveIntegerField(null=True, blank=True)
    question_end_num = models.PositiveIntegerField(null=True, blank=True)

    # Points per question for weighted scoring (e.g., C1 uses 2.0 or 1.0)
    # 배점 가중치를 위한 문제당 점수 (예: C1은 2.0 또는 1.0 사용)
    points_per_question = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.00
    )

    section_max_score = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.exam_module.exam_standard.level}] {self.category} - {self.name}"


# ==========================================
# 4. Exam Transaction Data (응시 기록 및 결과)
# ==========================================
class ExamRecord(models.Model):
    """
    Exam Record Header.
    Stores the actual attempt of a student for a specific exam standard.

    시험 응시 기록 헤더.
    특정 시험 표준에 대한 학생의 실제 응시 내역을 저장함.
    """

    # Exam Mode Choices
    # Allows distinguishing between Full, Written-only, and Oral-only attempts.
    # 응시 유형 정의
    # 전체 응시인지, 필기/구술 부분 응시인지 구분하기 위함.
    class ExamModeChoices(models.TextChoices):
        FULL = "FULL", _("Gesamtprüfung")
        WRITTEN = "WRITTEN", _("Schriftliche Prüfung")
        ORAL = "ORAL", _("Mündliche Prüfung")

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="exam_records"
    )
    exam_standard = models.ForeignKey(ExamStandard, on_delete=models.CASCADE)
    exam_date = models.DateField()

    # Actual mode taken (Full / Written Only / Oral Only)
    # 실제 응시 유형 (전체 / 필기만 / 구술만)
    exam_mode = models.CharField(max_length=20, choices=ExamModeChoices.choices)

    source = models.CharField(
        max_length=100, blank=True, null=True, help_text=_("Quelle der Probeprüfung")
    )

    total_score = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    grade = models.CharField(max_length=20, blank=True, null=True)

    memo = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.name} - {self.exam_standard.name} ({self.exam_date})"


def exam_file_path(instance, filename):
    """
    Generate dynamic file path for exam attachments.
    Format: exam_papers/{student_name}/{YYYY}/{MM}/{DD}/{filename}

    시험 첨부파일을 위한 동적 경로 생성.
    포맷: exam_papers/{학생이름}/{년}/{월}/{일}/{파일명}
    """
    student_name = instance.exam_record.student.name
    date_path = datetime.now().strftime("%Y/%m/%d")
    return f"exam_papers/{student_name}/{date_path}/{filename}"


class ExamAttachment(models.Model):
    """
    Exam File Attachment.
    Stores scanned papers (PDF/Images) linked to an exam record.

    시험지 파일 첨부.
    시험 기록과 연동된 스캔본(PDF/이미지)을 저장함.
    """

    exam_record = models.ForeignKey(
        ExamRecord, on_delete=models.CASCADE, related_name="attachments"
    )

    file = models.FileField(upload_to=exam_file_path)

    original_name = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.exam_record.student.name} ({self.exam_record.exam_standard.name})"
        )


class ExamDetailResult(models.Model):
    """
    Question-based Results (O/X).
    Used for sections where is_question_based=True. Enables statistical analysis.

    문항별 O/X 상세 결과.
    is_question_based=True인 영역에서 사용됨. 통계 분석 가능.
    """

    exam_record = models.ForeignKey(
        ExamRecord, on_delete=models.CASCADE, related_name="detail_results"
    )
    exam_section = models.ForeignKey(ExamSection, on_delete=models.CASCADE)

    question_number = models.PositiveIntegerField()
    is_correct = models.BooleanField(default=False)

    # Actual Score Field for Partial Scoring
    # 부분 점수를 위한 실제 점수 필드 (O/X가 아닌 정확한 점수 저장)
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Erreichte Punktzahl (inkl. Teilpunkte)"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Prevent duplicate entries for the same question in one exam record
        # 동일 시험 기록 내 중복 문항 데이터 방지
        unique_together = ("exam_record", "exam_section", "question_number")


class ExamScoreInput(models.Model):
    """
    Score-based Results.
    Used for subjective sections (Writing/Speaking) where is_question_based=False.

    점수 입력형 상세 결과.
    is_question_based=False인 주관식 영역(쓰기/말하기)에서 사용됨.
    """

    exam_record = models.ForeignKey(
        ExamRecord, on_delete=models.CASCADE, related_name="score_inputs"
    )
    exam_section = models.ForeignKey(ExamSection, on_delete=models.CASCADE)

    score = models.DecimalField(max_digits=5, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("exam_record", "exam_section")


# ==========================================
# 5. Official Exam Results (정규 시험 결과)
# ==========================================
class OfficialExamResult(models.Model):
    """
    Official Exam Result.
    Stores results of actual certification exams (Telc, Goethe, etc.).
    Separate from internal mock exams.

    정규 시험 결과.
    실제 자격증 시험(Telc, Goethe 등)의 결과를 저장함.
    내부 모의고사와는 별도로 관리됨.
    """

    # Exam Mode Choices
    # Allows distinguishing between Full, Written-only, and Oral-only attempts.
    # 응시 유형 정의
    # 전체 응시인지, 필기/구술 부분 응시인지 구분하기 위함.
    class ExamModeChoices(models.TextChoices):
        FULL = "FULL", _("Gesamtprüfung")
        WRITTEN = "WRITTEN", _("Schriftliche Prüfung")
        ORAL = "ORAL", _("Mündliche Prüfung")

    class ResultStatusChoices(models.TextChoices):
        PASSED = "PASSED", _("Bestanden")
        FAILED = "FAILED", _("Nicht bestanden")
        WAITING = "WAITING", _("Wartet auf Ergebnis")

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="official_results"
    )

    # Link to existing standards or allow manual input if not in the list
    # 기존 시험 표준을 선택하거나, 목록에 없는 경우 직접 입력 허용
    exam_standard = models.ForeignKey(
        ExamStandard, on_delete=models.SET_NULL, null=True, blank=True
    )

    exam_name_manual = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_("Eigene Eingabe (falls nicht in der Liste)"),
    )

    exam_date = models.DateField(_("Exam Date"))

    # Actual mode taken (Full / Written Only / Oral Only)
    # Crucial for tracking partial certification (e.g., Passed Written, Failed Oral)
    # 실제 응시 유형 (전체 / 필기만 / 구술만)
    # 부분 합격 여부 추적(예: 필기는 합격했으나 구술은 불합격)을 위한 핵심 필드
    exam_mode = models.CharField(
        max_length=20,
        choices=ExamModeChoices.choices,
        default=ExamModeChoices.FULL,
        help_text=_("Prüfungsart (Gesamt/Schriftlich/Mündlich)"),
    )

    # Pass/Fail status is the primary metric
    # 합격 여부가 가장 중요한 관리 지표
    status = models.CharField(
        max_length=20,
        choices=ResultStatusChoices.choices,
        default=ResultStatusChoices.WAITING,
    )

    # Optional score inputs
    # 선택적 점수 입력
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_("Punktzahl (falls bekannt)")
    )

    grade = models.CharField(
        max_length=20, blank=True, null=True, help_text=_("Note (falls bekannt)")
    )

    memo = models.TextField(blank=True, null=True, help_text=_("Anmerkungen"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Offizielles Prüfungsergebnis")
        verbose_name_plural = _("Offizielle Prüfungsergebnisse")
        ordering = ["-exam_date"]

    def __str__(self):
        exam_name = (
            self.exam_standard.name if self.exam_standard else self.exam_name_manual
        )
        return f"[Official] {self.student.name} - {exam_name} ({self.status})"


# ==========================================
# 6. Schedule Management (수업 일정 관리)
# ==========================================
class Lesson(models.Model):
    """
    Individual Lesson Schedule.
    Tracks daily class details, attendance, and topics.
    Linked to a student and optionally to a course registration (contract).

    개별 수업 일정.
    일별 수업 상세, 출석, 수업 주제를 추적함.
    학생과 연결되며, 선택적으로 수강 등록(계약)과도 연결됨.
    """

    class StatusChoices(models.TextChoices):
        SCHEDULED = "SCHEDULED", _("Geplant")
        COMPLETED = "COMPLETED", _("Abgeschlossen")
        CANCELLED = "CANCELLED", _("Abgesagt")
        NOSHOW = "NOSHOW", _("Unentschuldigt")

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="lessons"
    )

    # Optional: Link to a specific contract to track deduction of hours
    # 선택사항: 특정 계약(수강권)과 연동하여 시간 차감 추적
    course_registration = models.ForeignKey(
        CourseRegistration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lessons",
    )

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    topic = models.CharField(
        max_length=200, blank=True, help_text=_("Thema (z.B. Kapitel 5)")
    )
    memo = models.TextField(blank=True, help_text=_("Feedback oder Hausaufgaben"))

    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.SCHEDULED
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Unterrichtsstunde")
        verbose_name_plural = _("Unterrichtsstunden")
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"[{self.date}] {self.student.name} - {self.topic}"


# ==========================================
# 7. Todo Management (할 일 관리)
# ==========================================
class Todo(models.Model):
    """
    Tutor's Personal Todo List.
    Independent from students, used for general task management.
    Updated to include categories and priorities for better task management.

    튜터 개인용 투두 리스트.
    학생과는 독립적이며, 일반적인 업무 관리를 위해 사용됨.
    업무 관리 효율화를 위해 카테고리와 중요도 필드가 추가됨.
    """

    # Priority Levels (Order by Importance: High < Medium < Low)
    # 중요도 레벨 (중요순 정렬: 높음 < 보통 < 낮음)
    class PriorityChoices(models.IntegerChoices):
        HIGH = 1, _("Hoch")
        MEDIUM = 2, _("Mittel")
        LOW = 3, _("Niedrig")

    # Business Categories for Tutors
    # 튜터를 위한 업무 카테고리
    class CategoryChoices(models.TextChoices):
        PREP = "PREP", _("Vorbereitung")
        ADMIN = "ADMIN", _("Verwaltung")
        STUDENT = "STUDENT", _("Betreuung")
        PERSONAL = "PERSONAL", _("Privat")

    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, related_name="todos")
    content = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)

    # Optional: Deadline date for the task
    # 선택사항: 할 일의 마감 기한
    due_date = models.DateField(null=True, blank=True)

    # Priority of the task
    # 업무의 중요도
    priority = models.IntegerField(
        choices=PriorityChoices.choices, default=PriorityChoices.MEDIUM
    )

    # Category of the task
    # 업무의 카테고리
    category = models.CharField(
        max_length=20, choices=CategoryChoices.choices, default=CategoryChoices.PERSONAL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Aufgabe")
        verbose_name_plural = _("Aufgaben")
        # Smart Ordering: Uncompleted -> High Priority -> Urgent Date -> Newest
        # 스마트 정렬: 미완료 -> 중요도 높음 -> 마감 임박 -> 최신순
        ordering = [
            "is_completed",
            "priority",
            "due_date",
            "-created_at",
        ]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.content}"


# ==========================================
# 8. Invoice System (영수증 시스템)
# ==========================================
class Invoice(models.Model):
    """
    Invoice Header Model.
    Stores a snapshot of the invoice data at the time of creation.
    Allows for legal compliance even if user profile changes later.

    영수증 헤더 모델.
    생성 시점의 영수증 데이터 스냅샷을 저장함.
    추후 사용자 프로필이 변경되더라도 법적 효력을 유지할 수 있음.
    """

    # Adjustment Types (Global Discount or Surcharge)
    # 전체 조정 유형 (할인 또는 추가금)
    class AdjustmentTypeChoices(models.TextChoices):
        DISCOUNT = "DISCOUNT", _("Rabatt")
        SURCHARGE = "SURCHARGE", _("Aufschlag")

    # Unit Types (Percent or Currency)
    # 단위 유형 (퍼센트 또는 금액)
    class AdjustmentUnitChoices(models.TextChoices):
        PERCENT = "PERCENT", "%"
        CURRENCY = "CURRENCY", "EUR"

    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, related_name="invoices")
    student = models.ForeignKey(
        Student, on_delete=models.SET_NULL, null=True, related_name="invoices"
    )

    # Link to Course Registration (Added for Invoice Integration)
    # 수강 등록과의 연결 (영수증 통합을 위해 추가됨)
    course_registration = models.OneToOneField(
        CourseRegistration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice",
        help_text=_("Zugehörige Kursregistrierung")
    )

    # Invoice Identifiers
    # 영수증 식별자
    invoice_number = models.PositiveIntegerField(help_text=_("Fortlaufende Nummer (z.B. 1001)"))
    full_invoice_code = models.CharField(
        max_length=50, unique=True, help_text=_("Vollständige Rechnungsnummer (z.B. RE-10012601)")
    )

    # Dates, Snapshot Data, Content, Financials, etc.
    # 날짜 정보, 스냅샷 데이터, 내용, 재무 정보 등
    created_at = models.DateTimeField(auto_now_add=True, help_text=_("Rechnungsdatum"))
    delivery_date_start = models.DateField(
        _("Leistungszeitraum Start"), null=True, blank=True
    )
    delivery_date_end = models.DateField(
        _("Leistungszeitraum Ende"), null=True, blank=True
    )
    due_date = models.DateField(_("Zahlungsziel"), help_text=_("Fälligkeitsdatum"))

    # Snapshot of Business Profile Data
    # BusinessProfile 데이터 스냅샷 (발행 당시 정보 보존용)
    sender_data = models.JSONField(
        _("Absenderdaten Snapshot"),
        default=dict,
        help_text=_("Snapshot der BusinessProfile-Daten zum Zeitpunkt der Erstellung")
    )

    recipient_name = models.CharField(_("Empfänger Name"), max_length=100)
    recipient_address = models.CharField(_("Empfänger Adresse"), max_length=255)

    subject = models.CharField(_("Betreff"), max_length=200, default="Rechnung")
    header_text = models.TextField(
        _("Kopftext"), blank=True, help_text=_("Einleitungstext (HTML erlaubt)")
    )
    footer_text = models.TextField(
        _("Fußtext"), blank=True, help_text=_("Schlusstext und Hinweise (HTML erlaubt)")
    )

    # Financials (Calculated Fields)
    # 재무 정보 (계산된 필드)
    subtotal = models.DecimalField(
        _("Netto Summe"), max_digits=10, decimal_places=2, default=0
    )
    vat_amount = models.DecimalField(
        _("USt Summe"), max_digits=10, decimal_places=2, default=0
    )

    # The actual calculated value in EUR used for the final total
    # 최종 합계 계산에 사용되는 실제 유로 환산 금액
    total_adjustment_amount = models.DecimalField(
        _("Berechneter Betrag"),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Summe der Anpassungen (Rabatte/Aufschläge)"),
    )

    total_amount = models.DecimalField(
        _("Brutto Summe"), max_digits=10, decimal_places=2, default=0
    )

    is_paid = models.BooleanField(default=False)

    is_sent = models.BooleanField(
        _("Versendet"),
        default=False,
        help_text=_("Wurde die Rechnung bereits versendet?")
    )

    is_small_business = models.BooleanField(
        default=False, help_text=_("Anwendung der Kleinunternehmerregelung (§19 UStG)")
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Rechnung")
        verbose_name_plural = _("Rechnungen")

    def __str__(self):
        return f"{self.full_invoice_code} - {self.recipient_name}"

    def calculate_totals(self):
        """
        Recalculate totals based on items to ensure data integrity.
        Called after items are added/updated.

        데이터 무결성을 보장하기 위해 항목을 기반으로 총액을 재계산합니다.
        항목이 추가되거나 수정된 후 호출됩니다.
        """

        current_subtotal = Decimal("0.00")
        current_vat_total = Decimal("0.00")

        # Sum up all items
        # 모든 항목 합산
        for item in self.items.all():

            # Ensure price is handled as Netto
            # 가격이 Netto로 처리되도록 보장
            base_price = item.unit_price * item.quantity

            # Apply Item Discount
            # 항목별 개별 할인 적용
            if item.discount_unit == "PERCENT":
                discounted = base_price * (1 - (item.discount_value / 100))
            else:
                discounted = base_price - item.discount_value

            item_total = max(Decimal("0.00"), discounted)

            # Update item's total_price just in case
            # 만약을 대비해 항목의 total_price 업데이트 및 저장
            item.total_price = item_total
            item.save()

            current_subtotal += item_total
            current_vat_total += item_total * (item.vat_rate / 100)

        # Apply Global Adjustment
        # 전체 조정(전체 할인/추가금) 적용
        total_adj_impact = Decimal("0.00")

        # Iterate through adjustment objects
        # 조정 항목 순회 및 계산
        for adj in self.adjustments.all():
            adj_amount = Decimal("0.00")

            if adj.unit == "PERCENT":
                adj_amount = current_subtotal * (adj.value / 100)
            else:
                adj_amount = adj.value

            # DB에 계산된 금액 저장
            adj.amount = adj_amount
            adj.save()

            # Handle Discount vs Surcharge
            # 할인(차감) vs 추가금(가산) 분기 처리
            if adj.type == "DISCOUNT":
                total_adj_impact -= adj_amount

                # Recalculate VAT reduction proportionally
                # 할인분에 대한 VAT 감소분 비례 계산
                if current_subtotal > 0:
                    effective_vat_rate = current_vat_total / current_subtotal
                    current_vat_total -= adj_amount * effective_vat_rate
            else:
                total_adj_impact += adj_amount

                # Calculate VAT for surcharge (Based on Small Business Status)
                # 추가금에 대한 VAT 계산 (소규모 사업자 여부에 따라 0% 또는 19%)
                surcharge_tax_rate = (
                    Decimal("0.00") if self.is_small_business else Decimal("0.19")
                )
                current_vat_total += adj_amount * surcharge_tax_rate

        # Finalize
        # Netto에 조정 금액 반영 및 최종 합계 계산
        final_netto = max(Decimal("0.00"), current_subtotal + total_adj_impact)
        final_vat = max(Decimal("0.00"), current_vat_total)

        self.subtotal = final_netto
        self.vat_amount = final_vat
        self.total_amount = final_netto + final_vat
        self.total_adjustment_amount = total_adj_impact
        self.save()


class InvoiceAdjustment(models.Model):
    """
    Stores individual adjustment lines (Discount/Surcharge) for an Invoice.
    Separated from items to apply to the subtotal globally.

    영수증에 대한 개별 조정 항목(할인/추가금)을 저장.
    항목별 할인이 아닌 전체 소계(Subtotal)에 대한 조정을 위해 분리됨.
    """

    class AdjustmentTypeChoices(models.TextChoices):
        DISCOUNT = "DISCOUNT", _("Rabatt")
        SURCHARGE = "SURCHARGE", _("Aufschlag")

    class AdjustmentUnitChoices(models.TextChoices):
        PERCENT = "PERCENT", "%"
        CURRENCY = "CURRENCY", "EUR"

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="adjustments"
    )

    label = models.CharField(max_length=100, blank=True, default="Adjustment")

    type = models.CharField(
        max_length=10,
        choices=AdjustmentTypeChoices.choices,
        default=AdjustmentTypeChoices.DISCOUNT,
    )

    value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text=_("Wert (z.B. 10)")
    )

    unit = models.CharField(
        max_length=10,
        choices=AdjustmentUnitChoices.choices,
        default=AdjustmentUnitChoices.PERCENT,
    )

    amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text=_("Berechneter Betrag in Euro")
    )

    def __str__(self):
        return f"{self.label}: {self.value} {self.unit}"


class InvoiceItem(models.Model):
    """
    Invoice Line Items (Positionen).
    Represents individual products or services in an invoice.
    Calculates line totals including quantity and item-specific discounts.

    영수증 상세 항목 (Positionen).
    영수증에 포함된 개별 상품이나 서비스를 나타냄.
    수량 및 항목별 할인을 포함한 라인 합계를 계산함.
    """

    # Updated to match Frontend Unit Mapping
    # 프론트엔드 단위 매핑과 일치하도록 업데이트됨
    class UnitChoices(models.TextChoices):
        PIECE = "PIECE", _("Stück")
        HOUR = "HOUR", _("Stunde")
        DAY = "DAY", _("Tag")
        FLAT_RATE = "FLAT_RATE", _("Pauschal")

    class DiscountUnitChoices(models.TextChoices):
        PERCENT = "PERCENT", "%"
        CURRENCY = "CURRENCY", "EUR"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    position_number = models.PositiveIntegerField(default=1)

    description = models.CharField(_("Beschreibung"), max_length=255)

    # Quantity supports decimals (e.g. 1.5 Hours)
    # 수량은 소수점을 지원함 (예: 1.5시간)
    quantity = models.DecimalField(
        _("Menge"), max_digits=6, decimal_places=2, default=1
    )

    unit = models.CharField(
        max_length=20, choices=UnitChoices.choices, default=UnitChoices.PIECE
    )

    # Stores Netto Price (Backend Standard)
    # Netto 가격 저장 (백엔드 표준)
    unit_price = models.DecimalField(
        _("Einzelpreis (Netto)"), max_digits=10, decimal_places=2
    )

    # Item Discount Logic
    # 항목 할인 로직
    discount_value = models.DecimalField(
        _("Rabatt Wert"),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Rabattwert")
    )
    discount_unit = models.CharField(
        max_length=10,
        choices=DiscountUnitChoices.choices,
        default=DiscountUnitChoices.PERCENT,
    )

    # VAT Rate (0 if Small Business)
    # 부가세율 (소규모 사업자인 경우 0)
    vat_rate = models.DecimalField(
        _("USt %"), max_digits=5, decimal_places=2, default=19
    )

    total_price = models.DecimalField(_("Gesamtpreis"), max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["position_number"]
