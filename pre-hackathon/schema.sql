-- SabiPack server schema (Turso/SQLite). On the phone, IndexedDB mirrors: lessons, questions, attempts, mastery.
CREATE TABLE topics(id TEXT PRIMARY KEY, number INTEGER, title TEXT, demo_set INTEGER DEFAULT 0);
CREATE TABLE subtopics(id TEXT PRIMARY KEY, topic_id TEXT REFERENCES topics(id), title TEXT);
CREATE TABLE objectives(id INTEGER PRIMARY KEY, subtopic_id TEXT REFERENCES subtopics(id), text TEXT);
CREATE TABLE lessons(id INTEGER PRIMARY KEY, subtopic_id TEXT REFERENCES subtopics(id), lang TEXT, title TEXT,
  body TEXT, audio_script TEXT, source TEXT, status TEXT DEFAULT 'draft', -- draft | reviewed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE questions(id INTEGER PRIMARY KEY, subtopic_id TEXT REFERENCES subtopics(id), objective_id INTEGER,
  stem TEXT, options_json TEXT, answer_index INTEGER, explanation TEXT, status TEXT DEFAULT 'draft');
CREATE TABLE students(id INTEGER PRIMARY KEY, phone_hash TEXT, phone_enc TEXT, exam_date TEXT, sms_optin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP); -- store the minimum; students may be minors
CREATE TABLE attempts(id INTEGER PRIMARY KEY, student_id INTEGER, question_id INTEGER, chosen INTEGER, correct INTEGER,
  channel TEXT, at TEXT, synced_at TEXT); -- channel: app | sms
CREATE TABLE mastery(student_id INTEGER, subtopic_id TEXT, score REAL DEFAULT 0.5, streak INTEGER DEFAULT 0,
  next_review_at TEXT, updated_at TEXT, PRIMARY KEY(student_id, subtopic_id));
CREATE TABLE packs(id INTEGER PRIMARY KEY, student_id INTEGER, version INTEGER, content_hash TEXT, size_bytes INTEGER, built_at TEXT);
CREATE TABLE sms_log(id INTEGER PRIMARY KEY, student_id INTEGER, direction TEXT, body TEXT, at TEXT);
