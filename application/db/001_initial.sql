-- Schema identifiers are deliberately unquoted and avoid reserved keywords.
CREATE TABLE sources (
  id text PRIMARY KEY CHECK (id <> ''),
  ordinal integer NOT NULL UNIQUE DEFERRABLE INITIALLY DEFERRED CHECK (ordinal >= 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE books (
  id text PRIMARY KEY CHECK (id <> ''),
  source_id text NOT NULL REFERENCES sources(id),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE chapters (
  book_id text NOT NULL REFERENCES books(id),
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  PRIMARY KEY (book_id, chapter_number),
  UNIQUE (book_id, ordinal)
);
CREATE TABLE verses (
  book_id text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL CHECK (verse_number > 0),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  verse_text text NOT NULL,
  source_start integer NOT NULL CHECK (source_start >= 0),
  source_end integer NOT NULL CHECK (source_end >= source_start),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  PRIMARY KEY (book_id, chapter_number, verse_number),
  FOREIGN KEY (book_id, chapter_number) REFERENCES chapters(book_id, chapter_number),
  UNIQUE (book_id, chapter_number, ordinal)
);
-- Reserved for future DB discovery; the reader continues its literal JS search.
CREATE INDEX verses_fulltext_idx ON verses USING gin (to_tsvector('simple', verse_text));
CREATE TABLE editorial_notes (
  id text PRIMARY KEY CHECK (id <> ''),
  ordinal integer NOT NULL UNIQUE DEFERRABLE INITIALLY DEFERRED CHECK (ordinal >= 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE editorial_note_sources (
  note_id text NOT NULL REFERENCES editorial_notes(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES sources(id),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (note_id, source_id),
  UNIQUE (note_id, ordinal)
);
CREATE TABLE editorial_quotes (
  note_id text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  source_id text NOT NULL,
  quote_text text NOT NULL,
  source_start integer NOT NULL CHECK (source_start >= 0),
  source_end integer NOT NULL CHECK (source_end >= source_start),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  PRIMARY KEY (note_id, ordinal),
  FOREIGN KEY (note_id, source_id) REFERENCES editorial_note_sources(note_id, source_id) ON DELETE CASCADE
);
CREATE TABLE editorial_passages (
  note_id text NOT NULL REFERENCES editorial_notes(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  book_id text NOT NULL,
  chapter_number integer NOT NULL,
  start_verse integer NOT NULL,
  end_verse integer NOT NULL CHECK (end_verse >= start_verse),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  PRIMARY KEY (note_id, ordinal),
  FOREIGN KEY (book_id, chapter_number, start_verse) REFERENCES verses(book_id, chapter_number, verse_number),
  FOREIGN KEY (book_id, chapter_number, end_verse) REFERENCES verses(book_id, chapter_number, verse_number)
);
CREATE TABLE editorial_related (
  note_id text NOT NULL REFERENCES editorial_notes(id) ON DELETE CASCADE,
  related_id text NOT NULL REFERENCES editorial_notes(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (note_id, ordinal)
);
CREATE TABLE library_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  book_id text NOT NULL REFERENCES books(id),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  corpus_sha256 text NOT NULL CHECK (corpus_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);
-- This table is never truncated, deleted from, or updated by the importer.
-- Restricting deletion of referenced verses prevents silent annotation loss.
CREATE TABLE personal_annotations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (book_id, chapter_number, verse_number) REFERENCES verses(book_id, chapter_number, verse_number)
);
