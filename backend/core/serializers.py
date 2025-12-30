from rest_framework import serializers
from django.contrib.auth.hashers import check_password, make_password
from .models import *

# =========================
# STUDENT
# =========================
class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

    def create(self, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)


# =========================
# TEACHER
# =========================
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'

    def create(self, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)


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

# =========================
# LOGIN
# =========================
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs['email']
        raw_password = attrs['password']

        # 1. check student
        student = Student.objects.filter(email=email).first()
        if student:
            if self._check_and_upgrade_password(student, raw_password):
                return {
                    'id': student.id,
                    'role': 'student'
                }

        # 2. check teacher / tutor
        teacher = Teacher.objects.filter(email=email).first()
        if teacher:
            if self._check_and_upgrade_password(teacher, raw_password):
                return {
                    'id': teacher.id,
                    'role': teacher.label
                }

        raise serializers.ValidationError('Invalid email or password')

    def _check_and_upgrade_password(self, user, raw_password):
        stored_password = user.password

        # Case 1: password hashed
        if stored_password.startswith('pbkdf2_'):
            return check_password(raw_password, stored_password)

        # Case 2: password no hash (legacy)
        if raw_password == stored_password:
            user.password = make_password(raw_password)
            user.save(update_fields=['password'])
            return True

        return False