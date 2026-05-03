from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
	list_display = ('id', 'role', 'student_id', 'teacher_id', 'title', 'is_read', 'created_at')
	list_filter = ('role', 'is_read')
	search_fields = ('title', 'message')
