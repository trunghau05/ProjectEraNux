use eranux;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SUBJECT
-- =====================================================
INSERT INTO subject (id, name, description, created_at) VALUES
(1,'Mathematics','Fundamental mathematics including algebra, geometry, and calculus',NOW()),
(2,'English','English language learning and communication skills',NOW()),
(3,'Physics','Physics fundamentals covering mechanics, thermodynamics, and waves',NOW()),
(4,'Chemistry','Chemistry basics including elements, reactions, and compounds',NOW()),
(5,'Biology','Biology study of living organisms and biological systems',NOW()),
(6,'History','World history and historical events',NOW()),
(7,'Geography','Geography and world cultures',NOW()),
(8,'Computer Science','Programming and computer science fundamentals',NOW());

-- =====================================================
-- STUDENT (10)
-- =====================================================
INSERT INTO student (id,name,email,phone,password,created_at) VALUES
(1,'Alice Johnson','alice.johnson@example.com','0901234567','hashing123',NOW()),
(2,'Bob Smith','bob.smith@example.com','0902345678','hashing123',NOW()),
(3,'Carol White','carol.white@example.com','0903456789','hashing123',NOW()),
(4,'David Brown','david.brown@example.com','0904567890','hashing123',NOW()),
(5,'Emma Davis','emma.davis@example.com','0905678901','hashing123',NOW()),
(6,'Frank Miller','frank.miller@example.com','0906789012','hashing123',NOW()),
(7,'Grace Wilson','grace.wilson@example.com','0907890123','hashing123',NOW()),
(8,'Henry Moore','henry.moore@example.com','0908901234','hashing123',NOW()),
(9,'Ivy Taylor','ivy.taylor@example.com','0909012345','hashing123',NOW()),
(10,'Jack Anderson','jack.anderson@example.com','0910123456','hashing123',NOW());

-- =====================================================
-- TEACHER (8)
-- =====================================================
INSERT INTO teacher (id,name,email,phone,role,bio,password,rating,created_at) VALUES
(1,'Dr. Mark Thompson','mark.thompson@example.com','0911234567','teacher','Expert in Mathematics with 15 years of experience','hashing123',4.80,NOW()),
(2,'Prof. Sarah Chen','sarah.chen@example.com','0912345678','teacher','Specialized in English Language Teaching','hashing123',4.70,NOW()),
(3,'Dr. James Wilson','james.wilson@example.com','0913456789','teacher','Physics professor with research background','hashing123',4.60,NOW()),
(4,'Prof. Lisa Rodriguez','lisa.rodriguez@example.com','0914567890','teacher','Chemistry educator and lab specialist','hashing123',4.50,NOW()),
(5,'Dr. Michael Chang','michael.chang@example.com','0915678901','tutor','Biology tutor and naturalist','hashing123',4.40,NOW()),
(6,'Prof. Jennifer Lee','jennifer.lee@example.com','0916789012','tutor','History and culture enthusiast','hashing123',4.30,NOW()),
(7,'Dr. Robert King','robert.king@example.com','0917890123','teacher','Geography and environmental studies','hashing123',4.60,NOW()),
(8,'Prof. Amanda Scott','amanda.scott@example.com','0918901234','teacher','Computer Science and Programming expert','hashing123',4.90,NOW());

-- =====================================================
-- CLASS (8)
-- =====================================================
INSERT INTO class
(id, subject_id, teacher_id, level, max_students, description, status, created_at)
VALUES
(1,1,1,'Beginner',30,'Algebra and basic calculus','open',NOW()),
(2,1,1,'Advanced',20,'Advanced mathematics and theory','open',NOW()),
(3,2,2,'Beginner',25,'English conversation basics','open',NOW()),
(4,2,2,'Intermediate',22,'Business English','full',NOW()),
(5,3,3,'Beginner',25,'Physics fundamentals','open',NOW()),
(6,4,4,'Beginner',25,'Chemistry basics','closed',NOW()),
(7,5,5,'Beginner',28,'Introduction to Biology','open',NOW()),
(8,8,8,'Beginner',20,'Python Programming 101','open',NOW());

-- =====================================================
-- IN_CLASS (mỗi student 2–4 class)
-- =====================================================
INSERT INTO in_class (student_id,class_id) VALUES
(1,1),(1,3),(1,5),
(2,1),(2,2),(2,4),
(3,3),(3,5),
(4,6),(4,7),
(5,1),(5,8),
(6,2),(6,3),
(7,4),(7,5),
(8,6),(8,8),
(9,7),(9,1),
(10,3),(10,4);

