// src/__tests__/TimeTableScheduler.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeTableScheduler from '../App';

test('adds a new teacher', () => {
  render(<TimeTableScheduler />);

  const nameInput = screen.getByPlaceholderText('Teacher Name');
  const subjectSelect = screen.getByText('Select Subject');
  const addTeacherButton = screen.getByText('Add Teacher');

  fireEvent.change(nameInput, { target: { value: 'John Doe' } });
  fireEvent.change(subjectSelect, { target: { value: 'Mathematics' } });
  fireEvent.click(addTeacherButton);

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('Mathematics')).toBeInTheDocument();
});

test('generates a schedule', () => {
  render(<TimeTableScheduler />);

  const generateButton = screen.getByText('Generate Weekly Schedule');

  fireEvent.click(generateButton);

  expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
});

test('exports a PDF', () => {
  render(<TimeTableScheduler />);

  const exportButton = screen.getByText('Download PDF');

  fireEvent.click(exportButton);

  // Mukulu Nkooye😂😂😂
});
