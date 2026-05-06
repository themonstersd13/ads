import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  created_at?: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  apiBase = 'http://localhost:3100/api/students';
  students: Student[] = [];
  loading = false;
  message = '';

  form: Omit<Student, 'id'> = {
    name: '',
    email: '',
    course: ''
  };

  editingId: string | null = null;

  get totalStudents(): number {
    return this.students.length;
  }

  get uniqueCourseCount(): number {
    return new Set(this.students.map((student) => student.course.trim().toLowerCase())).size;
  }

  get messageClass(): string {
    return this.message.toLowerCase().includes('failed') || this.message.toLowerCase().includes('error')
      ? 'border-rose-300/40 bg-rose-300/16 text-rose-100'
      : 'border-emerald-300/40 bg-emerald-300/16 text-emerald-100';
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchStudents();
  }

  fetchStudents(): void {
    this.loading = true;
    this.message = '';

    this.http.get<Student[]>(this.apiBase).subscribe({
      next: (data) => {
        this.students = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.error || 'Failed to fetch students.';
      }
    });
  }

  saveStudent(): void {
    this.message = '';

    if (this.editingId) {
      this.http.put<Student>(`${this.apiBase}/${this.editingId}`, this.form).subscribe({
        next: () => {
          this.message = 'Student updated successfully.';
          this.cancelEdit();
          this.fetchStudents();
        },
        error: (err) => {
          this.message = err?.error?.error || 'Failed to update student.';
        }
      });
      return;
    }

    this.http.post<Student>(this.apiBase, this.form).subscribe({
      next: () => {
        this.message = 'Student created successfully.';
        this.form = { name: '', email: '', course: '' };
        this.fetchStudents();
      },
      error: (err) => {
        this.message = err?.error?.error || 'Failed to create student.';
      }
    });
  }

  startEdit(student: Student): void {
    this.editingId = student.id;
    this.form = {
      name: student.name,
      email: student.email,
      course: student.course
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = { name: '', email: '', course: '' };
  }

  deleteStudent(student: Student): void {
    this.message = '';
    this.http.delete(`${this.apiBase}/${student.id}`).subscribe({
      next: () => {
        this.message = 'Student deleted successfully.';
        this.fetchStudents();
      },
      error: (err) => {
        this.message = err?.error?.error || 'Failed to delete student.';
      }
    });
  }
}
