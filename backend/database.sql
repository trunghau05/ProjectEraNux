-- =========================
-- DATABASE
-- =========================
CREATE DATABASE IF NOT EXISTS eranux
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE eranux;

-- =========================
-- STUDENT
-- =========================
CREATE TABLE student (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    birth DATE,
    level VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    img VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- TEACHER
-- =========================
CREATE TABLE teacher (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    birth DATE,
    label ENUM('tutor', 'teacher') NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    img VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- SUBJECT
-- =========================
CREATE TABLE subject (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- CLASS
-- =========================
CREATE TABLE class (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    type ENUM('online', 'offline') NOT NULL,
    level VARCHAR(50),
    description TEXT,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subject_id) REFERENCES subject(id),
    FOREIGN KEY (teacher_id) REFERENCES teacher(id)
) ENGINE=InnoDB;

-- =========================
-- IN_CLASS (many-to-many)
-- =========================
CREATE TABLE in_class (
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    PRIMARY KEY (class_id, student_id),
    FOREIGN KEY (class_id) REFERENCES `class`(id),
    FOREIGN KEY (student_id) REFERENCES student(id)
) ENGINE=InnoDB;

-- =========================
-- TIME_SLOT (Tutor)
-- =========================
CREATE TABLE time_slot (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status ENUM('available', 'booked', 'expired') DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (teacher_id) REFERENCES teacher(id)
) ENGINE=InnoDB;

-- =========================
-- BOOKING
-- =========================
CREATE TABLE booking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    time_slot_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    class_id BIGINT NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (time_slot_id) REFERENCES time_slot(id),
    FOREIGN KEY (student_id) REFERENCES student(id),
    FOREIGN KEY (class_id) REFERENCES `class`(id)
) ENGINE=InnoDB;

-- =========================
-- SCHEDULE (Teacher fixed)
-- =========================
CREATE TABLE schedule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT NOT NULL,
    day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (class_id) REFERENCES `class`(id)
) ENGINE=InnoDB;

-- =========================
-- SESSION
-- =========================
CREATE TABLE session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    booking_id BIGINT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status ENUM('upcoming', 'ongoing', 'finished', 'cancelled') DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (class_id) REFERENCES `class`(id),
    FOREIGN KEY (teacher_id) REFERENCES teacher(id),
    FOREIGN KEY (booking_id) REFERENCES booking(id)
) ENGINE=InnoDB;

-- =========================
-- ROOM
-- =========================
CREATE TABLE room (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    room_code VARCHAR(100) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES session(id)
) ENGINE=InnoDB;
