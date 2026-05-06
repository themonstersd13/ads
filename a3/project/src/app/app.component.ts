import { Component } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

type FieldDef = { name: string; label: string };

type EntityDef = {
  key: string;
  label: string;
  fields: FieldDef[];
};

@Component({
  selector: "app-root",
  standalone: false,
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent {
  apiBase = "http://localhost:3000/api";

  entities: EntityDef[] = [
    { key: "roles", label: "Roles", fields: [{ name: "name", label: "Name" }] },
    {
      key: "users",
      label: "Users",
      fields: [
        { name: "username", label: "Username" },
        { name: "password", label: "Password" },
        { name: "role_id", label: "Role Id" }
      ]
    },
    { key: "departments", label: "Departments", fields: [{ name: "name", label: "Name" }] },
    {
      key: "students",
      label: "Students",
      fields: [
        { name: "roll_no", label: "Roll No" },
        { name: "name", label: "Name" },
        { name: "dept_id", label: "Dept Id" },
        { name: "year", label: "Year" }
      ]
    },
    {
      key: "instructors",
      label: "Instructors",
      fields: [
        { name: "name", label: "Name" },
        { name: "dept_id", label: "Dept Id" }
      ]
    },
    {
      key: "courses",
      label: "Courses",
      fields: [
        { name: "code", label: "Code" },
        { name: "title", label: "Title" },
        { name: "dept_id", label: "Dept Id" }
      ]
    },
    {
      key: "enrollments",
      label: "Enrollments",
      fields: [
        { name: "student_id", label: "Student Id" },
        { name: "course_id", label: "Course Id" },
        { name: "semester", label: "Semester" },
        { name: "grade", label: "Grade" }
      ]
    }
  ];

  selectedEntityKey = this.entities[0].key;
  rows: any[] = [];
  roles: any[] = [];
  departments: any[] = [];
  students: any[] = [];
  courses: any[] = [];
  form: any = {};
  editingId: number | null = null;
  message = "";

  loginForm = { username: "", password: "" };
  role = localStorage.getItem("role") || "";

  constructor(private http: HttpClient) {
    this.loadLookups();
    this.loadRows();
  }

  get selectedEntity() {
    return this.entities.find((e) => e.key === this.selectedEntityKey) || this.entities[0];
  }

  selectEntity(entityKey: string) {
    this.selectedEntityKey = entityKey;
    this.clearForm();
    this.loadRows();
  }

  get canWrite() {
    return this.role === "admin" || this.role === "staff";
  }

  login() {
    this.message = "";
    this.http.post<any>(`${this.apiBase}/login`, this.loginForm).subscribe({
      next: (res) => {
        this.role = res.role || "";
        localStorage.setItem("role", this.role);
        this.message = `Logged in as ${this.role}`;
      },
      error: () => {
        this.message = "Login failed";
      }
    });
  }

  logout() {
    this.role = "";
    localStorage.removeItem("role");
  }

  loadRows() {
    this.http.get<any[]>(`${this.apiBase}/${this.selectedEntity.key}`).subscribe({
      next: (data) => (this.rows = data || []),
      error: () => (this.rows = [])
    });
  }

  loadLookups() {
    this.http.get<any[]>(`${this.apiBase}/roles`).subscribe({
      next: (data) => (this.roles = data || []),
      error: () => (this.roles = [])
    });
    this.http.get<any[]>(`${this.apiBase}/departments`).subscribe({
      next: (data) => (this.departments = data || []),
      error: () => (this.departments = [])
    });
    this.http.get<any[]>(`${this.apiBase}/students`).subscribe({
      next: (data) => (this.students = data || []),
      error: () => (this.students = [])
    });
    this.http.get<any[]>(`${this.apiBase}/courses`).subscribe({
      next: (data) => (this.courses = data || []),
      error: () => (this.courses = [])
    });
  }

  runReport() {
    this.http.get<any[]>(`${this.apiBase}/report/${this.selectedEntity.key}`).subscribe({
      next: (data) => (this.rows = data || []),
      error: () => (this.rows = [])
    });
  }

  editRow(row: any) {
    this.editingId = row.id;
    this.form = { ...row };
  }

  clearForm() {
    this.form = {};
    this.editingId = null;
  }

  save() {
    if (!this.canWrite) {
      this.message = "Write access denied";
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    const headers = new HttpHeaders({ "x-role": this.role });
    const body = { ...this.form };
    const url = `${this.apiBase}/${this.selectedEntity.key}`;

    if (this.editingId) {
      this.http.put(`${url}/${this.editingId}`, body, { headers }).subscribe({
        next: () => {
          this.clearForm();
          this.loadRows();
          this.loadLookups();
        }
      });
    } else {
      this.http.post(url, body, { headers }).subscribe({
        next: () => {
          if (this.selectedEntity.key === "users") {
            this.createStudentIfNeeded(body);
          }
          this.clearForm();
          this.loadRows();
          this.loadLookups();
        }
      });
    }
  }

  remove(id: number) {
    if (!this.canWrite) {
      this.message = "Write access denied";
      return;
    }

    const headers = new HttpHeaders({ "x-role": this.role });
    const url = `${this.apiBase}/${this.selectedEntity.key}/${id}`;
    this.http.delete(url, { headers }).subscribe({
      next: () => {
        this.loadRows();
        this.loadLookups();
      }
    });
  }

  validateForm() {
    this.message = "";
    if (this.selectedEntity.key === "students") {
      if (!this.form.roll_no || !this.form.name) {
        this.message = "Roll No and Name are required for students";
        return false;
      }
    }
    if (this.selectedEntity.key === "users") {
      if (!this.form.username || !this.form.password || !this.form.role_id) {
        this.message = "Username, password, and role are required for users";
        return false;
      }
    }
    return true;
  }

  getRoleNameById(roleId: number) {
    const match = this.roles.find((r) => r.id === roleId);
    return match ? String(match.name || "").toLowerCase() : "";
  }

  createStudentIfNeeded(user: any) {
    const roleName = this.getRoleNameById(user.role_id);
    if (roleName !== "student") {
      return;
    }

    const headers = new HttpHeaders({ "x-role": this.role });
    const studentBody = {
      roll_no: user.username,
      name: user.username,
      dept_id: null,
      year: null
    };
    this.http.post(`${this.apiBase}/students`, studentBody, { headers }).subscribe({
      next: () => this.loadLookups(),
      error: () => {
        this.message = "Student record creation failed";
      }
    });
  }

  trackById(index: number, row: any) {
    return row.id || index;
  }
}
