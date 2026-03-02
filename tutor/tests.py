from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import BusinessProfile, Invoice, Student


class InvoiceApiTests(APITestCase):
    """
    API tests for the invoice workflow.
    Covers draft saving, finalization locks, deletion rules, and PDF access.

    영수증 워크플로우를 위한 API 테스트입니다.
    임시저장, 확정 잠금, 삭제 규칙, PDF 접근 제어를 검증합니다.
    """

    def setUp(self):
        """
        Create a tutor, business profile, and student fixture for invoice tests.
        Authenticates the API client as the tutor user.

        영수증 테스트용 튜터, 사업자 프로필, 학생 fixture를 생성합니다.
        API 클라이언트는 해당 튜터 사용자로 인증합니다.
        """
        user_model = get_user_model()
        self.tutor = user_model.objects.create_user(
            username="invoice-tutor",
            email="invoice@example.com",
            password="password123",
            name="Invoice Tutor",
        )
        self.client.force_authenticate(self.tutor)

        self.profile = BusinessProfile.objects.create(
            tutor=self.tutor,
            manager_name="Invoice Tutor",
            street="Tutor Street 1",
            postcode="10115",
            city="Berlin",
            country="Deutschland",
            next_invoice_number=1005,
        )
        self.student = Student.objects.create(
            tutor=self.tutor,
            name="Max Mustermann",
            current_level="B1",
            target_level="B2",
            billing_name="Erika Mustermann",
            street="Student Street 2",
            postcode="50667",
            city="Koeln",
            country="Deutschland",
        )

    def build_payload(self, **overrides):
        """
        Build a baseline invoice payload and allow per-test overrides.

        기본 영수증 payload를 구성하고,
        각 테스트에서 필요한 값만 덮어쓸 수 있도록 합니다.
        """
        payload = {
            "student": self.student.id,
            "recipient_name": self.student.billing_name,
            "recipient_address": {
                "street": self.student.street,
                "zip": self.student.postcode,
                "city": self.student.city,
                "country": self.student.country,
            },
            "invoice_date": "2026-03-02",
            "delivery_date_start": "2026-03-01",
            "delivery_date_end": "2026-03-01",
            "due_date": "2026-03-10",
            "reference_number": "REF-100",
            "price_mode": "NETTO",
            "subject": "Rechnung",
            "header_text": "<p>Sehr geehrte Frau Mustermann,</p>",
            "footer_text": "Bitte bis [%ZAHLUNGSZIEL%] zahlen.",
            "items": [
                {
                    "description": "Unterricht Maerz",
                    "quantity": "2.00",
                    "unit": "HOUR",
                    "unit_price": "50.00",
                    "discount_value": "10.00",
                    "discount_unit": "PERCENT",
                    "vat_rate": "19.00",
                    "total_price": "9999.99",
                }
            ],
            "adjustments": [
                {
                    "label": "Fruehbucher",
                    "type": "DISCOUNT",
                    "value": "5.00",
                    "unit": "PERCENT",
                }
            ],
            "subtotal": "0.00",
            "vat_amount": "0.00",
            "total_amount": "0.00",
        }
        payload.update(overrides)
        return payload

    def create_draft(self, **payload_overrides):
        """
        Helper for creating a draft invoice through the API.

        API를 통해 임시저장 영수증을 생성하는 헬퍼 함수입니다.
        """
        response = self.client.post(
            "/api/invoices/save_draft/",
            self.build_payload(**payload_overrides),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def create_finalized(self, **payload_overrides):
        """
        Helper for creating a finalized invoice through the API.

        API를 통해 확정 영수증을 생성하는 헬퍼 함수입니다.
        """
        response = self.client.post(
            "/api/invoices/create_full/",
            self.build_payload(**payload_overrides),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_save_draft_creates_editable_invoice(self):
        """
        Ensure draft creation stores a non-finalized invoice with recalculated totals.

        임시저장 시 확정되지 않은 영수증이 생성되고,
        총액이 백엔드 기준으로 재계산되는지 검증합니다.
        """
        response = self.create_draft()

        invoice = Invoice.objects.get(pk=response.data["id"])

        self.assertFalse(invoice.is_finalized)
        self.assertEqual(invoice.invoice_number, 1005)
        self.assertEqual(invoice.recipient_address["city"], "Koeln")
        self.assertEqual(invoice.items.count(), 1)
        self.assertEqual(str(invoice.subtotal), "85.50")
        self.assertEqual(str(invoice.total_amount), "101.75")

    def test_save_draft_updates_existing_draft_and_recalculates_totals(self):
        """
        Ensure draft updates replace nested rows and recalculate totals.

        드래프트 수정 시 중첩 항목이 교체되고,
        총액이 다시 계산되는지 검증합니다.
        """
        draft_response = self.create_draft()

        update_response = self.client.post(
            "/api/invoices/save_draft/",
            self.build_payload(
                id=draft_response.data["id"],
                subject="Aktualisierte Rechnung",
                items=[
                    {
                        "description": "Unterricht April",
                        "quantity": "3.00",
                        "unit": "HOUR",
                        "unit_price": "40.00",
                        "discount_value": "0.00",
                        "discount_unit": "PERCENT",
                        "vat_rate": "19.00",
                        "total_price": "0.00",
                    }
                ],
                adjustments=[],
            ),
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        invoice = Invoice.objects.get(pk=draft_response.data["id"])
        self.assertEqual(invoice.subject, "Aktualisierte Rechnung")
        self.assertEqual(invoice.items.count(), 1)
        self.assertEqual(invoice.adjustments.count(), 0)
        self.assertEqual(str(invoice.subtotal), "120.00")
        self.assertEqual(str(invoice.total_amount), "142.80")

    def test_finalized_invoice_allows_sent_toggle_but_blocks_content_edits(self):
        """
        Ensure finalized invoices allow sent toggles only and reject content edits.

        확정 영수증은 발송 상태만 변경 가능하고,
        본문 수정은 차단되는지 검증합니다.
        """
        finalized_response = self.create_finalized()
        invoice_id = finalized_response.data["id"]

        sent_response = self.client.patch(
            f"/api/invoices/{invoice_id}/",
            {"is_sent": True},
            format="json",
        )
        self.assertEqual(sent_response.status_code, status.HTTP_200_OK)

        blocked_patch_response = self.client.patch(
            f"/api/invoices/{invoice_id}/",
            {"subject": "Manipulierte Rechnung"},
            format="json",
        )
        self.assertEqual(blocked_patch_response.status_code, status.HTTP_400_BAD_REQUEST)

        blocked_put_response = self.client.put(
            f"/api/invoices/{invoice_id}/",
            self.build_payload(subject="Neue Vollrechnung"),
            format="json",
        )
        self.assertEqual(blocked_put_response.status_code, status.HTTP_400_BAD_REQUEST)

        invoice = Invoice.objects.get(pk=invoice_id)
        self.assertTrue(invoice.is_finalized)
        self.assertTrue(invoice.is_sent)
        self.assertEqual(invoice.subject, "Rechnung")

    def test_destroy_allows_draft_deletion_and_blocks_finalized_deletion(self):
        """
        Ensure only draft invoices can be deleted through the API.

        API를 통해 임시저장 영수증만 삭제 가능하고,
        확정 영수증은 삭제가 차단되는지 검증합니다.
        """
        draft_response = self.create_draft()
        finalized_response = self.create_finalized(reference_number="REF-200")

        draft_delete_response = self.client.delete(
            f"/api/invoices/{draft_response.data['id']}/"
        )
        self.assertEqual(draft_delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Invoice.objects.filter(pk=draft_response.data["id"]).exists())

        finalized_delete_response = self.client.delete(
            f"/api/invoices/{finalized_response.data['id']}/"
        )
        self.assertEqual(
            finalized_delete_response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertTrue(Invoice.objects.filter(pk=finalized_response.data["id"]).exists())

    def test_deleting_a_draft_resequences_following_drafts_and_next_number(self):
        """
        Ensure deleting a middle draft pulls later draft numbers forward and updates
        the next available invoice number.

        중간 드래프트를 삭제하면 뒤의 드래프트 번호가 앞으로 당겨지고,
        다음 사용 가능한 영수증 번호도 함께 갱신되는지 검증합니다.
        """
        first_draft = self.create_draft(reference_number="REF-100")
        second_draft = self.create_draft(reference_number="REF-200")
        third_draft = self.create_draft(reference_number="REF-300")

        self.assertEqual(first_draft.data["invoice_number"], 1005)
        self.assertEqual(second_draft.data["invoice_number"], 1006)
        self.assertEqual(third_draft.data["invoice_number"], 1007)

        delete_response = self.client.delete(
            f"/api/invoices/{second_draft.data['id']}/"
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        remaining_first = Invoice.objects.get(pk=first_draft.data["id"])
        remaining_third = Invoice.objects.get(pk=third_draft.data["id"])

        self.assertEqual(remaining_first.invoice_number, 1005)
        self.assertEqual(remaining_third.invoice_number, 1006)

        next_number_response = self.client.get("/api/invoices/next_number/")
        self.assertEqual(next_number_response.status_code, status.HTTP_200_OK)
        self.assertEqual(next_number_response.data["sequence"], 1007)

    def test_deleted_draft_number_is_reused_for_the_next_new_draft(self):
        """
        Ensure a deleted draft number becomes available again for the next new draft.

        삭제된 드래프트 번호가 다음 새 드래프트 생성 시 다시 재사용되는지 검증합니다.
        """
        first_draft = self.create_draft(reference_number="REF-100")
        self.assertEqual(first_draft.data["invoice_number"], 1005)

        delete_response = self.client.delete(
            f"/api/invoices/{first_draft.data['id']}/"
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        new_draft = self.create_draft(reference_number="REF-101")
        self.assertEqual(new_draft.data["invoice_number"], 1005)

    def test_finalizing_a_draft_keeps_its_reserved_invoice_number(self):
        """
        Ensure a saved draft keeps the same invoice number when it is finalized.

        임시저장된 드래프트가 확정될 때 기존에 예약된 영수증 번호를 유지하는지 검증합니다.
        """
        draft_response = self.create_draft(reference_number="REF-100")

        finalize_response = self.client.post(
            "/api/invoices/create_full/",
            self.build_payload(
                id=draft_response.data["id"],
                reference_number="REF-100",
            ),
            format="json",
        )

        self.assertEqual(finalize_response.status_code, status.HTTP_200_OK)

        invoice = Invoice.objects.get(pk=draft_response.data["id"])
        self.assertTrue(invoice.is_finalized)
        self.assertEqual(invoice.invoice_number, 1005)

        next_number_response = self.client.get("/api/invoices/next_number/")
        self.assertEqual(next_number_response.status_code, status.HTTP_200_OK)
        self.assertEqual(next_number_response.data["sequence"], 1006)

    def test_download_pdf_blocks_drafts(self):
        """
        Ensure draft invoices cannot be opened as PDFs.

        임시저장 영수증은 PDF로 열 수 없는지 검증합니다.
        """
        draft_response = self.create_draft()

        response = self.client.get(
            f"/api/invoices/{draft_response.data['id']}/download_pdf/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("tutor.views.HTML")
    def test_download_pdf_allows_finalized_invoices(self, html_class_mock):
        """
        Ensure finalized invoices can render a PDF response.

        확정 영수증은 PDF 응답을 정상적으로 반환하는지 검증합니다.
        """
        html_class_mock.return_value.write_pdf.return_value = b"%PDF-1.4 test"
        finalized_response = self.create_finalized(reference_number="REF-300")

        response = self.client.get(
            f"/api/invoices/{finalized_response.data['id']}/download_pdf/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(response.content, b"%PDF-1.4 test")
