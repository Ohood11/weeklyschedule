import React, { useState, useEffect } from 'react';
import { Plus, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './TimeTable.css';

const TimeTableScheduler = () => {
  const [teachers, setTeachers] = useState([]);
  const [newTeacher, setNewTeacher] = useState({ 
    name: '', 
    subject: '', 
    classes: [] 
  });
  const [schedule, setSchedule] = useState({});
  const [selectedClass, setSelectedClass] = useState('S1A');

  // Load teachers from localStorage 
  useEffect(() => {
    const savedTeachers = localStorage.getItem('schoolTeachers');
    if (savedTeachers) {
      setTeachers(JSON.parse(savedTeachers));
    }
  }, []);

  // Save teachers to localStorage 
  useEffect(() => {
    localStorage.setItem('schoolTeachers', JSON.stringify(teachers));
  }, [teachers]);

  const timePeriods = [
    { id: 1, time: '7:20 AM - 8:40 AM' },
    { id: 2, time: '8:40 AM - 10:00 AM' },
    { id: 3, time: '10:20 AM - 11:40 AM' },
    { id: 4, time: '11:40 AM - 1:00 PM' },
    { id: 5, time: '2:00 PM - 3:20 PM' },
    { id: 6, time: '3:20 PM - 4:40 PM' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const classes = [
    ...Array.from({ length: 6 }, (_, i) => 
      Array.from({ length: 3 }, (_, j) => `S${i + 1}${String.fromCharCode(65 + j)}`)
    ).flat()
  ];

  const addTeacher = () => {
    if (newTeacher.name && newTeacher.subject) {
      setTeachers([...teachers, { 
        ...newTeacher, 
        periodsAssigned: 0,
        id: teachers.length + 1
      }]);
      setNewTeacher({ name: '', subject: '', classes: [] });
    }
  };

  const removeTeacher = (index) => {
    const updatedTeachers = teachers.filter((_, i) => i !== index);
    setTeachers(updatedTeachers);
  };

  const generateSchedule = () => {
    const newSchedule = {};
    let teacherAssignments = teachers.map(teacher => ({
      ...teacher,
      periodsAssigned: 0,
      dailyAssignments: {} 
    }));

    const totalPeriodsPerWeek = days.length * timePeriods.length * classes.length;
    const targetPeriodsPerTeacher = Math.floor(totalPeriodsPerWeek / teachers.length);
    
    classes.forEach(className => {
      newSchedule[className] = {};
      days.forEach(day => {
        newSchedule[className][day] = {};
        timePeriods.forEach(period => {
          newSchedule[className][day][period.id] = {
            teacher: 'Unassigned',
            subject: '-',
            time: period.time
          };
        });
      });
    });

    const getTeacherLoadScore = (teacher, day, classLevel) => {
      const dailyLoad = teacher.dailyAssignments[day] || 0;
      const totalLoad = teacher.periodsAssigned;
      const classMatch = teacher.classes.includes(classLevel) ? 0 : 1000;
      return dailyLoad + (totalLoad / targetPeriodsPerTeacher) + classMatch;
    };

    classes.forEach(className => {
      const classLevel = className.substring(0, 2);
      
      days.forEach(day => {
        timePeriods.forEach(period => {
          const availableTeachers = teacherAssignments
            .filter(teacher => 
              teacher.classes.includes(classLevel) && 
              teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
              (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4)
            )
            .sort((a, b) => getTeacherLoadScore(a, day, classLevel) - getTeacherLoadScore(b, day, classLevel));

          if (availableTeachers.length > 0) {
            const selectedTeacher = availableTeachers[0];
            const teacherIndex = teacherAssignments.findIndex(t => t.id === selectedTeacher.id);
            
            teacherAssignments[teacherIndex] = {
              ...selectedTeacher,
              periodsAssigned: selectedTeacher.periodsAssigned + 1,
              dailyAssignments: {
                ...selectedTeacher.dailyAssignments,
                [day]: (selectedTeacher.dailyAssignments[day] || 0) + 1
              }
            };
            
            newSchedule[className][day][period.id] = {
              teacher: selectedTeacher.name,
              subject: selectedTeacher.subject,
              time: period.time
            };
          }
        });
      });
    });

    setTeachers(teachers.map(teacher => {
      const updatedTeacher = teacherAssignments.find(t => t.id === teacher.id);
      return {
        ...teacher,
        periodsAssigned: updatedTeacher ? updatedTeacher.periodsAssigned : 0
      };
    }));

    setSchedule(newSchedule);
  };

  const clearTeachers = () => {
    if (window.confirm(' clearing all teachers?')) {
      setTeachers([]);
      localStorage.removeItem('schoolTeachers');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title and metadata
    doc.setProperties({
      title: `${selectedClass} - Weekly Schedule`,
      subject: 'School Timetable',
      creator: 'TimeTable Scheduler'
    });
    
    doc.setFontSize(16);
    doc.text(`Class ${selectedClass} - Weekly Schedule`, 15, 15);
    
    // Setup table data
    const tableData = timePeriods.map(period => {
      return [
        period.time,
        ...days.map(day => {
          const slot = schedule[selectedClass][day][period.id];
          return `${slot.teacher}\n${slot.subject}`;
        })
      ];
    });
    
    // Add headers
    const headers = ['Time/Day', ...days];
    
    // Auto table configuration
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 25,
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineColor: 40,
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      theme: 'grid'
    });
    
    // Save PDF
    doc.save(`${selectedClass}_schedule.pdf`);
  };

  return (
    <div className="timetable-container">
      <div className="management-card">
        <div className="management-header">
          <div className="header-content">
            <h2 className="header-title">Teacher Management (Total: {teachers.length}/60)</h2>
            <button 
              onClick={clearTeachers}
              className="clear-button"
            >
              Clear All Teachers
            </button>
          </div>
        </div>
        <div className="input-container">
          <div className="input-row">
            <input
              type="text"
              placeholder="Teacher Name"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Subject"
              value={newTeacher.subject}
              onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
              className="input-field"
            />
            <select
              multiple
              value={newTeacher.classes}
              onChange={(e) => setNewTeacher({
                ...newTeacher,
                classes: Array.from(e.target.selectedOptions, option => option.value)
              })}
              className="input-field"
            >
              {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            <button 
              onClick={addTeacher}
              className="add-button"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </button>
          </div>

          <div className="teacher-list">
            {teachers.map((teacher, index) => (
              <div key={index} className="teacher-card">
                <div className="teacher-info">
                  <span className="teacher-name">{teacher.name}</span>
                  <span className="teacher-subject">{teacher.subject}</span>
                  <span className="teacher-classes">Classes: {teacher.classes.join(', ')}</span>
                  {teacher.periodsAssigned > 0 && (
                    <span className="teacher-periods">Periods: {teacher.periodsAssigned}</span>
                  )}
                </div>
                <button
                  onClick={() => removeTeacher(index)}
                  className="remove-button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {teachers.length > 0 && (
            <button 
              onClick={generateSchedule}
              className="generate-button"
            >
              Generate Weekly Schedule
            </button>
          )}
        </div>
      </div>

      {Object.keys(schedule).length > 0 && (
        <div className="schedule-card">
          <div className="schedule-header">
            <h2 className="header-title">Weekly Schedule</h2>
            <div className="class-buttons">
              {classes.map(className => (
                <button
                  key={className}
                  onClick={() => setSelectedClass(className)}
                  className={`class-button ${
                    selectedClass === className 
                      ? 'class-button-active' 
                      : 'class-button-inactive'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>
          <div className="schedule-table-container">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th className="table-header">Time/Day</th>
                  {days.map(day => (
                    <th key={day} className="table-header">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timePeriods.map(period => (
                  <tr key={period.id}>
                    <td className="table-cell time-cell">{period.time}</td>
                    {days.map(day => (
                      <td key={day} className="table-cell">
                        {schedule[selectedClass]?.[day]?.[period.id]?.teacher && (
                          <div className="period-info">
                            <span className="teacher-name">
                              {schedule[selectedClass][day][period.id].teacher}
                            </span>
                            <span className="subject-name">
                              {schedule[selectedClass][day][period.id].subject}
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="export-button">
            <button
              onClick={exportToPDF}
              className="button"
            >
              <Download />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTableScheduler;