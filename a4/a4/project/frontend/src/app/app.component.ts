import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private apiUrl = 'http://localhost:3000/api';
  private examStateKey = 'examState';
  private examResultKey = 'examResult';
  
  showLogin = true;
  username = '';
  password = '';
  role = 'student';
  currentUser: any = null;

  questions: any[] = [];
  newQuestion = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: '' };
  
  exams: any[] = [];
  newExam = { title: '', time_limit: 60, questions: [] as number[] };

  dashboardData: any[] = [];

  activeExam: any = null;
  studentExamId: any = null;
  answers: any = {};
  timeRemaining = 0;
  timerSubscription: Subscription | null = null;
  examResult: any = null;
  examEndTime: number | null = null;


  constructor(private http: HttpClient) {}

  get normalizedRole(): string {
    return String(this.currentUser?.role || '').trim().toLowerCase();
  }

  ngOnInit() {
    const user = localStorage.getItem('currentUser');
    if (user) {
      this.currentUser = JSON.parse(user);
      this.loadInitialData();
      this.restoreExamState();
      this.restoreExamResult();
    }
  }

  loadInitialData() {
    if (this.normalizedRole === 'teacher') {
      this.loadQuestions();
      this.loadDashboard();
    }
    if (this.normalizedRole === 'student') {
      this.loadExams();
    }
  }

  register() {
    this.http.post(`${this.apiUrl}/register`, { username: this.username, password: this.password, role: this.role })
      .subscribe(user => {
        alert('Registration successful! Please login.');
        this.showLogin = true;
      }, err => alert(err.error.error));
  }

  login() {
    this.http.post(`${this.apiUrl}/login`, { username: this.username, password: this.password })
      .subscribe(user => {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.loadInitialData();
        this.restoreExamState();
        this.restoreExamResult();
      }, err => alert(err.error.error));
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.activeExam = null;
    this.studentExamId = null;
    this.answers = {};
    this.timeRemaining = 0;
    this.examEndTime = null;
    this.examResult = null;
    this.clearExamState();
    this.clearExamResult();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  loadQuestions() {
    this.http.get<any[]>(`${this.apiUrl}/questions`).subscribe(data => this.questions = data);
  }

  addQuestion() {
    this.http.post(`${this.apiUrl}/questions`, this.newQuestion).subscribe(() => {
      this.loadQuestions();
      this.newQuestion = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: '' };
    });
  }

  loadExams() {
    this.http.get<any[]>(`${this.apiUrl}/exams`).subscribe(data => this.exams = data);
  }

  toggleQuestionForExam(questionId: number) {
    const index = this.newExam.questions.indexOf(questionId);
    if (index > -1) {
      this.newExam.questions.splice(index, 1);
    } else {
      this.newExam.questions.push(questionId);
    }
  }

  createExam() {
    this.http.post(`${this.apiUrl}/exams`, this.newExam).subscribe(() => {
      alert('Exam created!');
      this.newExam = { title: '', time_limit: 60, questions: [] };
    });
  }

  loadDashboard() {
    this.http.get<any[]>(`${this.apiUrl}/dashboard`).subscribe(data => {
      this.dashboardData = data.map(item => ({
        ...item,
        score: item.score !== null && item.score !== undefined ? Number(item.score) : item.score
      }));
    });
  }

  startExam(exam: any) {
    this.http.get<any>(`${this.apiUrl}/exams/${exam.id}`).subscribe(fullExam => {
        this.http.post<any>(`${this.apiUrl}/student-exams/start`, { student_id: this.currentUser.id, exam_id: exam.id })
            .subscribe(studentExam => {
                this.activeExam = fullExam;
                this.studentExamId = studentExam.id;
          this.examEndTime = Date.now() + (fullExam.time_limit * 60 * 1000);
          this.timeRemaining = Math.max(0, Math.floor((this.examEndTime - Date.now()) / 1000));
                this.examResult = null;
                this.answers = {};
          this.saveExamState();
          this.startTimer();
            });
    });
  }

  selectAnswer(questionId: number, option: string) {
    this.answers[questionId] = option;
    this.saveExamState();
  }

  submitExam() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (!this.studentExamId) {
      return;
    }
    this.http.post<any>(`${this.apiUrl}/student-exams/submit`, { student_exam_id: this.studentExamId, answers: this.answers })
      .subscribe(result => {
        this.examResult = { ...result, score: Number(result.score) };
        this.activeExam = null;
        this.studentExamId = null;
        this.answers = {};
        this.timeRemaining = 0;
        this.examEndTime = null;
        this.clearExamState();
        this.saveExamResult();
      });
  }

  private startTimer() {
    if (!this.examEndTime) {
      return;
    }
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.timerSubscription = interval(1000).subscribe(() => {
      if (!this.examEndTime) {
        return;
      }
      this.timeRemaining = Math.max(0, Math.floor((this.examEndTime - Date.now()) / 1000));
      if (this.timeRemaining <= 0) {
        this.submitExam();
      } else {
        this.saveExamState();
      }
    });
  }

  private saveExamState() {
    if (!this.activeExam || !this.studentExamId || !this.currentUser || !this.examEndTime) {
      return;
    }
    const state = {
      examId: this.activeExam.id,
      studentExamId: this.studentExamId,
      answers: this.answers,
      endTime: this.examEndTime,
      studentId: this.currentUser.id
    };
    localStorage.setItem(this.examStateKey, JSON.stringify(state));
  }

  private restoreExamState() {
    if (this.normalizedRole !== 'student') {
      return;
    }
    const stored = localStorage.getItem(this.examStateKey);
    if (!stored) {
      return;
    }
    let state: any;
    try {
      state = JSON.parse(stored);
    } catch {
      this.clearExamState();
      return;
    }
    if (!state || state.studentId !== this.currentUser.id || !state.examId || !state.studentExamId) {
      this.clearExamState();
      return;
    }

    this.http.get<any>(`${this.apiUrl}/exams/${state.examId}`).subscribe(fullExam => {
      this.activeExam = fullExam;
      this.studentExamId = state.studentExamId;
      this.answers = state.answers || {};
      this.examEndTime = state.endTime;
      this.timeRemaining = this.examEndTime ? Math.max(0, Math.floor((this.examEndTime - Date.now()) / 1000)) : 0;
      if (this.timeRemaining <= 0) {
        this.submitExam();
      } else {
        this.startTimer();
      }
    }, () => this.clearExamState());
  }

  private clearExamState() {
    localStorage.removeItem(this.examStateKey);
  }

  private saveExamResult() {
    if (!this.examResult) {
      return;
    }
    localStorage.setItem(this.examResultKey, JSON.stringify(this.examResult));
  }

  private restoreExamResult() {
    if (this.normalizedRole !== 'student') {
      return;
    }
    const stored = localStorage.getItem(this.examResultKey);
    if (!stored) {
      return;
    }
    try {
      const result = JSON.parse(stored);
      this.examResult = { ...result, score: Number(result.score) };
    } catch {
      this.clearExamResult();
    }
  }

  private clearExamResult() {
    localStorage.removeItem(this.examResultKey);
  }

  formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
}
