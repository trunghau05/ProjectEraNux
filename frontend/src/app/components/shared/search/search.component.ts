import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search',
  imports: [FormsModule, MatIconModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class Search {
  @Input() placeholder: string = '';
  @Output() searchChange = new EventEmitter<string>();

  searchValue = '';

  onSearch() {
    this.searchChange.emit(this.searchValue.trim());
  }

  onSearchValueChange(value: string) {
    this.searchValue = value;
    this.searchChange.emit(this.searchValue.trim());
  }

  clearSearch() {
    this.searchValue = '';
    this.searchChange.emit('');
  }
}
