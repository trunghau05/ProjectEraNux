from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_session_recording_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='schedule',
            name='repeat',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='schedule',
            name='start_date',
            field=models.DateField(default='2026-01-01'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='schedule',
            name='day_of_week',
            field=models.PositiveSmallIntegerField(
                choices=[
                    (0, 'Monday'),
                    (1, 'Tuesday'),
                    (2, 'Wednesday'),
                    (3, 'Thursday'),
                    (4, 'Friday'),
                    (5, 'Saturday'),
                    (6, 'Sunday'),
                ]
            ),
        ),
    ]
