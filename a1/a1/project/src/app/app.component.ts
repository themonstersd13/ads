import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  API = 'http://localhost:3000';

  tables: any[] = [];
  selectedTable: string = '';
  columns: any[] = [];
  tableData: any[] = [];
  pkColumn: string = '';

  // For Create / Edit form
  formData: any = {};
  editingRow: any = null;
  showForm: boolean = false;
  message: string = '';
  messageType: string = 'success';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTables();
  }

  loadTables() {
    this.http.get<any[]>(`${this.API}/tables`).subscribe({
      next: (data) => this.tables = data,
      error: (e) => this.showMessage('Failed to load tables', 'error')
    });
  }

  onTableSelect(event: any) {
    this.selectedTable = event.target.value;
    this.editingRow = null;
    this.showForm = false;
    this.message = '';
    if (this.selectedTable) {
      this.loadColumns();
    } else {
      this.columns = [];
      this.tableData = [];
    }
  }

  loadColumns() {
    this.http.get<any[]>(`${this.API}/columns/${this.selectedTable}`).subscribe({
      next: (cols) => {
        this.columns = cols;
        this.pkColumn = cols.find((c: any) => c.is_primary_key)?.column_name || cols[0]?.column_name || '';
        this.loadTableData();
      },
      error: (e) => this.showMessage('Failed to load columns', 'error')
    });
  }

  loadTableData() {
    this.http.get<any[]>(`${this.API}/data/${this.selectedTable}`).subscribe({
      next: (data) => this.tableData = data,
      error: (e) => this.showMessage('Failed to load data', 'error')
    });
  }

  // --- CREATE ---
  openCreateForm() {
    this.editingRow = null;
    this.formData = {};
    // Pre-fill empty values for each non-auto column
    this.columns.forEach(col => {
      if (!col.is_primary_key || !col.column_default?.includes('nextval')) {
        this.formData[col.column_name] = '';
      }
    });
    this.showForm = true;
  }

  createRow() {
    this.http.post(`${this.API}/data/${this.selectedTable}`, this.formData).subscribe({
      next: () => {
        this.showMessage('Row inserted successfully!', 'success');
        this.loadTableData();
        this.showForm = false;
      },
      error: (e) => this.showMessage('Insert failed: ' + (e.error?.error || e.message), 'error')
    });
  }

  // --- UPDATE ---
  openEditForm(row: any) {
    this.editingRow = row;
    this.formData = { ...row };
    this.showForm = true;
  }

  updateRow() {
    const pkValue = this.editingRow[this.pkColumn];
    // Remove PK from data if it's auto-generated
    const data = { ...this.formData };
    this.http.put(`${this.API}/data/${this.selectedTable}`, {
      pkColumn: this.pkColumn, pkValue, data
    }).subscribe({
      next: () => {
        this.showMessage('Row updated successfully!', 'success');
        this.loadTableData();
        this.showForm = false;
        this.editingRow = null;
      },
      error: (e) => this.showMessage('Update failed: ' + (e.error?.error || e.message), 'error')
    });
  }

  // --- DELETE ---
  deleteRow(row: any) {
    const pkValue = row[this.pkColumn];
    if (!confirm(`Delete row where ${this.pkColumn} = ${pkValue}?`)) return;
    this.http.delete(`${this.API}/data/${this.selectedTable}/${this.pkColumn}/${pkValue}`).subscribe({
      next: () => {
        this.showMessage('Row deleted successfully!', 'success');
        this.loadTableData();
      },
      error: (e) => this.showMessage('Delete failed: ' + (e.error?.error || e.message), 'error')
    });
  }

  cancelForm() {
    this.showForm = false;
    this.editingRow = null;
  }

  showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  getFormColumns(): any[] {
    if (this.editingRow) return this.columns;
    // For create, skip auto-increment PK
    return this.columns.filter(c => !(c.is_primary_key && c.column_default?.includes('nextval')));
  }
}