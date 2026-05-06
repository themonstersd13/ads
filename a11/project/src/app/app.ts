import { Component } from '@angular/core';
import { Neo4jService } from './neo4j.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html', 
  styleUrls: ['./app.css']
})
export class App {  // <--- Changed to match your module imports
  queryA_Result: string = '';
  queryB_Result: string = '';
  queryC_Result: any[] = [];

  constructor(private neo4jService: Neo4jService) {}

  async checkCitation(paperA: string, paperB: string) {
    const query = `
      MATCH path = shortestPath((a:Paper {title: $paperA})-[:CITES*]->(b:Paper {title: $paperB}))
      RETURN length(path) AS depth
    `;
    try {
      const records = await this.neo4jService.runQuery(query, { paperA, paperB });
      if (records.length > 0) {
        this.queryA_Result = `Yes! Paper A cites Paper B through ${records[0].get('depth')} level(s).`;
      } else {
        this.queryA_Result = "No, there is no citation path between these papers.";
      }
    } catch (e) {
      this.queryA_Result = "Error executing query. Check console for details.";
      console.error(e);
    }
  }

  async getClassification(paperTitle: string) {
    const query = `
      MATCH (p:Paper {title: $paperTitle})-[:BELONGS_TO]->(c:Classification)
      RETURN c.name AS classification
    `;
    try {
      const records = await this.neo4jService.runQuery(query, { paperTitle });
      if (records.length > 0) {
        this.queryB_Result = `Classification: ${records[0].get('classification')}`;
      } else {
        this.queryB_Result = "Paper not found or has no classification.";
      }
    } catch (e) {
      this.queryB_Result = "Error executing query. Check console for details.";
      console.error(e);
    }
  }

  async getAuthorPapers(authorName: string) {
    const query = `
      MATCH (a:Author {name: $authorName})-[:WROTE]->(p:Paper)
      RETURN p.title AS title
    `;
    try {
      const records = await this.neo4jService.runQuery(query, { authorName });
      this.queryC_Result = records.map(record => record.get('title'));
      if (this.queryC_Result.length === 0) {
        this.queryC_Result = ["No papers found for this author."];
      }
    } catch (e) {
      this.queryC_Result = ["Error executing query. Check console for details."];
      console.error(e);
    }
  }
}