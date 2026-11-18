CREATE TABLE obra_budgets (
    scenario_id uuid PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
    name text NOT NULL,
    area numeric(14,4) NOT NULL CHECK (area > 0),
    months integer NOT NULL CHECK (months BETWEEN 1 AND 600),
    start_date date NOT NULL,
    scope text NOT NULL CHECK (scope IN ('full','material','labor')),
    bdi numeric(8,4) NOT NULL CHECK (bdi >= 0),
    revision integer NOT NULL DEFAULT 1
);

CREATE TABLE obra_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id uuid NOT NULL REFERENCES obra_budgets ON DELETE CASCADE,
    digest text NOT NULL,
    filename text NOT NULL,
    discipline text NOT NULL,
    content bytea NOT NULL,
    pages integer NOT NULL,
    UNIQUE (scenario_id, digest)
);

CREATE TABLE obra_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id uuid NOT NULL REFERENCES obra_budgets ON DELETE CASCADE,
    source_key text NOT NULL,
    document_id uuid REFERENCES obra_documents ON DELETE CASCADE,
    page integer,
    -- Keep the source identifier and its field measurements after an IFC revision is retired.
    version_id uuid,
    global_id text,
    storey text,
    cost_item_id uuid REFERENCES cost_items ON DELETE SET NULL,
    activity_id uuid REFERENCES activities ON DELETE SET NULL,
    stage text NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    quantity numeric(18,4) CHECK (quantity >= 0),
    labor numeric(18,4) CHECK (labor >= 0),
    material numeric(18,4) CHECK (material >= 0),
    equipment numeric(18,4) CHECK (equipment >= 0),
    combined numeric(18,4) CHECK (combined >= 0),
    evidence text NOT NULL,
    issue text NOT NULL DEFAULT '',
    status text NOT NULL CHECK (status IN ('ready','estimated','pending')),
    assumption text NOT NULL DEFAULT '',
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    revision integer NOT NULL DEFAULT 1,
    UNIQUE (scenario_id, source_key)
);
CREATE INDEX obra_services_activity ON obra_services(activity_id);

CREATE TABLE obra_measurements (
    id uuid PRIMARY KEY,
    service_id uuid NOT NULL REFERENCES obra_services ON DELETE CASCADE,
    measured_on date NOT NULL,
    quantity numeric(18,4) NOT NULL CHECK (quantity >= 0),
    paid numeric(18,2) NOT NULL CHECK (paid >= 0),
    note text NOT NULL,
    recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    CHECK (quantity > 0 OR paid > 0)
);
CREATE INDEX obra_measurements_service ON obra_measurements(service_id);
