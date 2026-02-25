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

    ROLE_CHOICES = [
        (TUTOR, 'Tutor'),
        (TEACHER, 'Teacher'),
    ]

    name = models.CharField(max_length=100)
    bio = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    img = models.CharField(max_length=255, blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, null=True)

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
# CLASS 
# =========================
class Class(TimeStampedModel):
    OPEN = 'open'
    CLOSED = 'closed'
    COMPLETE = 'complete'
    FULL = 'full'

    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (CLOSED, 'Closed'),
        (COMPLETE, 'Complete'),
        (FULL, 'Full'),
    ]

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE
    )

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    level = models.CharField(max_length=50, blank=True)
    max_students = models.PositiveIntegerField(default=30)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=OPEN
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

    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (BOOKED, 'Booked'),
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

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE
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
        db_column='class_id',
        null=True,
        blank=True
    )

    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=UPCOMING
    )

    recording_url = models.TextField(blank=True, null=True)
    recording_public_id = models.CharField(max_length=255, blank=True, null=True)
    recording_uploaded_at = models.DateTimeField(blank=True, null=True)

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


# =========================
# FEE
# =========================
class Fee(TimeStampedModel):
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        db_column='class_id',
        null=True,
        blank=True
    )

    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'fee'
        constraints = [
            models.UniqueConstraint(
                fields=['teacher', 'class_obj'],
                condition=models.Q(time_slot__isnull=True),
                name='unique_teacher_class_fee'
            ),
            models.UniqueConstraint(
                fields=['teacher', 'time_slot'],
                condition=models.Q(class_obj__isnull=True),
                name='unique_teacher_timeslot_fee'
            ),
        ]


# =========================
# PAYMENT
# =========================
class Payment(TimeStampedModel):
    PENDING = 'pending'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE
    )

    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    period = models.CharField(max_length=10)  # YYYY-MM format
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=PENDING
    )
    paid_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'payment'
        unique_together = ('teacher', 'period')
