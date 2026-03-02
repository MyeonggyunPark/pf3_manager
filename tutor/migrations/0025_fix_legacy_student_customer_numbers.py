from django.db import migrations


def fix_legacy_customer_numbers(apps, schema_editor):
    Student = apps.get_model("tutor", "Student")

    for student in Student.objects.all().only("id", "customer_number"):
        legacy_value = f"KD-{student.id}"
        corrected_value = f"KD-{1000 + student.id}"

        if not student.customer_number or student.customer_number == legacy_value:
            Student.objects.filter(pk=student.pk).update(
                customer_number=corrected_value
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tutor", "0024_invoice_invoice_date_invoice_is_finalized_and_more"),
    ]

    operations = [
        migrations.RunPython(fix_legacy_customer_numbers, noop_reverse),
    ]
