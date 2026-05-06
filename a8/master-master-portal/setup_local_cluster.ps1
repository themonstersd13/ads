$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $rootDir 'docker-compose.yml'
$schemaFile = Join-Path $rootDir 'sql\01_schema.sql'
$containers = @('mm-node1', 'mm-node2', 'mm-node3')

function Invoke-DockerCompose {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  docker compose -f $composeFile @Args
}

function Wait-ForPostgres {
  param(
    [string]$ContainerName
  )

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    docker container inspect $ContainerName *> $null
    if ($LASTEXITCODE -ne 0) {
      Start-Sleep -Seconds 2
      continue
    }

    $null = docker exec $ContainerName pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "$ContainerName is ready." -ForegroundColor Green
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL in $ContainerName did not become ready in time."
}

function Ensure-Database {
  param(
    [string]$ContainerName,
    [string]$DatabaseName
  )

  $exists = docker exec -i $ContainerName psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
  if ($exists.Trim() -ne '1') {
    docker exec -i $ContainerName createdb -U postgres $DatabaseName
    Write-Host "Created database $DatabaseName on $ContainerName" -ForegroundColor Green
    return
  }

  Write-Host "Database $DatabaseName already exists on $ContainerName" -ForegroundColor Yellow
}

function Invoke-SqlFile {
  param(
    [string]$ContainerName,
    [string]$DatabaseName,
    [string]$FilePath
  )

  Get-Content -Raw $FilePath | docker exec -i $ContainerName psql -U postgres -d $DatabaseName -v ON_ERROR_STOP=1
}

function Ensure-Publication {
  param(
    [string]$ContainerName,
    [string]$PublicationName
  )

  $exists = docker exec -i $ContainerName psql -U postgres -d lab_sync -tAc "SELECT 1 FROM pg_publication WHERE pubname = '$PublicationName'"
  if ($exists.Trim() -eq '1') {
    Write-Host "Publication $PublicationName already exists on $ContainerName" -ForegroundColor Yellow
    return
  }

  docker exec -i $ContainerName psql -U postgres -d lab_sync -v ON_ERROR_STOP=1 -c "CREATE PUBLICATION $PublicationName FOR TABLE student_records;"
  Write-Host "Created publication $PublicationName on $ContainerName" -ForegroundColor Green
}

function Ensure-Subscription {
  param(
    [string]$ContainerName,
    [string]$SubscriptionName,
    [string]$PublisherHost,
    [string]$PublicationName
  )

  $exists = docker exec -i $ContainerName psql -U postgres -d lab_sync -tAc "SELECT 1 FROM pg_subscription WHERE subname = '$SubscriptionName'"
  if ($exists.Trim() -eq '1') {
    Write-Host "Subscription $SubscriptionName already exists on $ContainerName" -ForegroundColor Yellow
    return
  }

  $sql = @"
CREATE SUBSCRIPTION $SubscriptionName
CONNECTION 'host=$PublisherHost port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION $PublicationName
WITH (create_slot = true, enabled = true, copy_data = false);
"@

  $sql | docker exec -i $ContainerName psql -U postgres -d lab_sync -v ON_ERROR_STOP=1
  Write-Host "Created subscription $SubscriptionName on $ContainerName" -ForegroundColor Green
}

Write-Host 'Starting 3-node master-master PostgreSQL cluster...' -ForegroundColor Cyan
Invoke-DockerCompose up -d
if ($LASTEXITCODE -ne 0) {
  throw 'docker compose up failed. Please check Docker Desktop, internet access for image pull, or run docker compose manually for details.'
}

foreach ($container in $containers) {
  Wait-ForPostgres -ContainerName $container
  Ensure-Database -ContainerName $container -DatabaseName 'lab_sync'
  Invoke-SqlFile -ContainerName $container -DatabaseName 'lab_sync' -FilePath $schemaFile
}

Ensure-Publication -ContainerName 'mm-node1' -PublicationName 'node1_pub'
Ensure-Publication -ContainerName 'mm-node2' -PublicationName 'node2_pub'
Ensure-Publication -ContainerName 'mm-node3' -PublicationName 'node3_pub'

Ensure-Subscription -ContainerName 'mm-node1' -SubscriptionName 'node1_from_node2' -PublisherHost 'mm-node2' -PublicationName 'node2_pub'
Ensure-Subscription -ContainerName 'mm-node1' -SubscriptionName 'node1_from_node3' -PublisherHost 'mm-node3' -PublicationName 'node3_pub'
Ensure-Subscription -ContainerName 'mm-node2' -SubscriptionName 'node2_from_node1' -PublisherHost 'mm-node1' -PublicationName 'node1_pub'
Ensure-Subscription -ContainerName 'mm-node2' -SubscriptionName 'node2_from_node3' -PublisherHost 'mm-node3' -PublicationName 'node3_pub'
Ensure-Subscription -ContainerName 'mm-node3' -SubscriptionName 'node3_from_node1' -PublisherHost 'mm-node1' -PublicationName 'node1_pub'
Ensure-Subscription -ContainerName 'mm-node3' -SubscriptionName 'node3_from_node2' -PublisherHost 'mm-node2' -PublicationName 'node2_pub'

Write-Host ''
Write-Host 'Master-master cluster is ready.' -ForegroundColor Green
Write-Host 'Node ports: node1=5541, node2=5542, node3=5543' -ForegroundColor Cyan
Write-Host 'Copy backend\.env.local.example to backend\.env before starting the portal.' -ForegroundColor Cyan
