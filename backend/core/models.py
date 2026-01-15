from django.db import models


# =========================
# BASE
# =========================
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


# =========================
# STUDENT
# =========================
class Student(TimeStampedModel):
    name = models.CharField(max_length=100)
    birth = models.DateField(null=True, blank=True)
    level = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    img = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'student'


# =========================
# TEACHER
# =========================
class Teacher(TimeStampedModel):
    TUTOR = 'tutor'
    TEACHER = 'teacher'

    LABEL_CHOICES = [
        (TUTOR, 'Tutor'),
        (TEACHER, 'Teacher'),
    ]

    name = models.CharField(max_length=100)
    bio = models.TextField(blank=True, null=True)
    birth = models.DateField(null=True, blank=True)
    label = models.CharField(max_length=10, choices=LABEL_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    img = models.CharField(max_length=255, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    class Meta:
        db_table = 'teacher'


# =========================
# SUBJECT
# =========================
class Subject(TimeStampedModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'subject'


# =========================
# CLASS (LỚP HỌC)
# =========================
class Class(TimeStampedModel):
    ONLINE = 'online'
    OFFLINE = 'offline'

    TYPE_CHOICES = [
        (ONLINE, 'Online'),
        (OFFLINE, 'Offline'),
    ]

    ACTIVE = 'active'
    INACTIVE = 'inactive'
    COMPLETED = 'completed'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (INACTIVE, 'Inactive'),
        (COMPLETED, 'Completed'),
    ]

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE
    )

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    level = models.CharField(max_length=50, blank=True)
    max_students = models.PositiveIntegerField(default=30)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=ACTIVE
    )

    class Meta:
        db_table = 'class'


# =========================
# IN_CLASS (N-N)
# =========================
class InClass(models.Model):
    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        db_column='class_id'
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE
    )

    class Meta:
        db_table = 'in_class'
        unique_together = ('class_obj', 'student')


# =========================
# TIME_SLOT
# =========================
class TimeSlot(TimeStampedModel):
    AVAILABLE = 'available'
    BOOKED = 'booked'
    EXPIRED = 'expired'

    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (BOOKED, 'Booked'),
        (EXPIRED, 'Expired'),
    ]

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=AVAILABLE
    )

    class Meta:
        db_table = 'time_slot'


# =========================
# BOOKING
# =========================
class Booking(TimeStampedModel):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (CONFIRMED, 'Confirmed'),
        (CANCELLED, 'Cancelled'),
    ]

    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE
    )

    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        db_column='class_id'
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=PENDING
    )

    class Meta:
        db_table = 'booking'


# =========================
# SCHEDULE
# =========================
class Schedule(TimeStampedModel):
    ACTIVE = 'active'
    INACTIVE = 'inactive'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (INACTIVE, 'Inactive'),
    ]

    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        db_column='class_id'
    )

    day_of_week = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=ACTIVE
    )

    class Meta:
        db_table = 'schedule'


# =========================
# SESSION
# =========================
class Session(TimeStampedModel):
    UPCOMING = 'upcoming'
    ONGOING = 'ongoing'
    FINISHED = 'finished'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (UPCOMING, 'Upcoming'),
        (ONGOING, 'Ongoing'),
        (FINISHED, 'Finished'),
        (CANCELLED, 'Cancelled'),
    ]

    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        db_column='class_id'
    )

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=UPCOMING
    )

    class Meta:
        db_table = 'session'


# =========================
# ROOM
# =========================
class Room(TimeStampedModel):
    session = models.OneToOneField(
        Session,
        on_delete=models.CASCADE
    )

    room_code = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'room'
