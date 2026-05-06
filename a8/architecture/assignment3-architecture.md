flowchart TD
  %% Assignment 3 - Student MIS Architecture

  subgraph L1[Presentation Layer]
    A1[Angular SPA\nAdmin/Staff/Student UI]
  end

  subgraph L2[API Layer]
    A2[Express Server\nREST Endpoints]
    A2a[/api/auth/login]
    A2b[/api/meta]
    A2c[/api/report/:name]
    A2d[/api/admin/roles]
    A2e[/api/admin/users]
    A2f[/api/:table CRUD]
  end

  subgraph L3[Business Logic Layer]
    A3[Validation + Type Coercion\nSchema Rules]
    A3a[RBAC Checks\nadmin/staff/student]
    A3b[Error Handler\ntraceId + timestamp]
    A3c[Report Builder\npredefined SQL]
  end

  subgraph L4[Data Access Layer]
    A4[pg Pool\nParameterized Queries]
    A4a[Node Identity Query\npg_is_in_recovery()]
  end

  subgraph L5[Data Layer]
    A5[(student_mis DB)]
    A5a[(app_users)]
    A5b[(app_roles)]
    A5c[(role_permissions)]
    A5d[(university tables)]
  end

  subgraph L6[Distributed PostgreSQL Layer]
    P1[(Node1 Primary\n5433 Read/Write)]
    R1[(Node2 Replica\n5434 Read)]
    R2[(Node3 Replica\n5435 Read)]
  end

  A1 --> A2
  A2 --> A2a
  A2 --> A2b
  A2 --> A2c
  A2 --> A2d
  A2 --> A2e
  A2 --> A2f

  A2 --> A3
  A3 --> A3a
  A3 --> A3b
  A3 --> A3c

  A3 --> A4
  A4 --> A4a
  A4 --> A5

  A5 --> P1
  P1 --> R1
  P1 --> R2

  A2 -. GET /api/node .-> A4a

  classDef layer fill:#f7f7f7,stroke:#333,stroke-width:1px;
  class L1,L2,L3,L4,L5,L6 layer;
