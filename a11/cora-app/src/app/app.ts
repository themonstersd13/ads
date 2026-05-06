import { Component, ChangeDetectorRef } from '@angular/core';
import { Neo4jService } from './neo4j.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html', 
  styleUrls: ['./app.css']
})
export class App {
  queryA_Result: string = '';
  queryB_Result: string = '';
  queryC_Result: any[] = [];
  loadingA: boolean = false;
  loadingB: boolean = false;
  loadingC: boolean = false;
  constructor(private neo4jService: Neo4jService, private cdr: ChangeDetectorRef) {}

  private withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
      })
    ]);
  }

  async checkCitation(paperA: string, paperB: string) {
    if (!paperA || !paperB) {
      this.queryA_Result = "Please enter both Paper IDs.";
      return;
    }
    this.loadingA = true;
    this.queryA_Result = '';
    console.log('checkCitation: Starting with', paperA, 'and', paperB);
    
    const query = `
      MATCH path = shortestPath((a:Paper {paper_id: $paperA})-[:CITES*..8]->(b:Paper {paper_id: $paperB}))
      RETURN length(path) AS depth, [node IN nodes(path) | node.paper_id] AS citationPath
    `;
    try {
      console.log('checkCitation: About to call service');
      const records = await this.withTimeout(
        this.neo4jService.runQuery(query, { paperA, paperB })
      );
      console.log('checkCitation: Got', records.length, 'records back');
      if (records.length > 0) {
        const depth = records[0].get('depth');
        const path = records[0].get('citationPath');
        this.queryA_Result = `✓ Citation path found! Paper ${paperA} reaches Paper ${paperB} in ${depth} hop(s).\nPath: ${path.join(' → ')}`;
      } else {
        this.queryA_Result = "✗ No citation path exists between these papers.";
      }
    } catch (e) {
      console.log('checkCitation: Error caught:', e);
      this.queryA_Result = "Query timed out or failed. Try closer papers or try again.";
      console.error('Citation check error:', e);
    } finally {
      this.loadingA = false;
      this.cdr.detectChanges();
      console.log('checkCitation: Done. Loading=', this.loadingA, 'Result=', this.queryA_Result.substring(0, 40));
    }
  }

  async getClassification(paperId: string) {
    if (!paperId) {
      this.queryB_Result = "Please enter a paper ID.";
      return;
    }
    this.loadingB = true;
    this.queryB_Result = '';
    console.log('getClassification: Starting with', paperId);
    
    const query = `
      MATCH (p:Paper {paper_id: $paperId})-[:BELONGS_TO]->(c:Classification)
      RETURN c.class_id AS classId, p.paper_id AS paperId
    `;
    try {
      console.log('getClassification: About to call service');
      const records = await this.withTimeout(
        this.neo4jService.runQuery(query, { paperId })
      );
      console.log('getClassification: Got', records.length, 'records back');
      if (records.length > 0) {
        const classId = records[0].get('classId');
        this.queryB_Result = `✓ Paper ${records[0].get('paperId')} classified as: ${classId}`;
      } else {
        this.queryB_Result = "✗ Paper not found or has no classification assigned.";
      }
    } catch (e) {
      console.log('getClassification: Error caught:', e);
      this.queryB_Result = "Query timed out or failed. Please try again.";
      console.error('Classification error:', e);
    } finally {
      this.loadingB = false;
      this.cdr.detectChanges();
      console.log('getClassification: Done. Loading=', this.loadingB, 'Result=', this.queryB_Result.substring(0, 40));
    }
  }

  async getAuthorPapers(authorId: string) {
    if (!authorId) {
      this.queryC_Result = ["Please enter an author ID."];
      return;
    }
    this.loadingC = true;
    this.queryC_Result = [];
    console.log('getAuthorPapers: Starting with', authorId);
    
    const query = `
      MATCH (a:Author {author_id: $authorId})-[:WROTE]->(p:Paper)
      RETURN a.name AS authorName, collect(p.paper_id) AS paperIds, count(p) AS paperCount
    `;
    try {
      console.log('getAuthorPapers: About to call service');
      const records = await this.withTimeout(
        this.neo4jService.runQuery(query, { authorId })
      );
      console.log('getAuthorPapers: Got', records.length, 'records back');
      if (records.length > 0) {
        const authorName = records[0].get('authorName');
        const paperIds = records[0].get('paperIds');
        const count = records[0].get('paperCount');
        
        this.queryC_Result = [
          `✓ ${authorName} (${authorId}) has written ${count} paper(s):`,
          ...paperIds.map((id: string) => `  • Paper ${id}`)
        ];
      } else {
        this.queryC_Result = [`✗ Author ${authorId} has no papers or was not found.`];
      }
    } catch (e) {
      console.log('getAuthorPapers: Error caught:', e);
      this.queryC_Result = ["Query timed out or failed. Please try again."];
      console.error('Author papers error:', e);
    } finally {
      this.loadingC = false;
      this.cdr.detectChanges();
      console.log('getAuthorPapers: Done. Loading=', this.loadingC, 'Result count=', this.queryC_Result.length);
    }
  }
}