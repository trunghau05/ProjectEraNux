from rest_framework import serializers
from .models import *

# =========================
# STUDENT
# =========================
class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


# =========================
# TEACHER
# =========================
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


# =========================
# SUBJECT
# =========================
class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


# =========================
# CLASS
# =========================
class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = '__all__'


# ----- Class (READ – EXPANDED) -----
class ClassDetailSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    teacher = TeacherSerializer(read_only=True)

    class Meta:
        model = Class
        fields = '__all__'


# =========================
# IN_CLASS (N-N)
# =========================
class InClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = InClass
        fields = '__all__'


class InClassDetailSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    class_obj = ClassSerializer(read_only=True)

    class Meta:
        model = InClass
        fields = '__all__'


# =========================
# TIME_SLOT
# =========================
class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = '__all__'


class TimeSlotDetailSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)

    class Meta:
        model = TimeSlot
        fields = '__all__'


# =========================
# BOOKING
# =========================
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'


class BookingDetailSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)
    class_obj = ClassSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'


# =========================
# SCHEDULE
# =========================
class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'


class ScheduleDetailSerializer(serializers.ModelSerializer):
    class_obj = ClassSerializer(read_only=True)

    class Meta:
        model = Schedule
        fields = '__all__'


# =========================
# SESSION
# =========================
class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'


class SessionDetailSerializer(serializers.ModelSerializer):
    class_obj = ClassSerializer(read_only=True)
    teacher = TeacherSerializer(read_only=True)
    booking = BookingSerializer(read_only=True)

    class Meta:
        model = Session
        fields = '__all__'


# =========================
# ROOM
# =========================
class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class RoomDetailSerializer(serializers.ModelSerializer):
    session = SessionDetailSerializer(read_only=True)

    class Meta:
        model = Room
        fields = '__all__'
