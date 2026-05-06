import { Injectable, OnDestroy } from '@angular/core';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable({
  providedIn: 'root'
})
export class Neo4jService implements OnDestroy {
  private driver: Driver;

  constructor() {
    // Replace 'YOUR_PASSWORD' with your actual Neo4j database password
    this.driver = neo4j.driver(
      'neo4j://localhost:7687',
      neo4j.auth.basic('neo4j', '12345678')
    );
  }

  async runQuery(cypher: string, params: any = {}): Promise<any[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  ngOnDestroy() {
    this.driver.close();
  }
}