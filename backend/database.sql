-- student
- id
- name
- birth
- level
- phone
- email
- password
- img
- created_at

-- teacher
- id
- name
- bio
- birth
- label (tutor, teacher)
- phone
- email
- password
- img
- rating
- created_at

-- time_slot (thời gian rảnh của tutor)
- id
- teacher_id
- start_at
- end_at
- status (available / booked / expired)
- created_at

-- booking
- id
- time_slot_id
- student_id
- class_id
- status (pending / confirmed / cancelled)
- created_at

-- room
- id
- session_id
- room_code
- created_at

-- subject
- id
- name
- description
- created_at

-- class
- id
- subject_id
- type
- level
- description
- status
- created_at
- teacher_id

-- in_class
- class_id
- student_id

-- schedule (lịch học cố định của teacher)
- id
- class_id
- day_of_week (1-7)
- start_time
- end_time
- status
- created_at

-- session (nếu là teacher thì cố định sinh từ schedule, nếu là tutor thì sinh từ booking)
- id
- class_id
- teacher_id
- booking_id (nullable)
- start_at
- end_at
- status (upcoming / ongoing / finished / cancelled)
- created_at

time_slot → booking → session → room
schedule → session → room