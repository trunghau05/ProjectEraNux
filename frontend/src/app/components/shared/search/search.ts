import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search',
  imports: [FormsModule, MatIconModule],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  @Input() placeholder: string = '';
  searchValue = '';

  onSearch() {
    // Implement search logic here
    console.log('Searching for:', this.searchValue);
  }

  clearSearch() {
    this.searchValue = '';
  }
}
