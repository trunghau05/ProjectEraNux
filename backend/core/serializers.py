from rest_framework import serializers
from django.contrib.auth.hashers import check_password, make_password
from .models import *

# =========================
# STUDENT
# =========================
class StudentSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
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
    password = serializers.CharField(write_only=True)
    
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
    enrolled_students = serializers.IntegerField(read_only=True)

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


class ClassRegistrationSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class ClassRegistrationResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    class_status = serializers.CharField()
    enrolled_students = serializers.IntegerField()
    created_session_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    reused_session_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )


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

    def validate(self, attrs):
        teacher = attrs.get('teacher', getattr(self.instance, 'teacher', None))
        time_slot = attrs.get('time_slot', getattr(self.instance, 'time_slot', None))

        if teacher and time_slot and time_slot.teacher_id != teacher.id:
            raise serializers.ValidationError({'teacher': 'Teacher must match the selected time slot owner.'})

        return attrs


class BookingDetailSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)
    teacher = TeacherSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'


class BookedTimeSlotSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    id = serializers.IntegerField()
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    status = serializers.CharField()
    booking_status = serializers.CharField()


class TutorBookedStudentSerializer(serializers.Serializer):
    student = StudentSerializer(read_only=True)
    time_slots = BookedTimeSlotSerializer(many=True)


# =========================
# SCHEDULE
# =========================
class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'

    def validate(self, attrs):
        day_of_week = attrs.get('day_of_week', getattr(self.instance, 'day_of_week', None))
        repeat = attrs.get('repeat', getattr(self.instance, 'repeat', 1))
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))

        if day_of_week is None or day_of_week < 0 or day_of_week > 6:
            raise serializers.ValidationError({'day_of_week': 'day_of_week must be in range 0..6 (0=Monday).'})

        if not start_date:
            raise serializers.ValidationError({'start_date': 'start_date is required.'})

        if repeat is None or repeat < 1:
            raise serializers.ValidationError({'repeat': 'repeat must be greater than or equal to 1.'})

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'end_time must be after start_time.'})

        return attrs


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

    def validate(self, attrs):
        class_obj = attrs.get('class_obj', getattr(self.instance, 'class_obj', None))
        time_slot = attrs.get('time_slot', getattr(self.instance, 'time_slot', None))
        student = attrs.get('student', getattr(self.instance, 'student', None))

        if class_obj is not None:
            if student is not None:
                raise serializers.ValidationError({'student': 'Class-based session must not store student.'})
            if time_slot is not None:
                raise serializers.ValidationError({'time_slot': 'Class-based session must not store time_slot.'})
        else:
            if time_slot is not None and student is None:
                raise serializers.ValidationError({'student': 'Booking session with time_slot must include student.'})

        return attrs


class SessionDetailSerializer(serializers.ModelSerializer):
    class_obj = ClassDetailSerializer(read_only=True)
    teacher = TeacherSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)
    student = StudentSerializer(read_only=True)

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
# FEE
# =========================
class FeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fee
        fields = '__all__'


class FeeDetailSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    class_obj = ClassSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)

    class Meta:
        model = Fee
        fields = '__all__'


# =========================
# PAYMENT
# =========================
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class PaymentDetailSerializer(serializers.ModelSerializer):
    session = SessionDetailSerializer(read_only=True)
    teacher = TeacherSerializer(read_only=True)

    class Meta:
        model = Payment
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
            password_valid = self._check_and_upgrade_password(student, raw_password)
            if password_valid:
                return {
                    'id': student.id,
                    'role': 'student',
                    'name': student.name,
                    'email': student.email,
                    'message': 'Login successful',
                    'success': True
                }
            else:
                raise serializers.ValidationError({
                    'password': 'Incorrect password',
                    'success': False
                })

        # 2. check teacher / tutor
        teacher = Teacher.objects.filter(email=email).first()
        if teacher:
            password_valid = self._check_and_upgrade_password(teacher, raw_password)
            if password_valid:
                return {
                    'id': teacher.id,
                    'role': teacher.role,
                    'name': teacher.name,
                    'email': teacher.email,
                    'message': 'Login successful',
                    'success': True
                }
            else:
                raise serializers.ValidationError({
                    'password': 'Incorrect password',
                    'success': False
                })

        # No user found with this email
        raise serializers.ValidationError({
            'email': 'Email not found in the system',
            'success': False
        })

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


class UploadRecordingRequestSerializer(serializers.Serializer):
    file = serializers.FileField()
    roomId = serializers.CharField(required=False, allow_blank=True)
    userId = serializers.CharField(required=False, allow_blank=True)


class UploadRecordingResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    secure_url = serializers.URLField(required=False, allow_null=True)
    public_id = serializers.CharField(required=False, allow_null=True)
    session_id = serializers.IntegerField(required=False, allow_null=True)
    duration = serializers.FloatField(required=False, allow_null=True)
    bytes = serializers.IntegerField(required=False, allow_null=True)
    format = serializers.CharField(required=False, allow_blank=True, allow_null=True)