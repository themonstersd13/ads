import { TestBed } from '@angular/core/testing';

import { Neo4j } from './neo4j';

describe('Neo4j', () => {
  let service: Neo4j;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Neo4j);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
