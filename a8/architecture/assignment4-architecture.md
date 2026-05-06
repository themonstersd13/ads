flowchart TD
  %% Assignment 4 - Online MCQ Exam System Architecture

  subgraph P[Presentation Layer]
    F1[Angular Frontend\nPages + Components]
    F2[Auth Guard + Role Guard]
    F3[HTTP Interceptor\nJWT Attach]
    F4[ApiService + AuthService]
    F5[SocketService]
  end

  subgraph API[API Layer]
    B1[Express Server\nRoute Modules]
    B1a[/api/auth]
    B1b[/api/users]
    B1c[/api/questions]
    B1d[/api/topics]
    B1e[/api/exams]
    B1f[/api/attempts]
    B1g[/api/reports]
    B1h[/api/dashboard]
    B1i[/api/node]
  end

  subgraph MW[Security and Middleware Layer]
    M1[Helmet]
    M2[CORS]
    M3[Rate Limiter]
    M4[JWT Auth Middleware]
    M5[Role Middleware]
    M6[Validation Middleware]
    M7[Morgan + Winston Logging]
  end

  subgraph BL[Business Logic Layer]
    C1[Auth Controller\nLogin/Refresh/Logout]
    C2[User Controller\nUser Management]
    C3[Question Controller\nQuestion Bank]
    C4[Exam Controller\nCreate/Assign/Publish]
    C5[Attempt Controller\nStart/Answer/Submit]
    C6[Report Controller\nAnalytics + Export]
    C7[Dashboard Controller\nOverview + Live Stats]
  end

  subgraph RT[Real-Time Layer]
    S1[Socket.IO Server]
    S2[Exam Rooms]
    S3[Live Monitoring Events]
  end

  subgraph DA[Data Access Layer]
    D1[pg Pool]
    D2[withTransaction Helper]
    D3[Node Metadata Query\npg_is_in_recovery()]
  end

  subgraph DB[Relational Data Layer]
    T1[(users)]
    T2[(topics)]
    T3[(questions)]
    T4[(question_options)]
    T5[(exams)]
    T6[(exam_questions)]
    T7[(exam_assignments)]
    T8[(exam_attempts)]
    T9[(attempt_answers)]
    T10[(refresh_tokens)]
    T11[(audit_logs)]
  end

  subgraph DIST[Distributed PostgreSQL Layer]
    P1[(Node1 Primary\n5433 Read/Write)]
    R1[(Node2 Replica\n5434 Read)]
    R2[(Node3 Replica\n5435 Read)]
  end

  F1 --> F2 --> F3 --> F4 --> B1
  F1 --> F5 --> S1

  B1 --> B1a
  B1 --> B1b
  B1 --> B1c
  B1 --> B1d
  B1 --> B1e
  B1 --> B1f
  B1 --> B1g
  B1 --> B1h
  B1 --> B1i

  B1 --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7
  M7 --> C1
  M7 --> C2
  M7 --> C3
  M7 --> C4
  M7 --> C5
  M7 --> C6
  M7 --> C7

  C1 --> D1
  C2 --> D1
  C3 --> D1
  C4 --> D2
  C5 --> D2
  C6 --> D1
  C7 --> D1
  B1i --> D3

  D1 --> T1
  D1 --> T2
  D1 --> T3
  D1 --> T4
  D1 --> T5
  D1 --> T6
  D1 --> T7
  D1 --> T8
  D1 --> T9
  D1 --> T10
  D1 --> T11

  T1 --> P1
  P1 --> R1
  P1 --> R2

  S1 --> S2 --> S3
  S3 --> F1

  classDef layer fill:#f7f7f7,stroke:#333,stroke-width:1px;
  class P,API,MW,BL,RT,DA,DB,DIST layer;
