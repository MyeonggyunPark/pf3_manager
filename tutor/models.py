from datetime import datetime

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
        EMAIL = "email", _("Email")
        GOOGLE = "google", _("Google")
        KAKAO = "kakao", _("Kakao")

    # Use email as the unique identifier
    # 이메일을 고유 식별자로 사용
    email = models.EmailField(_("email address"), unique=True)
    name = models.CharField(_("Name"), max_length=50)
    provider = models.CharField(
        max_length=20, choices=ProviderChoices.choices, default=ProviderChoices.EMAIL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.name})"


class Student(models.Model):
    """
    Student Information Model.
    Managed by a Tutor. Includes exam preferences.

    학생 정보 모델.
    튜터에 의해 관리되며, 주 시험 응시 목표(Preference)를 포함함.
    """

    class GenderChoices(models.TextChoices):
        MALE = "M", _("Männlich")
        FEMALE = "F", _("Weiblich")

    class ExamModeChoices(models.TextChoices):
        FULL = "FULL", _("Gesamtprüfung")
        WRITTEN = "WRITTEN", _("Schriftliche Prüfung")
        ORAL = "ORAL", _("Mündliche Prüfung")

    tutor = models.ForeignKey(
        Tutor, on_delete=models.CASCADE, related_name="students"
    )
    name = models.CharField(max_length=50)
    gender = models.CharField(
        max_length=10, choices=GenderChoices.choices, blank=True, null=True
    )
    age = models.PositiveIntegerField()
    current_level = models.CharField(max_length=10, help_text="z.B. A2, B1")
    target_level = models.CharField(max_length=10, help_text="z.B. B2, C1")

    # Default exam mode filter for the input interface
    # 시험 결과 입력 화면에서의 기본 필터링 옵션
    target_exam_mode = models.CharField(
        max_length=20, choices=ExamModeChoices.choices, default=ExamModeChoices.FULL
    )

    memo = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Student"
        verbose_name_plural = "Students"

    def __str__(self):
        return f"{self.name} ({self.target_level})"


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
        max_digits=6, decimal_places=2, help_text="시간당 유로(€)"
    )
    total_hours = models.DecimalField(max_digits=5, decimal_places=1)
    total_fee = models.DecimalField(
        max_digits=8, decimal_places=2, blank=True, null=True
    )
    is_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kursregistrierung"
        verbose_name_plural = "Kursregistrierungen"

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

    category = models.CharField(max_length=50, help_text="z.B. Leseverstehen, Hörverstehen")

    name = models.CharField(max_length=50, help_text="z.B. Hören Teil1, Lesen Teil2")

    # UI logic: Checkbox (True) vs Input (False)
    # UI 로직: 체크박스형(True) vs 점수 입력형(False)
    is_question_based = models.BooleanField(default=True)

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

    total_score = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    grade = models.CharField(max_length=20, blank=True, null=True)

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
        return f"{self.exam_record.student.name} ({self.exam_record.exam_standard.name})"


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
        ExamStandard,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    exam_name_manual = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="선택지 없는 경우 직접 입력",
    )

    exam_date = models.DateField(_("Exam Date"))

    # Pass/Fail status is the primary metric
    # 합격 여부가 가장 중요한 관리 지표
    status = models.CharField(
        max_length=20,
        choices=ResultStatusChoices.choices,
        default=ResultStatusChoices.WAITING,
    )

    # Optional score inputs (Text format for flexibility)
    # 선택적 점수 입력 (유연성을 위해 텍스트 형식 사용)
    total_score = models.CharField(
        max_length=50, blank=True, null=True, 
        help_text="점수를 아는 경우 입력"
    )

    grade = models.CharField(
        max_length=20, blank=True, null=True, 
        help_text="등급을 아는 경우 입력"
    )

    memo = models.TextField(blank=True, null=True, help_text="특이사항 메모")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Offizielles Prüfungsergebnis"
        verbose_name_plural = "Offizielle Prüfungsergebnisse"
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
        max_length=200, blank=True, help_text="수업 주제 (예: Chapter 5)"
    )
    memo = models.TextField(blank=True, help_text="수업 피드백 또는 숙제")

    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.SCHEDULED
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Unterrichtsstunde"
        verbose_name_plural = "Unterrichtsstunden"
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"[{self.date}] {self.student.name} - {self.topic}"
