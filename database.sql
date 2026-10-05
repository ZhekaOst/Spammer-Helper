SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS spammer_helper CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE spammer_helper;

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO contacts (last_name, first_name, middle_name, email) VALUES
('Іваненко', 'Іван', 'Іванович', 'ivan@example.com'),
('Петренко', 'Петро', 'Петрович', 'petro@example.com'),
('Сидоренко', 'Олена', 'Василівна', 'olena@example.com'),
('Коваленко', 'Марія', 'Андріївна', 'maria@example.com'),
('Бондаренко', 'Андрій', 'Михайлович', 'andriy@example.com');
