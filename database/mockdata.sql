BEGIN;

-- 1. Insert Users (Password hash is a placeholder 'hash123')
-- 1. Insert Users with the provided bcrypt hash
-- This hash corresponds to the password you generated (likely 'password' or similar)
INSERT INTO users (name, email, password_hash, role, avatar) VALUES 
('Alice Manager', 'alice@gearguard.com', '$2a$10$vwPA8UIWZWgblw0LMZPSQeoVKMXtZo0RDahbWRw41eRm5VWxSHZI6', 'manager', 'https://i.pravatar.cc/150?u=alice'),
('Bob Technician', 'bob@gearguard.com', '$2a$10$vwPA8UIWZWgblw0LMZPSQeoVKMXtZo0RDahbWRw41eRm5VWxSHZI6', 'technician', 'https://i.pravatar.cc/150?u=bob'),
('Charlie Electrician', 'charlie@gearguard.com', '$2a$10$vwPA8UIWZWgblw0LMZPSQeoVKMXtZo0RDahbWRw41eRm5VWxSHZI6', 'technician', 'https://i.pravatar.cc/150?u=charlie'),
('David IT', 'david@gearguard.com', '$2a$10$vwPA8UIWZWgblw0LMZPSQeoVKMXtZo0RDahbWRw41eRm5VWxSHZI6', 'technician', 'https://i.pravatar.cc/150?u=david'),
('Eve Employee', 'eve@gearguard.com', '$2a$10$vwPA8UIWZWgblw0LMZPSQeoVKMXtZo0RDahbWRw41eRm5VWxSHZI6', 'user', 'https://i.pravatar.cc/150?u=eve');
-- 2. Link Technicians to Teams (Assumes Team IDs: 1=Mechanics, 2=Electricians, 3=IT Support)
-- Bob -> Mechanics (Team 1)
INSERT INTO team_members (team_id, user_id) VALUES 
(1, (SELECT id FROM users WHERE email = 'bob@gearguard.com')),
-- Charlie -> Electricians (Team 2)
(2, (SELECT id FROM users WHERE email = 'charlie@gearguard.com')),
-- David -> IT Support (Team 3)
(3, (SELECT id FROM users WHERE email = 'david@gearguard.com'));

-- 3. Insert Equipment
-- Note: We link to Teams and Default Technicians for auto-fill logic testing
INSERT INTO equipment (
    name, serial_number, category, department_id, team_id, default_technician_id, location, purchase_date, warranty_expiry, status, notes
) VALUES 
-- Mechanical Asset (Production)
('CNC Lathe X1', 'MCH-2023-001', 'machine', 
    (SELECT id FROM departments WHERE name = 'Production'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'), 
    (SELECT id FROM users WHERE email = 'bob@gearguard.com'),
    'Floor 1, Zone A', '2023-01-15', '2025-01-15', 'active', 'High precision machine'),

-- Electrical Asset (Maintenance)
('Main Generator', 'GEN-2022-88', 'machine', 
    (SELECT id FROM departments WHERE name = 'Maintenance'), 
    (SELECT id FROM teams WHERE name = 'Electricians'), 
    (SELECT id FROM users WHERE email = 'charlie@gearguard.com'),
    'Basement Utility Room', '2022-05-20', '2027-05-20', 'maintenance', 'Requires monthly check'),

-- IT Asset (IT Department)
('Server Rack Alpha', 'SRV-099-TX', 'computer', 
    (SELECT id FROM departments WHERE name = 'IT'), 
    (SELECT id FROM teams WHERE name = 'IT Support'), 
    (SELECT id FROM users WHERE email = 'david@gearguard.com'),
    'Server Room B', '2024-02-10', '2026-02-10', 'active', 'Primary database server'),

-- Vehicle (Logistics)
('Forklift Model Z', 'VH-FL-55', 'vehicle', 
    (SELECT id FROM departments WHERE name = 'Logistics'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'), 
    (SELECT id FROM users WHERE email = 'bob@gearguard.com'),
    'Warehouse Dock 4', '2021-11-01', '2024-11-01', 'active', 'Hydraulics slightly slow'),

-- Scrapped Asset (Production)
('Old Conveyor Belt', 'CNV-OLD-01', 'machine', 
    (SELECT id FROM departments WHERE name = 'Production'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'), 
    NULL,
    'Scrap Yard', '2015-01-01', '2016-01-01', 'scrapped', 'Beyond repair');

-- 4. Insert Maintenance Requests
INSERT INTO requests (
    subject, description, type, equipment_id, team_id, assigned_to, stage, priority, scheduled_date, created_by, duration
) VALUES 
-- 1. Preventive (Scheduled Future) - Calendar View Test
('Monthly Oil Change', 'Routine oil change and filter replacement', 'preventive', 
    (SELECT id FROM equipment WHERE serial_number = 'MCH-2023-001'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'),
    (SELECT id FROM users WHERE email = 'bob@gearguard.com'),
    'new', 'medium', CURRENT_DATE + INTERVAL '5 days', 
    (SELECT id FROM users WHERE email = 'alice@gearguard.com'), 0),

-- 2. Corrective (Overdue) - Kanban "Red Badge" Test
('Server Overheating', 'Fans making loud noise, temp alert triggered', 'corrective', 
    (SELECT id FROM equipment WHERE serial_number = 'SRV-099-TX'), 
    (SELECT id FROM teams WHERE name = 'IT Support'),
    (SELECT id FROM users WHERE email = 'david@gearguard.com'),
    'in_progress', 'critical', CURRENT_DATE - INTERVAL '2 days', 
    (SELECT id FROM users WHERE email = 'eve@gearguard.com'), 0),

-- 3. Corrective (Completed) - History Test
('Forklift Tire Puncture', 'Rear left tire flat', 'corrective', 
    (SELECT id FROM equipment WHERE serial_number = 'VH-FL-55'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'),
    (SELECT id FROM users WHERE email = 'bob@gearguard.com'),
    'repaired', 'high', CURRENT_DATE - INTERVAL '10 days', 
    (SELECT id FROM users WHERE email = 'alice@gearguard.com'), 2.5),

-- 4. Scrap Request - Scrap Logic Test
('Conveyor Belt Failure', 'Motor burnt out completely', 'corrective', 
    (SELECT id FROM equipment WHERE serial_number = 'CNV-OLD-01'), 
    (SELECT id FROM teams WHERE name = 'Mechanics'),
    NULL,
    'scrap', 'low', CURRENT_DATE - INTERVAL '30 days', 
    (SELECT id FROM users WHERE email = 'alice@gearguard.com'), 0);

-- 5. Insert Request Notes
INSERT INTO request_notes (request_id, user_id, note) VALUES 
((SELECT id FROM requests WHERE subject = 'Server Overheating'), 
 (SELECT id FROM users WHERE email = 'david@gearguard.com'), 
 'Ordered new fan assembly. Waiting for delivery.'),
 
((SELECT id FROM requests WHERE subject = 'Forklift Tire Puncture'), 
 (SELECT id FROM users WHERE email = 'bob@gearguard.com'), 
 'Replaced with spare. Ordered new tire for inventory.');

COMMIT;