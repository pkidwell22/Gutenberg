-- Full historical works are isolated from Scripture and personal annotations.
CREATE TABLE commentary_works (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordinal integer NOT NULL UNIQUE CHECK (ordinal >= 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE TABLE commentary_sections (
  work_id text NOT NULL REFERENCES commentary_works(id) ON DELETE CASCADE,
  id text NOT NULL CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  section_text text NOT NULL,
  search_text text NOT NULL,
  PRIMARY KEY (work_id, id),
  UNIQUE (work_id, ordinal)
);
CREATE TABLE commentary_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL CHECK (schema_version = 1),
  gaps jsonb NOT NULL CHECK (jsonb_typeof(gaps) = 'array'),
  corpus_sha256 text NOT NULL CHECK (corpus_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);