-- =====================================================
-- TIME_SLOT (30 ngày, mỗi GV nhiều slot)
-- =====================================================
INSERT INTO time_slot
(id, teacher_id, start_at, end_at, status, created_at)
VALUES
(1,5,'2026-01-21 09:00:00','2026-01-21 10:00:00','available',NOW()),
(2,5,'2026-01-21 11:00:00','2026-01-21 12:00:00','available',NOW()),
(3,5,'2026-01-23 14:00:00','2026-01-23 15:00:00','available',NOW()),
(4,6,'2026-01-22 09:00:00','2026-01-22 10:00:00','available',NOW()),
(5,6,'2026-01-22 11:00:00','2026-01-22 12:00:00','available',NOW()),
(6,6,'2026-01-24 14:00:00','2026-01-24 15:00:00','available',NOW()),
(7,7,'2026-01-23 09:00:00','2026-01-23 10:00:00','available',NOW()),
(8,8,'2026-01-24 16:00:00','2026-01-24 17:00:00','available',NOW());

-- =====================================================
-- BOOKING
-- =====================================================
INSERT INTO booking
(id, teacher_id, time_slot_id, student_id, status, created_at)
VALUES
(1,5,1,1,'confirmed',NOW()),
(2,5,2,2,'pending',NOW()),
(3,6,4,3,'cancelled',NOW()),
(4,6,5,4,'confirmed',NOW()),
(5,7,7,5,'confirmed',NOW());

UPDATE time_slot SET status='booked' WHERE id IN (1,4,5,7);

-- =====================================================
-- SCHEDULE (Mon–Fri cho mỗi class)
-- =====================================================
INSERT INTO schedule
(class_id, day_of_week, start_time, end_time, status, created_at)
VALUES
(1,0,'09:00:00','10:00:00','active',NOW()),
(1,2,'14:00:00','15:00:00','active',NOW()),
(2,1,'10:00:00','11:00:00','active',NOW()),
(3,3,'09:00:00','10:00:00','active',NOW()),
(4,4,'15:00:00','16:00:00','active',NOW()),
(5,0,'08:00:00','09:00:00','active',NOW()),
(6,2,'16:00:00','17:00:00','active',NOW()),
(7,3,'14:00:00','15:00:00','active',NOW()),
(8,1,'09:00:00','10:00:00','active',NOW());

-- =====================================================
-- SESSION (booking + class)
-- =====================================================
INSERT INTO session
(id, class_id, time_slot_id, student_id, teacher_id, start_at, end_at, status, created_at)
VALUES
(1,NULL,1,1,5,'2026-01-21 09:00:00','2026-01-21 10:00:00','upcoming',NOW()),
(2,NULL,4,4,6,'2026-01-22 09:00:00','2026-01-22 10:00:00','finished',NOW()),
(3,1,NULL,NULL,1,'2026-01-22 09:00:00','2026-01-22 10:00:00','ongoing',NOW()),
(4,1,NULL,NULL,1,'2026-01-29 09:00:00','2026-01-29 10:00:00','upcoming',NOW()),
(5,3,NULL,NULL,2,'2026-01-23 09:00:00','2026-01-23 10:00:00','finished',NOW());

-- =====================================================
-- ROOM
-- =====================================================
INSERT INTO room (session_id, room_code, created_at) VALUES
(1,'AB12CD34',NOW()),
(2,'EF56GH78',NOW()),
(3,'ZX90PQ12',NOW()),
(4,'LM34NO56',NOW()),
(5,'RT78UV90',NOW());

-- =====================================================
-- FEE
-- =====================================================
INSERT INTO fee (teacher_id, class_id, time_slot_id, amount, created_at) VALUES
(1,1,NULL,300,NOW()),
(1,2,NULL,450,NOW()),
(2,3,NULL,280,NOW()),
(3,5,NULL,320,NOW()),
(5,NULL,1,120,NOW()),
(6,NULL,4,150,NOW()),
(7,NULL,7,180,NOW());

-- =====================================================
-- PAYMENT
-- =====================================================
INSERT INTO payment (session_id, teacher_id, amount, period, status, paid_date, created_at) VALUES
(1,5,500,'2026-01','completed',NOW(),NOW()),
(2,6,450,'2026-01','pending',NULL,NOW()),
(3,1,800,'2026-01','completed',NOW(),NOW()),
(4,1,750,'2026-02','pending',NULL,NOW());

SET FOREIGN_KEY_CHECKS = 1;