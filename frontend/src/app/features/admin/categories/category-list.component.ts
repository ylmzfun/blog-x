import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Category } from '../../../core/models';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Categories</h1>
    @if (errorMsg()) { <div class="alert alert-error">{{ errorMsg() }}</div> }
    <div class="card mb-md" style="max-width:500px;">
      <h3 style="font-size:1.05rem;margin-bottom:0.75rem;">Add Category</h3>
      <div class="form-group"><label>Name</label><input class="form-input" type="text" [(ngModel)]="newName" placeholder="Category name" /></div>
      <div class="form-group"><label>Slug</label><input class="form-input" type="text" [(ngModel)]="newSlug" placeholder="category-slug" /></div>
      <div class="form-group"><label>Description</label><input class="form-input" type="text" [(ngModel)]="newDesc" placeholder="Optional description" /></div>
      <button class="btn btn-primary btn-sm" (click)="addCategory()" [disabled]="!newName||!newSlug">Add</button>
    </div>
    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else {
      <div class="card" style="padding:0;">
        <table class="table">
          <thead><tr><th>Name</th><th>Slug</th><th>Posts</th><th>Actions</th></tr></thead>
          <tbody>
            @for (cat of categories(); track cat.id) {
              <tr><td>{{ cat.name }}</td><td><code>{{ cat.slug }}</code></td><td>{{ cat.postCount }}</td><td><button class="btn btn-sm btn-danger" (click)="deleteCat(cat.id)">Delete</button></td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CategoryListComponent implements OnInit {
  private api = inject(ApiService);
  categories = signal<Category[]>([]); loading = signal(true); errorMsg = signal('');
  newName = ''; newSlug = ''; newDesc = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getCategories().subscribe({ next: (res) => { if (res.code === 0 && res.data) this.categories.set(res.data); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  addCategory() {
    this.errorMsg.set('');
    this.api.createCategory({ name: this.newName, slug: this.newSlug, description: this.newDesc || undefined }).subscribe({
      next: (res) => { if (res.code === 0) { this.newName = ''; this.newSlug = ''; this.newDesc = ''; this.load(); } else this.errorMsg.set(res.message); },
      error: () => this.errorMsg.set('Failed to create category'),
    });
  }

  deleteCat(id: number) { if (confirm('Delete this category?')) { this.api.deleteCategory(id).subscribe(() => this.load()); } }
}
