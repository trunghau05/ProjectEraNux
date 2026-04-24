# Generated migration for adding recording_audio_url field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_schedule_recurrence_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='recording_audio_url',
            field=models.TextField(blank=True, null=True),
        ),
    ]
